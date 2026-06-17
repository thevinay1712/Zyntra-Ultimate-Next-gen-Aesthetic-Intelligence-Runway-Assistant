import cv2
import numpy as np
import os
import urllib.request
import json
import time
import base64
from io import BytesIO
from PIL import Image


def call_replicate_vton(human_bytes, garment_bytes, category, token):
    """
    Optional Cloud AI virtual try-on using Replicate API (yisol/idm-vton).
    Accepts raw bytes and sends them as base64 data URIs.
    """
    human_b64 = f"data:image/png;base64,{base64.b64encode(human_bytes).decode('utf-8')}"
    garment_b64 = f"data:image/png;base64,{base64.b64encode(garment_bytes).decode('utf-8')}"

    headers = {
        "Authorization": f"Token {token}",
        "Content-Type": "application/json"
    }

    payload = {
        "version": "c87181b2c6e6438997d91e6b8c949c81525f05b0a316c27806542fb4890d9841",
        "input": {
            "human_img": human_b64,
            "garm_img": garment_b64,
            "category": category,
            "garment_des": "a high quality fashion garment"
        }
    }

    print("[Replicate] Initializing prediction on Replicate cloud API...")
    try:
        req = urllib.request.Request(
            "https://api.replicate.com/v1/predictions",
            data=json.dumps(payload).encode("utf-8"),
            headers=headers,
            method="POST"
        )
        with urllib.request.urlopen(req) as res:
            pred = json.loads(res.read().decode("utf-8"))
            pred_id = pred["id"]

        status_url = f"https://api.replicate.com/v1/predictions/{pred_id}"
        req_status = urllib.request.Request(status_url, headers=headers)

        print(f"[Replicate] Prediction ID: {pred_id}. Waiting for completion...")
        for i in range(45):
            time.sleep(2.0)
            with urllib.request.urlopen(req_status) as res:
                pred = json.loads(res.read().decode("utf-8"))
                status = pred["status"]
                print(f"[Replicate] Status: {status} ({i+1}/45)")
                if status == "succeeded":
                    output_url = pred["output"]
                    if isinstance(output_url, list):
                        output_url = output_url[0]
                    print(f"[Replicate] Render success! Downloading output...")
                    with urllib.request.urlopen(output_url) as img_res:
                        return img_res.read()
                elif status in ["failed", "canceled"]:
                    print(f"[Replicate] Prediction failed: {pred.get('error')}")
                    break
    except Exception as e:
        print(f"[Replicate] API communication error: {e}")
    return None


# ─────────────────────────────────────────────────────────────────────────────
# BODY ZONE DEFINITIONS (calibrated to 1024x1024 default model templates)
# These are measured directly from the model images.
# ─────────────────────────────────────────────────────────────────────────────
BODY_ZONES = {
    "male": {
        "tshirt": {
            # Region on the model body where the shirt lives
            # Top of collar to bottom hem of shirt
            "body_top":   195,   # Y pixel where collar/neckline starts
            "body_bottom": 450,  # Y pixel where shirt hem ends
            "body_left":  355,   # X pixel left edge of shoulder
            "body_right": 675,   # X pixel right edge of shoulder
            # Erase zone – clear the original shirt from the model
            "erase_y1": 185, "erase_y2": 460,
            "erase_x1": 300, "erase_x2": 730,
        },
        "jeans": {
            "body_top":   450,   # Y where waistband starts
            "body_bottom": 940,  # Y where shoes/ankles start
            "body_left":  360,
            "body_right": 660,
            "erase_y1": 445, "erase_y2": 955,
            "erase_x1": 310, "erase_x2": 720,
        },
    },
    "female": {
        "tshirt": {
            "body_top":   175,
            "body_bottom": 490,
            "body_left":  365,
            "body_right": 655,
            "erase_y1": 165, "erase_y2": 500,
            "erase_x1": 310, "erase_x2": 715,
        },
        "jeans": {
            "body_top":   485,
            "body_bottom": 960,
            "body_left":  365,
            "body_right": 655,
            "erase_y1": 480, "erase_y2": 970,
            "erase_x1": 310, "erase_x2": 720,
        },
    },
}


