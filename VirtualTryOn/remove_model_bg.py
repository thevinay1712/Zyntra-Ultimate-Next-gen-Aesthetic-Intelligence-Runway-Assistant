import os
from rembg import remove
from PIL import Image

models_dir = r"a:\Zyntra\VirtualTryOn\models"
for name in ["male_model.png", "female_model.png"]:
    p = os.path.join(models_dir, name)
    if os.path.exists(p):
        print(f"Removing background from {name}...")
        with open(p, "rb") as f:
            img_bytes = f.read()
        out_bytes = remove(img_bytes)
        
        # Open the result and trim transparent edges if necessary, but preserving original canvas size is better for coordinate calibration!
        # So we just write the output directly.
        with open(p, "wb") as f:
            f.write(out_bytes)
        print(f"Saved transparent background for {name}!")
