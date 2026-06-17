import cv2
import numpy as np
import os

def test_erasure():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(base_dir, "models", "male_model.png")
    if not os.path.exists(model_path):
        print("Model path not found:", model_path)
        return
        
    img = cv2.imread(model_path)
    h, w, _ = img.shape
    
    # We want to erase the pants (trousers) in the region: Y from 430 to 910, X from 300 to 700
    # Let's inspect pixel colors in this region.
    # The gray pants have RGB channels that are very close to each other (low saturation)
    # and are not white (e.g., luminance < 240)
    
    output = img.copy()
    
    # 1. Erase pants (trousers)
    # Target region: Y from 430 to 910, X from 320 to 680
    pants_y_start, pants_y_end = 430, 910
    pants_x_start, pants_x_end = 320, 680
    roi = img[pants_y_start:pants_y_end, pants_x_start:pants_x_end]
    
    # Calculate absolute difference between Red and Blue channels
    r_channel = roi[:, :, 2].astype(float)
    g_channel = roi[:, :, 1].astype(float)
    b_channel = roi[:, :, 0].astype(float)
    
    # Gray clothes have very low difference between R and B
    diff_rb = np.abs(r_channel - b_channel)
    diff_rg = np.abs(r_channel - g_channel)
    
    # Clothes mask: low color variation (diff < 15) and not background (R < 248) and not too dark (R > 35)
    gray_mask = (diff_rb < 15) & (diff_rg < 15) & (r_channel < 248) & (r_channel > 35)
    
    # Apply morphological close to fill internal holes
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    gray_mask = cv2.morphologyEx(gray_mask.astype(np.uint8) * 255, cv2.MORPH_CLOSE, kernel)
    
    # 2. Erase shirt
    # Target region: Y from 180 to 445, X from 320 to 680
    shirt_y_start, shirt_y_end = 180, 445
    shirt_x_start, shirt_x_end = 320, 680
    roi_shirt = img[shirt_y_start:shirt_y_end, shirt_x_start:shirt_x_end]
    
    r_s = roi_shirt[:, :, 2].astype(float)
    g_s = roi_shirt[:, :, 1].astype(float)
    b_s = roi_shirt[:, :, 0].astype(float)
    
    diff_rb_s = np.abs(r_s - b_s)
    diff_rg_s = np.abs(r_s - g_s)
    
    shirt_gray_mask = (diff_rb_s < 15) & (diff_rg_s < 15) & (r_s < 248) & (r_s > 35)
    shirt_gray_mask = cv2.morphologyEx(shirt_gray_mask.astype(np.uint8) * 255, cv2.MORPH_CLOSE, kernel)
    
    # Erase pants in output
    roi_output = output[pants_y_start:pants_y_end, pants_x_start:pants_x_end]
    for y_offset in range(roi_output.shape[0]):
        y_global = pants_y_start + y_offset
        bg_left = img[y_global, 200]
        bg_right = img[y_global, 824]
        
        row_mask = gray_mask[y_offset]
        for x_offset in range(roi_output.shape[1]):
            if row_mask[x_offset] > 0:
                x_global = pants_x_start + x_offset
                if x_global < 512:
                    roi_output[y_offset, x_offset] = bg_left
                else:
                    roi_output[y_offset, x_offset] = bg_right
    
    # Erase shirt in output
    roi_shirt_output = output[shirt_y_start:shirt_y_end, shirt_x_start:shirt_x_end]
    for y_offset in range(roi_shirt_output.shape[0]):
        y_global = shirt_y_start + y_offset
        bg_left = img[y_global, 200]
        bg_right = img[y_global, 824]
        
        row_mask = shirt_gray_mask[y_offset]
        for x_offset in range(roi_shirt_output.shape[1]):
            if row_mask[x_offset] > 0:
                x_global = shirt_x_start + x_offset
                if x_global < 512:
                    roi_shirt_output[y_offset, x_offset] = bg_left
                else:
                    roi_shirt_output[y_offset, x_offset] = bg_right
    
    # Save the erased output image for visual validation
    save_path = os.path.join(base_dir, "models", "male_model_erased_test.png")
    cv2.imwrite(save_path, output)
    print("Erased test image saved to:", save_path)

if __name__ == "__main__":
    test_erasure()
