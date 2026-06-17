"""
Zyntra Virtual Try-On — Core Generation Pipeline
=================================================
Wraps the actual try-on backend (local OpenCV / Replicate cloud IDM-VTON).
Handles:
  - Garment image preparation (flatten to white bg, pad to 768×1024)
  - Single-pass (dress OR top-only OR bottom-only) generation
  - Two-pass chaining (top → intermediate → bottom)
  - Accessory overlay post-processing
  - Avatar arm/hand restoration (preserve arms over pants)

TRYON_BACKEND env var:  "local" (default, CV overlay) | "replicate" (cloud IDM-VTON)
"""

import os
import io
import cv2
import numpy as np
from pathlib import Path
from PIL import Image

import sys
_PARENT = str(Path(__file__).resolve().parent.parent.parent)
if _PARENT not in sys.path:
    sys.path.insert(0, _PARENT)

from VirtualTryOn.vton_processor import run_local_vton, call_replicate_vton
from tryon.avatars import (
    get_avatar_by_id, ACCESSORY_ANCHORS, TRYON_RESULTS_DIR,
    get_avatar_cache_dir
)
from tryon.category_map import is_dress, is_skip_category
from core.segmentation import segment_garment

TARGET_W, TARGET_H = 768, 1024  # IDM-VTON standard input size


# ─── Garment Preparation ──────────────────────────────────────────────────────

def _prepare_garment_image(image_bytes: bytes) -> tuple[bytes, np.ndarray]:
    """
    1. Segment (remove background) via rembg
    2. Flatten onto a white background (IDM-VTON needs opaque garment-on-white)
    3. Pad/resize to TARGET_W × TARGET_H preserving aspect ratio
    Returns (final_png_bytes, cv2_bgra_array)
    """
    # Remove background → RGBA png
    segmented_bytes, cv2_bgra, _ = segment_garment(image_bytes)

    # Flatten to white
    pil_rgba = Image.open(io.BytesIO(segmented_bytes)).convert("RGBA")
    white_bg  = Image.new("RGBA", pil_rgba.size, (255, 255, 255, 255))
    white_bg.paste(pil_rgba, mask=pil_rgba.split()[3])
    pil_rgb = white_bg.convert("RGB")

    # Resize preserving aspect, pad to target
    pil_rgb.thumbnail((TARGET_W, TARGET_H), Image.LANCZOS)
    padded = Image.new("RGB", (TARGET_W, TARGET_H), (255, 255, 255))
    offset_x = (TARGET_W - pil_rgb.width)  // 2
    offset_y = (TARGET_H - pil_rgb.height) // 2
    padded.paste(pil_rgb, (offset_x, offset_y))

    buf = io.BytesIO()
    padded.save(buf, format="PNG")
    flat_bytes = buf.getvalue()

    # Keep original BGRA for arm-restoration step
    return flat_bytes, cv2_bgra


# ─── Backend dispatch ─────────────────────────────────────────────────────────

def _call_backend(
    model_bytes: bytes,
    garment_flat_bytes: bytes,
    garment_bgra: np.ndarray,
    category: str,
    gender: str = "male",
    is_default: bool = True
) -> bytes | None:
    """
    Dispatch to Replicate cloud or local OpenCV engine.
    Returns raw PNG bytes of the result, or None on failure.
    """
    replicate_token = os.environ.get("REPLICATE_API_TOKEN", "").strip()
    if replicate_token:
        print(f"[TryOn] Using Replicate cloud IDM-VTON ({category})")
        result = call_replicate_vton(model_bytes, garment_flat_bytes, category, replicate_token)
        if result:
            return result

    print(f"[TryOn] Falling back to local OpenCV engine ({category})")
    # Map IDM-VTON category → local engine type
    type_map = {
        "upper_body": "tshirt",
        "lower_body": "jeans",
        "dresses":    "jeans",   # best local approximation for full-length
    }
    garment_type = type_map.get(category, "tshirt")

    # Load model as cv2 BGR
    nparr = np.frombuffer(model_bytes, np.uint8)
    cv2_model = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if cv2_model is None:
        return None

    # Use the transparent garment BGRA array directly for local VTON to prevent white background boxes
    output_bgr = run_local_vton(cv2_model, garment_bgra, garment_type, gender=gender, is_default=is_default)
    success, buf = cv2.imencode(".png", output_bgr)
    return buf.tobytes() if success else None


# ─── Accessory Overlay ────────────────────────────────────────────────────────

def _overlay_accessory(
    base_img_bytes: bytes,
    accessory_bytes: bytes,
    avatar_id: str,
    garment_category: str,   # e.g. "shoes", "watches", "accessories"
) -> bytes:
    """
    Composite a background-removed accessory onto the base image at
    a hardcoded anchor position defined in ACCESSORY_ANCHORS.
    Returns updated PNG bytes (original if overlay fails).
    """
    anchors = ACCESSORY_ANCHORS.get(avatar_id, {})
    anchor  = anchors.get(garment_category)
    if anchor is None:
        print(f"[TryOn] No anchor defined for {avatar_id}/{garment_category}, skipping overlay")
        return base_img_bytes

    # Load base image
    base_pil = Image.open(io.BytesIO(base_img_bytes)).convert("RGBA")
    bw, bh = base_pil.size

    # Load accessory (background-removed)
    try:
        acc_seg_bytes, _, _ = segment_garment(accessory_bytes)
        acc_pil = Image.open(io.BytesIO(acc_seg_bytes)).convert("RGBA")
    except Exception as e:
        print(f"[TryOn] Accessory segmentation failed: {e}")
        return base_img_bytes

    # Scale
    scale = anchor.get("scale", 0.15)
    new_w = max(1, int(bw * scale))
    new_h = max(1, int(new_w * acc_pil.height / acc_pil.width))
    acc_pil = acc_pil.resize((new_w, new_h), Image.LANCZOS)

    # Anchor to center
    ax = int(anchor["x"] * bw / 1024) - new_w // 2
    ay = int(anchor["y"] * bh / 1024) - new_h // 2
    ax = max(0, min(bw - new_w, ax))
    ay = max(0, min(bh - new_h, ay))

    base_pil.paste(acc_pil, (ax, ay), mask=acc_pil.split()[3])
    buf = io.BytesIO()
    base_pil.convert("RGB").save(buf, format="PNG")
    return buf.getvalue()