def _erase_original_garment(model_bgr, zone, bg_sample_x_left=180, bg_sample_x_right=850):
    """
    Erase the original template clothing from the model image by
    flood-filling the detected clothing region with sampled background color.
    Uses inpainting for a seamless result.
    """
    y1, y2 = zone["erase_y1"], zone["erase_y2"]
    x1, x2 = zone["erase_x1"], zone["erase_x2"]
    h_m, w_m = model_bgr.shape[:2]

    # Clamp to image bounds
    y1, y2 = max(0, y1), min(h_m, y2)
    x1, x2 = max(0, x1), min(w_m, x2)

    # Build a mask of the clothing region to erase
    # Strategy: detect pixels that differ significantly from the background
    # The background is near-white/grey; clothing is a different tone.
    # We use a simple approach: sample background color outside the body,
    # then mark pixels in the erase zone that are NOT background as "clothing".
    
    output = model_bgr.copy()
    roi = output[y1:y2, x1:x2].copy()
    roi_h, roi_w = roi.shape[:2]

    # Create an inpainting mask – mark all pixels that appear to be clothing
    # (i.e., non-background pixels in the torso region)
    # We do this by sampling a few background strips left/right and detecting outliers
    mask = np.zeros((roi_h, roi_w), dtype=np.uint8)

    # Sample background from far left and far right of EACH row
    lx = max(0, bg_sample_x_left)
    rx = min(w_m - 1, bg_sample_x_right)

    for dy in range(roi_h):
        gy = y1 + dy
        if gy >= h_m:
            break
        bg_left_px  = model_bgr[gy, lx].astype(float)
        bg_right_px = model_bgr[gy, rx].astype(float)
        bg_px = (bg_left_px + bg_right_px) / 2.0

        row = roi[dy].astype(float)
        diff = np.abs(row - bg_px).mean(axis=1)  # per-pixel mean channel diff
        # Mark pixels significantly different from background as clothing
        mask[dy] = (diff > 18).astype(np.uint8) * 255

    # Morphological cleanup – close small gaps, remove noise
    kernel_close = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
    kernel_open  = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel_close)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN,  kernel_open)

    # Use OpenCV inpainting to reconstruct the background under the clothing
    # INPAINT_TELEA gives very clean results for uniform backgrounds
    roi_inpainted = cv2.inpaint(roi, mask, inpaintRadius=12, flags=cv2.INPAINT_TELEA)
    output[y1:y2, x1:x2] = roi_inpainted

    return output


