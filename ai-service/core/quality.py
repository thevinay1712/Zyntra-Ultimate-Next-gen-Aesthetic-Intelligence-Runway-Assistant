import cv2
import numpy as np

def analyze_upload_quality(img, mask=None) -> tuple:
    """
    Analyzes an OpenCV BGR image and its segmentation mask (optional) to classify quality:
    Returns (quality_status, details_string)
    Where quality_status is 'Good' | 'Medium' | 'Bad'
    """
    if img is None:
        return "Bad", "Invalid image data."

    height, width = img.shape[:2]

    # 1. Resolution check
    if width < 300 or height < 300:
        return "Bad", f"Image resolution is too low ({width}x{height}px). Minimum is 300x300px."

    # 2. Blurriness check (Laplacian variance)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    blur_variance = cv2.Laplacian(gray, cv2.CV_64F).var()
    
    if blur_variance < 70:
        return "Bad", f"Image is too blurry or out of focus (variance: {blur_variance:.1f}). Use better lighting."

    # 3. Cropping check on borders (using segmentation mask if available)
    if mask is not None:
        # Check border pixels touching top, bottom, left, right borders
        top_touch = np.sum(mask[0, :] > 128)
        bottom_touch = np.sum(mask[-1, :] > 128)
        left_touch = np.sum(mask[:, 0] > 128)
        right_touch = np.sum(mask[:, -1] > 128)

        # Express touching pixels as percentage of border length
        borders_cut = 0
        if top_touch > (width * 0.12):
            borders_cut += 1
        if bottom_touch > (width * 0.12):
            borders_cut += 1
        if left_touch > (height * 0.12):
            borders_cut += 1
        if right_touch > (height * 0.12):
            borders_cut += 1

        if borders_cut >= 3:
            return "Bad", "Clothing is severely cropped or cut off by the borders of the image."
        elif borders_cut >= 1:
            return "Medium", "Clothing is partially visible or cropped, but usable. AI will extract what is visible."

    # 4. Success defaults to Good
    detail_msg = "Excellent quality."
    if blur_variance < 150:
        detail_msg = "Decent sharpness, plain background preferred."
        
    return "Good", detail_msg
