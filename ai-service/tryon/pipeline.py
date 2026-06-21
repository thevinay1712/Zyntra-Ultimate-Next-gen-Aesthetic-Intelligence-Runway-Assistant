"""
Zyntra Virtual Try-On — Core Generation Pipeline
=================================================
Handles:
  - Garment image preparation (flatten to white bg, pad to 768×1024)
  - Single-pass (dress OR top-only OR bottom-only) generation
  - Two-pass chaining (top → intermediate → bottom)
  - Accessory overlay post-processing
  - Avatar arm/hand restoration (preserve arms over pants)

Backends: Hugging Face IDM-VTON Space (primary) → local OpenCV (fallback)
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

from VirtualTryOn.vton_processor import run_local_vton
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

def call_huggingface_vton(model_bytes: bytes, garment_flat_bytes: bytes, category: str) -> bytes | None:
    """
    Call public Hugging Face Space yisol/IDM-VTON using Gradio Client.
    """
    import tempfile
    try:
        from gradio_client import Client, handle_file
    except ImportError:
        print("[Hugging Face VTON] gradio_client is not installed.")
        return None

    # Bypass yisol/IDM-VTON Space for lower_body and dresses since they only support upper_body try-on
    if category in ["lower_body", "dresses"]:
        print(f"[Hugging Face VTON] Space yisol/IDM-VTON does not support {category}. Skipping and falling back...")
        return None

    cat_map = {
        "upper_body": "tops",
        "lower_body": "bottoms",
        "dresses": "dresses"
    }
    hf_category = cat_map.get(category, "tops")
    
    print(f"[Hugging Face VTON] Submitting try-on request for {hf_category} to yisol/IDM-VTON Space...")
    
    h_file_path = None
    g_file_path = None
    try:
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as h_file:
            h_file.write(model_bytes)
            h_file_path = h_file.name

        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as g_file:
            g_file.write(garment_flat_bytes)
            g_file_path = g_file.name

        hf_token = os.environ.get("HF_API_TOKEN") or os.environ.get("HF_TOKEN")
        if hf_token and hf_token.startswith("your_"):
            hf_token = None

        client = Client("yisol/IDM-VTON", token=hf_token)
        
        result = client.predict(
            dict={
                "background": handle_file(h_file_path),
                "layers": [],
                "composite": None
            },
            garm_img=handle_file(g_file_path),
            garment_des="a high quality fashion garment",
            is_checked=True,
            is_checked_crop=False,
            denoise_steps=30,
            seed=42,
            api_name="/tryon"
        )
        
        output_img_path = result[0]
        with open(output_img_path, "rb") as f:
            out_bytes = f.read()
            
        print("[Hugging Face VTON] Virtual try-on rendering complete!")
        return out_bytes
        
    except Exception as e:
        print(f"[Hugging Face VTON] Space API call failed: {e}")
        return None
    finally:
        if h_file_path and os.path.exists(h_file_path):
            try: os.remove(h_file_path)
            except Exception: pass
        if g_file_path and os.path.exists(g_file_path):
            try: os.remove(g_file_path)
            except Exception: pass


def _call_backend(
    model_bytes: bytes,
    garment_flat_bytes: bytes,
    garment_bgra: np.ndarray,
    category: str,
    gender: str = "male",
    is_default: bool = True
) -> bytes | None:
    """
    Dispatch to Hugging Face Space first, falling back to local OpenCV.
    Returns raw PNG bytes of the result, or None on failure.
    """
    # 1. Try public Hugging Face Space first
    result = call_huggingface_vton(model_bytes, garment_flat_bytes, category)
    if result:
        return result

    # 2. Fallback to local OpenCV VTON
    print(f"[TryOn] Falling back to local OpenCV engine ({category})")
    type_map = {
        "upper_body": "tshirt",
        "lower_body": "jeans",
        "dresses":    "jeans",
    }
    garment_type = type_map.get(category, "tshirt")

    nparr = np.frombuffer(model_bytes, np.uint8)
    cv2_model = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if cv2_model is None:
        return None

    output_bgr = run_local_vton(cv2_model, garment_bgra, garment_type, gender=gender, is_default=is_default)
    success, buf = cv2.imencode(".png", output_bgr)
    return buf.tobytes() if success else None


# ─── Accessory Overlay ────────────────────────────────────────────────────────

def _overlay_accessory(
    base_img_bytes: bytes,
    accessory_bytes: bytes,
    avatar_id: str,
    garment_category: str,   # e.g. "shoes", "watches", "accessories"
    item_name: str = "",
    subcategory: str = "",
) -> bytes:
    """
    Composite a background-removed accessory onto the base image at
    a hardcoded anchor position defined in ACCESSORY_ANCHORS.
    Supports smart shoe pairing (double overlays + horizontal mirroring)
    and wristwatch/glasses/hats/belts classification.
    Returns updated PNG bytes (original if overlay fails).
    """
    cat = (garment_category or "").lower().strip()
    sub = (subcategory or "").lower().strip()
    name = (item_name or "").lower().strip()
    
    anchor_type = "accessories"
    if cat == "shoes" or sub in ["shoe", "shoes", "sneakers", "boots", "sandals"] or "shoe" in name or "sneaker" in name or "boot" in name or "sandal" in name:
        anchor_type = "shoes"
    elif sub in ["watch", "watches"] or "watch" in name or "wristwatch" in name:
        anchor_type = "watches"
    elif "glass" in name or "eyewear" in name or "shade" in name or sub in ["glasses", "sunglasses"]:
        anchor_type = "sunglasses"
    elif "hat" in name or "cap" in name or "beanie" in name or sub in ["hat", "hats", "cap"]:
        anchor_type = "hats"
    elif "belt" in name or sub in ["belt"]:
        anchor_type = "belts"

    anchors = ACCESSORY_ANCHORS.get(avatar_id, {})
    anchor  = anchors.get(anchor_type)
    if anchor is None:
        print(f"[TryOn] No anchor defined for {avatar_id}/{anchor_type}, skipping overlay")
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

    # Smart Double Shoes Overlay
    if anchor_type == "shoes":
        # Left foot
        left_x = 452 if "male" in avatar_id else 487
        left_lx = int(left_x * bw / 1024) - new_w // 2
        ly = int(anchor["y"] * bh / 1024) - new_h // 2
        left_lx = max(0, min(bw - new_w, left_lx))
        ly = max(0, min(bh - new_h, ly))
        
        # Paste left shoe
        base_pil.paste(acc_pil, (left_lx, ly), mask=acc_pil.split()[3])

        # Right foot (horizontal flip for correct perspective)
        right_x = 571 if "male" in avatar_id else 613
        right_rx = int(right_x * bw / 1024) - new_w // 2
        right_rx = max(0, min(bw - new_w, right_rx))
        acc_flipped = acc_pil.transpose(Image.FLIP_LEFT_RIGHT)
        
        # Paste right shoe
        base_pil.paste(acc_flipped, (right_rx, ly), mask=acc_flipped.split()[3])
    else:
        # Standard single accessory overlay
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
    custom_model_bytes: bytes = None,
    gender: str = "male"
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
    if avatar_id == "custom":
        if not custom_model_bytes:
            raise RuntimeError("Custom model bytes must be provided for custom avatar")
        base_model_bytes = custom_model_bytes
        avatar = {"gender": gender}
    else:
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

    current_model_bytes = base_model_bytes
    is_custom = (avatar_id == "custom")

    # Pass 1: Inner wear (Tops or Dresses)
    inner_items = [i for i in vton_items if i.get("original_category") == "tops" or is_dress(i["vton_category"])]
    if inner_items:
        item = inner_items[0]
        vton_cat = "dresses" if is_dress(item["vton_category"]) else "upper_body"
        _progress(f"Generating top try-on: {item['name']}…")
        flat_bytes, cv2_bgra = _prepare_garment_image(item["garment_bytes"])
        res_bytes = _call_backend(
            current_model_bytes, flat_bytes, cv2_bgra, vton_cat,
            gender=avatar["gender"], is_default=(not is_custom)
        )
        if res_bytes is None:
            raise RuntimeError(f"Try-on generation failed for top: {item['name']}")
        current_model_bytes = res_bytes

    # Pass 2: Outerwear
    outer_items = [i for i in vton_items if i.get("original_category") == "outerwear"]
    if outer_items:
        item = outer_items[0]
        _progress(f"Generating outerwear try-on: {item['name']}…")
        flat_bytes, cv2_bgra = _prepare_garment_image(item["garment_bytes"])
        res_bytes = _call_backend(
            current_model_bytes, flat_bytes, cv2_bgra, "upper_body",
            gender=avatar["gender"], is_default=(not is_custom)
        )
        if res_bytes is None:
            raise RuntimeError(f"Try-on generation failed for outerwear: {item['name']}")
        current_model_bytes = res_bytes

    # Pass 3: Bottoms
    lower_items = [i for i in vton_items if i["vton_category"] == "lower_body"]
    if lower_items:
        item = lower_items[0]
        _progress(f"Generating bottom try-on: {item['name']}…")
        flat_bytes, cv2_bgra = _prepare_garment_image(item["garment_bytes"])
        res_bytes = _call_backend(
            current_model_bytes, flat_bytes, cv2_bgra, "lower_body",
            gender=avatar["gender"], is_default=(not is_custom)
        )
        if res_bytes is None:
            raise RuntimeError(f"Try-on generation failed for bottom: {item['name']}")
        current_model_bytes = res_bytes

    result_bytes = current_model_bytes
    if not vton_items:
        if is_custom:
            result_bytes = base_model_bytes
        else:
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
                    item_name=acc_item.get("name", ""),
                    subcategory=acc_item.get("subcategory", ""),
                )
            except Exception as e:
                print(f"[TryOn] Accessory overlay skipped ({acc_item['name']}): {e}")

    _progress("Done!")
    return result_bytes