def _fit_garment_to_zone(garment_bgra, zone, model_shape):
    """
    Scale and position the garment image so it exactly covers the target body zone.
    
    Approach:
    1. Crop to garment bounding box (remove transparent padding).
    2. Scale the garment so its width matches the body zone width exactly.
       Then verify height fits; if garment is too tall we scale by height instead.
    3. Center-align horizontally over the body zone.
    4. Align the TOP of the garment to the TOP of the body zone.
    
    Returns: (garment_rgb_u8, alpha_f32, paste_x, paste_y)
    """
    h_m, w_m = model_shape[:2]
    zone_top    = zone["body_top"]
    zone_bottom = zone["body_bottom"]
    zone_left   = zone["body_left"]
    zone_right  = zone["body_right"]

    zone_w = zone_right - zone_left    # target width on model canvas
    zone_h = zone_bottom - zone_top    # target height on model canvas
    zone_cx = (zone_left + zone_right) // 2  # center X of zone

    # Scale zone parameters if model is not 1024×1024
    if h_m != 1024 or w_m != 1024:
        sx = w_m / 1024.0
        sy = h_m / 1024.0
        zone_top    = int(zone_top    * sy)
        zone_bottom = int(zone_bottom * sy)
        zone_left   = int(zone_left   * sx)
        zone_right  = int(zone_right  * sx)
        zone_w = zone_right - zone_left
        zone_h = zone_bottom - zone_top
        zone_cx = (zone_left + zone_right) // 2

    # ── 1. Crop transparent padding ──
    alpha_ch = garment_bgra[:, :, 3]
    coords = cv2.findNonZero(alpha_ch)
    if coords is None:
        print("[VTON] Garment is fully transparent – nothing to overlay.")
        return None, None, 0, 0

    gx, gy, gw, gh = cv2.boundingRect(coords)
    garment_crop = garment_bgra[gy:gy+gh, gx:gx+gw].copy()

    # ── 2. Scale to fit zone ──
    # Primary: scale by width
    scale_w = zone_w / float(gw)
    new_w = zone_w
    new_h = int(gh * scale_w)

    # If scaled height exceeds zone height, scale by height instead
    if new_h > zone_h:
        scale_h = zone_h / float(gh)
        new_h = zone_h
        new_w = int(gw * scale_h)

    new_w = max(1, new_w)
    new_h = max(1, new_h)

    garment_scaled = cv2.resize(garment_crop, (new_w, new_h), interpolation=cv2.INTER_LANCZOS4)

    # ── 3. Calculate paste coordinates ──
    # Horizontal: center the garment over zone center X
    paste_x = zone_cx - new_w // 2
    # Vertical: align top of garment to top of zone
    paste_y = zone_top

    g_rgb   = garment_scaled[:, :, :3]
    g_alpha = garment_scaled[:, :, 3].astype(np.float32) / 255.0

    return g_rgb, g_alpha, paste_x, paste_y


def _smooth_alpha_edges(alpha_f32, blur_radius=3):
    """Apply a small Gaussian blur to the alpha channel for anti-aliased edges."""
    return cv2.GaussianBlur(alpha_f32, (blur_radius * 2 + 1, blur_radius * 2 + 1), 0)


def _restore_arms_and_accessories(model_bgr, composite_bgr, gender):
    """
    Segment the arms and accessories (like watches) from the original model template
    and composite them back on top of the newly draped garment. This ensures that
    the hands and forearms are layered IN FRONT of the overlayed garment.
    """
    # 1. Detect skin color in the original model image
    hsv_orig = cv2.cvtColor(model_bgr, cv2.COLOR_BGR2HSV)
    lower_skin = np.array([0, 15, 60], dtype=np.uint8)
    upper_skin = np.array([25, 180, 255], dtype=np.uint8)
    skin_mask = cv2.inRange(hsv_orig, lower_skin, upper_skin)
    
    # 2. Define spatial masks covering the regions where the model's arms hang
    arm_zone = np.zeros_like(skin_mask)
    if gender == 'male':
        # Left arm zone: Y=350-650, X=340-410
        arm_zone[350:650, 340:410] = 255
        # Right arm zone: Y=350-650, X=615-685
        arm_zone[350:650, 615:685] = 255
    else:
        # Left arm zone: Y=380-660, X=340-410
        arm_zone[380:660, 340:410] = 255
        # Right arm zone: Y=380-660, X=615-685
        arm_zone[380:660, 615:685] = 255
        
    final_arm_mask = cv2.bitwise_and(skin_mask, arm_zone)
    
    # 3. Preserve accessories (specifically, the watch on the male model's wrist)
    if gender == 'male':
        # Bounding box of the watch on the male model template
        final_arm_mask[480:520, 610:640] = 255
        
    # 4. Clean up and smooth the mask
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    final_arm_mask = cv2.morphologyEx(final_arm_mask, cv2.MORPH_CLOSE, kernel)
    final_arm_mask = cv2.dilate(final_arm_mask, kernel, iterations=1)
    
    # 5. Prevent white halos around the arms by zeroing out the white background pixels
    is_background = (model_bgr[:, :, 0] >= 248) & (model_bgr[:, :, 1] >= 248) & (model_bgr[:, :, 2] >= 248)
    final_arm_mask[is_background] = 0
    
    # 6. Apply soft edge blending using Gaussian blur
    mask_blur = cv2.GaussianBlur(final_arm_mask, (3, 3), 0)
    mask_norm = mask_blur.astype(np.float32) / 255.0
    mask_norm = np.expand_dims(mask_norm, axis=2)
    
    # 7. Blend original arm/hand pixels back on top of the composite image
    orig_f = model_bgr.astype(np.float32)
    comp_f = composite_bgr.astype(np.float32)
    
    blended = orig_f * mask_norm + comp_f * (1.0 - mask_norm)
    output_img = np.clip(blended, 0, 255).astype(np.uint8)
    
    return output_img