# ─── Core generate_tryon ──────────────────────────────────────────────────────

def generate_tryon(
    avatar_id: str,
    items: list[dict],   # [{ garment_bytes, category, vton_category, name }]
    progress_cb=None,    # callable(str) for status updates
) -> bytes:
    """
    Full try-on generation pipeline:
    1. Separate items into vton_items (upper/lower/dress) and accessory_items (skip)
    2. For vton_items:
       - dress  → single pass
       - top+bottom → two-pass chain
       - top only / bottom only → single pass
    3. Post-processing: overlay accessories
    Returns final PNG bytes.
    Raises RuntimeError on fatal errors.
    """
    avatar = get_avatar_by_id(avatar_id)
    if avatar is None:
        raise RuntimeError(f"Avatar '{avatar_id}' not found")

    image_path = Path(avatar["image_path"])
    if not image_path.exists():
        raise RuntimeError(f"Avatar image not found at {image_path}")

    with open(image_path, "rb") as f:
        base_model_bytes = f.read()

    def _progress(msg: str):
        print(f"[TryOn] {msg}")
        if progress_cb:
            progress_cb(msg)

    # ── Separate VTON vs accessory items ────────────────────────────────────
    vton_items = [i for i in items if not is_skip_category(i["vton_category"])]
    accessory_items = [i for i in items if is_skip_category(i["vton_category"])]

    dress_items  = [i for i in vton_items if is_dress(i["vton_category"])]
    upper_items  = [i for i in vton_items if i["vton_category"] == "upper_body"]
    lower_items  = [i for i in vton_items if i["vton_category"] == "lower_body"]

    current_model_bytes = base_model_bytes
    result_bytes = None

    # ── VTON passes ──────────────────────────────────────────────────────────
    if dress_items:
        item = dress_items[0]
        _progress(f"Generating dress try-on: {item['name']}…")
        flat_bytes, cv2_bgra = _prepare_garment_image(item["garment_bytes"])
        result_bytes  = _call_backend(
            current_model_bytes, flat_bytes, cv2_bgra, "dresses",
            gender=avatar["gender"], is_default=True
        )
        if result_bytes is None:
            raise RuntimeError("Try-on generation failed for dress")

    elif upper_items and lower_items:
        # Pass 1: upper body
        item_top = upper_items[0]
        _progress(f"Generating top try-on: {item_top['name']}…")
        flat_top, cv2_bgra_top = _prepare_garment_image(item_top["garment_bytes"])
        intermediate_bytes = _call_backend(
            current_model_bytes, flat_top, cv2_bgra_top, "upper_body",
            gender=avatar["gender"], is_default=True
        )
        if intermediate_bytes is None:
            raise RuntimeError("Try-on generation failed for top (pass 1)")

        # Pass 2: lower body — use intermediate as new person input
        item_bot = lower_items[0]
        _progress(f"Generating bottom try-on: {item_bot['name']}…")
        flat_bot, cv2_bgra_bot = _prepare_garment_image(item_bot["garment_bytes"])
        result_bytes = _call_backend(
            intermediate_bytes, flat_bot, cv2_bgra_bot, "lower_body",
            gender=avatar["gender"], is_default=True
        )
        if result_bytes is None:
            raise RuntimeError("Try-on generation failed for bottom (pass 2)")

    elif upper_items:
        item = upper_items[0]
        _progress(f"Generating top try-on: {item['name']}…")
        flat_bytes, cv2_bgra = _prepare_garment_image(item["garment_bytes"])
        result_bytes  = _call_backend(
            current_model_bytes, flat_bytes, cv2_bgra, "upper_body",
            gender=avatar["gender"], is_default=True
        )
        if result_bytes is None:
            raise RuntimeError("Try-on generation failed for top")

    elif lower_items:
        item = lower_items[0]
        _progress(f"Generating bottom try-on: {item['name']}…")
        flat_bytes, cv2_bgra = _prepare_garment_image(item["garment_bytes"])
        result_bytes  = _call_backend(
            current_model_bytes, flat_bytes, cv2_bgra, "lower_body",
            gender=avatar["gender"], is_default=True
        )
        if result_bytes is None:
            raise RuntimeError("Try-on generation failed for bottom")

    # If no VTON items at all, start from avatar base image
    if result_bytes is None:
        with open(image_path, "rb") as f:
            pil_base = Image.open(f).copy()
        buf = io.BytesIO()
        pil_base.convert("RGB").save(buf, format="PNG")
        result_bytes = buf.getvalue()

    # ── Accessory overlay ────────────────────────────────────────────────────
    if accessory_items:
        _progress("Applying accessories…")
        for acc_item in accessory_items:
            try:
                result_bytes = _overlay_accessory(
                    result_bytes,
                    acc_item["garment_bytes"],
                    avatar_id,
                    acc_item.get("original_category", "accessories"),
                )
            except Exception as e:
                print(f"[TryOn] Accessory overlay skipped ({acc_item['name']}): {e}")

    _progress("Done!")
    return result_bytes
