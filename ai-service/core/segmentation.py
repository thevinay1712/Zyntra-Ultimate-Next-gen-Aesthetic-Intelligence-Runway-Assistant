from rembg import remove
import io
from PIL import Image
import numpy as np
import cv2

def segment_garment(image_bytes: bytes) -> tuple:
    """
    Uses rembg to remove the background and isolate the garment.
    Returns:
        segmented_png_bytes: bytes (deserialized PNG with transparent alpha)
        cv2_img_bgra: np.ndarray (OpenCV BGRA image of isolated garment)
        alpha_mask: np.ndarray (single channel grayscale mask, 0 for background, 255 for garment)
    """
    # 1. Strip background
    segmented_bytes = remove(image_bytes)
    
    # 2. Parse using PIL
    pil_img = Image.open(io.BytesIO(segmented_bytes)).convert("RGBA")
    
    # 3. Convert to OpenCV
    cv2_img_bgra = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGBA2BGRA)
    
    # 4. Extract alpha channel mask
    _, _, _, alpha_mask = cv2.split(cv2_img_bgra)
    
    return segmented_bytes, cv2_img_bgra, alpha_mask