def run_local_vton(model_bgr, garment_bgra, garment_type, gender="male", is_default=True):
    """
    Local 2D VTON composition pipeline.

    Steps:
    1. Erase original template clothing (only for default models – known body positions).
    2. Scale & position the uploaded garment onto the exact body zone.
    3. Composite with smooth alpha blending (no color distortion).
    
    No shading-map color multiplication – we preserve the garment's true colors.
    """
    h_m, w_m = model_bgr.shape[:2]
    gender_key = gender if gender in BODY_ZONES else "male"
    type_key   = garment_type if garment_type in BODY_ZONES[gender_key] else "tshirt"
    zone = BODY_ZONES[gender_key][type_key]

    # ── Step 1: Erase original clothing from default template ──
    if is_default:
        print(f"[VTON-Local] Erasing original {type_key} from {gender_key} model...")
        output_img = _erase_original_garment(model_bgr, zone)
    else:
        output_img = model_bgr.copy()

    # ── Step 2: Fit garment to body zone ──
    print(f"[VTON-Local] Fitting garment to {gender_key} {type_key} zone...")
    g_rgb, g_alpha, paste_x, paste_y = _fit_garment_to_zone(garment_bgra, zone, model_bgr.shape)

    if g_rgb is None:
        print("[VTON-Local] Could not fit garment – returning erased model.")
        return output_img

    # ── Step 3: Smooth alpha edges for anti-aliasing ──
    g_alpha = _smooth_alpha_edges(g_alpha, blur_radius=2)

    # ── Step 4: Composite onto model (clamp to canvas bounds) ──
    new_h, new_w = g_rgb.shape[:2]
    x1 = max(0, paste_x)
    y1 = max(0, paste_y)
    x2 = min(w_m, paste_x + new_w)
    y2 = min(h_m, paste_y + new_h)

    # Corresponding crop in garment arrays
    gx1 = x1 - paste_x
    gy1 = y1 - paste_y
    gx2 = x2 - paste_x
    gy2 = y2 - paste_y

    if x2 <= x1 or y2 <= y1 or gx2 <= gx1 or gy2 <= gy1:
        print("[VTON-Local] Garment out of canvas bounds – skipping overlay.")
        return output_img

    g_rgb_slice   = g_rgb[gy1:gy2, gx1:gx2].astype(np.float32)
    g_alpha_slice = g_alpha[gy1:gy2, gx1:gx2][:, :, np.newaxis]
    model_roi     = output_img[y1:y2, x1:x2].astype(np.float32)

    # Standard alpha composite: out = garment * alpha + background * (1 - alpha)
    composite = g_rgb_slice * g_alpha_slice + model_roi * (1.0 - g_alpha_slice)
    output_img[y1:y2, x1:x2] = np.clip(composite, 0, 255).astype(np.uint8)

    # ── Step 5: Restore model's arms/hands to appear in front of the garment ──
    if is_default:
        print("[VTON-Local] Restoring arms and accessories in front of garment...")
        output_img = _restore_arms_and_accessories(model_bgr, output_img, gender_key)

    print(f"[VTON-Local] Garment composited at ({paste_x},{paste_y}), size ({new_w}x{new_h}).")
    return output_img
