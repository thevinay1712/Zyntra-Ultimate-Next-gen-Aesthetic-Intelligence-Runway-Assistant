from rembg import remove
import io
from PIL import Image
import numpy as np
import cv2

def segment_garment(image_bytes: bytes) -> tuple:
    """
    Uses rembg to remove the background and isolate the garment,
    then crops the transparent margins and adds uniform padding for consistent sizing.
    Returns:
        segmented_png_bytes: bytes (deserialized PNG with transparent alpha)
        cv2_img_bgra: np.ndarray (OpenCV BGRA image of isolated garment)
        alpha_mask: np.ndarray (single channel grayscale mask, 0 for background, 255 for garment)
    """
    # 1. Strip background
    segmented_bytes = remove(image_bytes)
    
    # 2. Parse using PIL and crop transparent margins
    pil_img = Image.open(io.BytesIO(segmented_bytes)).convert("RGBA")
    bbox = pil_img.getbbox()
    if bbox:
        # Crop to bounding box of the garment
        cropped = pil_img.crop(bbox)
        
        # Add a clean 12% padding around the max dimension for premium consistent card padding
        max_dim = max(cropped.width, cropped.height)
        padding = int(max_dim * 0.12)
        if padding < 5:
            padding = 5
            
        new_width = cropped.width + 2 * padding
        new_height = cropped.height + 2 * padding
        padded_img = Image.new("RGBA", (new_width, new_height), (0, 0, 0, 0))
        padded_img.paste(cropped, (padding, padding))
        pil_img = padded_img
        
        # Save back to segmented_bytes
        out_io = io.BytesIO()
        pil_img.save(out_io, format="PNG")
        segmented_bytes = out_io.getvalue()
    
    # 3. Convert to OpenCV
    cv2_img_bgra = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGBA2BGRA)
    
    # 4. Extract alpha channel mask
    _, _, _, alpha_mask = cv2.split(cv2_img_bgra)
    
    return segmented_bytes, cv2_img_bgra, alpha_mask

