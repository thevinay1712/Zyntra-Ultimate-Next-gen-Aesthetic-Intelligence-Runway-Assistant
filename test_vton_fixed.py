"""
Quick test: applies a garment image onto the male model using the new VTON processor.
Run: python test_vton_fixed.py <garment_image_path>
If no garment image is provided, creates a simple colored rectangle as test garment.
"""
import sys
import os
import cv2
import numpy as np

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from VirtualTryOn.vton_processor import run_local_vton

MODEL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "VirtualTryOn", "models")

def make_dummy_garment_bgra(color_bgr=(30, 80, 200), width=400, height=300):
    """Create a simple solid-color rectangle as a test garment with transparent padding."""
    img = np.zeros((height + 80, width + 80, 4), dtype=np.uint8)
    # Draw the garment body
    img[40:40+height, 40:40+width, :3] = color_bgr
    img[40:40+height, 40:40+width, 3] = 255  # fully opaque
    return img

if __name__ == "__main__":
    garment_path = sys.argv[1] if len(sys.argv) > 1 else None
    garment_type = sys.argv[2] if len(sys.argv) > 2 else "tshirt"
    gender       = sys.argv[3] if len(sys.argv) > 3 else "male"

    # Load model
    model_path = os.path.join(MODEL_DIR, f"{gender}_model.png")
    if not os.path.exists(model_path):
        print(f"ERROR: Model not found at {model_path}")
        sys.exit(1)
    model_bgr = cv2.imread(model_path)
    print(f"Loaded model: {model_path} – shape {model_bgr.shape}")

    # Load or create garment
    if garment_path and os.path.exists(garment_path):
        garment_bgra = cv2.imread(garment_path, cv2.IMREAD_UNCHANGED)
        if garment_bgra is None:
            print(f"ERROR: Could not load garment from {garment_path}")
            sys.exit(1)
        if garment_bgra.shape[2] == 3:
            # No alpha channel – add one (fully opaque)
            alpha = np.ones(garment_bgra.shape[:2], dtype=np.uint8) * 255
            garment_bgra = np.dstack([garment_bgra, alpha])
        print(f"Loaded garment: {garment_path} – shape {garment_bgra.shape}")
    else:
        print("No garment path provided – using dummy blue rectangle as test garment.")
        garment_bgra = make_dummy_garment_bgra(color_bgr=(30, 80, 200))

    # Run VTON
    result = run_local_vton(model_bgr, garment_bgra, garment_type, gender, is_default=True)

    # Save output
    out_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "VirtualTryOn", "test_default_render.png")
    cv2.imwrite(out_path, result)
    print(f"\n✅ Result saved to: {out_path}")
    print("Open that file to verify the garment is correctly positioned.")
