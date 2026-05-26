import cv2
import numpy as np
import colorsys

def _rgb_to_hex(r, g, b):
    return '#{:02x}{:02x}{:02x}'.format(int(r), int(g), int(b))

def extract_color_palette(img_bgr, mask) -> tuple:
    """
    Runs K-means clustering on the garment area to extract primary & secondary colors.
    Returns: (hex_palette_list, primary_hex_string)
    """
    img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    
    # Gather pixels inside the garment mask (alpha > 10)
    garment_pixels = img_rgb[mask > 10].astype(np.float32)
    if len(garment_pixels) == 0:
        return ['#888888', '#bbbbbb', '#dddddd'], '#888888'

    # Downsample for quick K-means execution
    if len(garment_pixels) > 3000:
        idx = np.random.choice(len(garment_pixels), 3000, replace=False)
        garment_pixels = garment_pixels[idx]

    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 10, 1.0)
    flags = cv2.KMEANS_RANDOM_CENTERS
    
    num_clusters = min(3, len(garment_pixels))
    _, labels, centers = cv2.kmeans(garment_pixels, num_clusters, None, criteria, 5, flags)

    # Sort colors by frequency
    unique_labels, counts = np.unique(labels, return_counts=True)
    sorted_indices = np.argsort(-counts)
    sorted_centers = centers[sorted_indices]

    hex_palette = [_rgb_to_hex(c[0], c[1], c[2]) for c in sorted_centers]
    primary_color = hex_palette[0]
    
    # Pad palette if less than 3 clusters
    while len(hex_palette) < 3:
        hex_palette.append('#bbbbbb')
        
    return hex_palette, primary_color

def classify_garment_pattern(img_bgr, mask) -> str:
    """
    Analyzes high-frequency edges inside the garment to classify: Solid | Striped | Graphic | Patterned
    """
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    
    # Erode the mask to completely ignore the outer contour edge of the clothing outline
    kernel = np.ones((5, 5), np.uint8)
    eroded_mask = cv2.erode(mask, kernel, iterations=2)
    
    garment_pixels_count = np.sum(eroded_mask > 0)
    if garment_pixels_count < 100:
        return "Solid"

    # Detect internal edges using Canny
    edges = cv2.Canny(gray, 50, 150)
    internal_edges = cv2.bitwise_and(edges, eroded_mask)
    
    edge_pixels_count = np.sum(internal_edges > 0)
    edge_density = edge_pixels_count / garment_pixels_count

    # Heuristic classifications based on edge densities
    if edge_density < 0.005:
        return "Solid"
    elif edge_density < 0.025:
        # Check if edges have horizontal or vertical alignment (stripes)
        # Calculate horizontal and vertical gradients
        sobel_x = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
        sobel_y = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
        
        # Filter gradients to garment area
        x_grad_val = np.sum(np.abs(sobel_x)[eroded_mask > 0])
        y_grad_val = np.sum(np.abs(sobel_y)[eroded_mask > 0])
        
        # If one gradient is much stronger than another, lines are uniform (striped)
        grad_ratio = max(x_grad_val, 1) / max(y_grad_val, 1)
        if grad_ratio > 2.5 or grad_ratio < 0.4:
            return "Striped"
            
        return "Solid"
    elif edge_density < 0.06:
        return "Graphic"
    else:
        return "Patterned"

def determine_aesthetic(category, primary_color_hex, pattern) -> tuple:
    """
    Rule-based fashion heuristic matching dominant color, pattern, and category to:
    aesthetic: 'Streetwear' | 'Casual' | 'Formal' | 'Minimal' | 'Activewear'
    fit: 'Loose' | 'Slim' | 'Oversized' | 'Regular'
    """
    # Parse primary color to RGB and HSV for style cues
    r = int(primary_color_hex[1:3], 16)
    g = int(primary_color_hex[3:5], 16)
    b = int(primary_color_hex[5:7], 16)
    h, s, v = colorsys.rgb_to_hsv(r/255, g/255, b/255)
    
    # Aesthetic & Fit Defaults
    aesthetic = "Casual"
    fit = "Regular"
    
    category_lower = (category or "").lower()

    # 1. Activewear/Sport
    if "sport" in category_lower or "shoes" in category_lower and s > 0.6:
        aesthetic = "Activewear"
        fit = "Regular"
    # 2. Formal/Business
    elif "formal" in category_lower or "suit" in category_lower or (category_lower in ["tops", "bottoms"] and v > 0.4 and s < 0.15 and pattern == "Solid"):
        aesthetic = "Formal"
        fit = "Slim"
    # 3. Minimal (Solid, muted earth/monochrome tones)
    elif pattern == "Solid" and (s < 0.25 and v > 0.2):
        aesthetic = "Minimal"
        fit = "Regular"
    # 4. Streetwear (Loose/oversized dark or heavy graphic shirts/outerwear)
    elif pattern in ["Graphic", "Patterned"] or (v < 0.25 and category_lower in ["tops", "outerwear"]):
        aesthetic = "Streetwear"
        fit = "Oversized" if category_lower in ["tops", "outerwear"] else "Loose"
    # 5. Casual (Everything else)
    else:
        aesthetic = "Casual"
        fit = "Regular"
        if pattern == "Striped":
            fit = "Regular"

    return aesthetic, fit
