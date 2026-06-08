import cv2
import numpy as np
import sys
import json
from core.tryon_pipeline import extract_body_scaling

def test_pipeline():
    # Create a dummy image (black image) if no image path provided
    img_path = sys.argv[1] if len(sys.argv) > 1 else None
    
    if img_path:
        print(f"Testing with image: {img_path}")
        img = cv2.imread(img_path)
    else:
        print("No image provided. Testing with a dummy blank image (should return default 1.0 scales).")
        img = np.zeros((512, 512, 3), dtype=np.uint8)
        
    if img is None:
        print("Failed to load image.")
        sys.exit(1)
        
    scale_matrix = extract_body_scaling(img)
    print("Extracted Scaling Matrix:")
    print(json.dumps(scale_matrix, indent=2))

if __name__ == "__main__":
    test_pipeline()
