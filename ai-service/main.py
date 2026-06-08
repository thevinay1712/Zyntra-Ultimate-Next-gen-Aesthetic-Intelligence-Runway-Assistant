from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.responses import Response, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import cv2
import numpy as np
import torch
from transformers import CLIPProcessor, CLIPModel
from PIL import Image
import io
import base64

from core.quality import analyze_upload_quality
from core.segmentation import segment_garment
from core.understanding import extract_color_palette, classify_garment_pattern, determine_aesthetic

app = FastAPI(title="Zyntra Closet AI Service")

# Allow CORS for local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Lazy-loaded singleton for local CLIP model to preserve RAM/CPU until active upload
class CLIPModelWrapper:
    def __init__(self):
        self.model = None
        self.processor = None
        self.device = "cpu"  # Keep CPU-based tensor calculations for maximum compatibility and student hardware

    def load(self):
        if self.model is None:
            print("[CLIP] Loading local clip-vit-base-patch32 model singleton...")
            self.processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
            self.model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32").to(self.device)
            print("[CLIP] CLIP Model loaded successfully!")
        return self.model, self.processor

clip_wrapper = CLIPModelWrapper()

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "Zyntra Closet AI"}

@app.post("/remove-bg")
async def api_remove_bg(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        segmented_bytes, _, _ = segment_garment(contents)
        return Response(content=segmented_bytes, media_type="image/png")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze-clothing")
async def api_analyze_clothing(
    image: UploadFile = File(...),
    category: str = Form("tops")
):
    """
    Core Wardrobe Intelligence endpoint.
    1. Segments the garment (removes background)
    2. Rates image quality (Good | Medium | Bad) based on resolution, blurriness, and border touch boundaries.
    3. Extracts dominant colors, edge pattern configurations, aesthetic classifications, and estimated fits.
    4. Generates local 512-float CLIP style vectors for 100% cost-free visual similarity searches.
    """
    try:
        contents = await image.read()
        
        # Decode raw contents to OpenCV BGR image for quality and feature calculations
        nparr = np.frombuffer(contents, np.uint8)
        img_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img_bgr is None:
            raise HTTPException(status_code=400, detail="Invalid image file. Make sure you upload a standard JPG/PNG.")

        # 1. Segment garment to isolate foreground clothes
        try:
            segmented_bytes, _, alpha_mask = segment_garment(contents)
        except Exception as e:
            # Fallback if rembg fails (e.g. invalid format or background removal model error)
            segmented_bytes = contents
            alpha_mask = np.ones(img_bgr.shape[:2], dtype=np.uint8) * 255
            print(f"Rembg segmenter fallback: {e}")

        # 2. Verify Upload Quality Status
        quality, quality_details = analyze_upload_quality(img_bgr, alpha_mask)

        # 3. Fashion Feature Extraction (if quality is not Bad)
        dominant_colors = ["#888888", "#bbbbbb", "#dddddd"]
        primary_color = "#888888"
        pattern = "Solid"
        aesthetic = "Casual"
        fit = "Regular"
        style_vector = []

        if quality != "Bad":
            # Extract dominant colors
            dominant_colors, primary_color = extract_color_palette(img_bgr, alpha_mask)
            # Classify garment pattern
            pattern = classify_garment_pattern(img_bgr, alpha_mask)
            # Classify style aesthetic & estimated fit
            aesthetic, fit = determine_aesthetic(category, primary_color, pattern)
            
            # 4. Generate local L2-Normalized CLIP style vector for cost-free aesthetic searches
            try:
                model, processor = clip_wrapper.load()
                pil_img = Image.open(io.BytesIO(segmented_bytes)).convert("RGB")
                inputs = processor(images=pil_img, return_tensors="pt")
                with torch.no_grad():
                    image_features = model.get_image_features(**inputs)
                
                # Apply L2 Normalization so dot product = cosine similarity
                features_tensor = image_features[0]
                norm = torch.linalg.norm(features_tensor)
                normalized_tensor = features_tensor / norm if norm > 0 else features_tensor
                style_vector = normalized_tensor.tolist()
            except Exception as clip_err:
                print(f"CLIP embedding extraction failed, fallback active: {clip_err}")
                style_vector = []

        return JSONResponse(content={
            "success": True,
            "quality": quality,
            "qualityDetails": quality_details,
            "color": {
                "primary": primary_color,
                "secondary": dominant_colors[1] if len(dominant_colors) > 1 else "",
                "palette": dominant_colors
            },
            "pattern": pattern,
            "aesthetic": aesthetic,
            "fit": fit,
            "styleVector": style_vector
        })

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in analyze-clothing: {e}")
        raise HTTPException(status_code=500, detail=f"AI Service processing error: {str(e)}")

from core.tryon_pipeline import extract_body_scaling

@app.post("/tryon")
async def api_tryon(
    image: UploadFile = File(...),
    height: str = Form(None),
    weight: str = Form(None),
    details: str = Form(None)
):
    try:
        contents = await image.read()
        nparr = np.frombuffer(contents, np.uint8)
        img_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img_bgr is None:
            raise HTTPException(status_code=400, detail="Invalid image file.")
            
        scale_matrix = extract_body_scaling(img_bgr, height=height, weight=weight, details=details)
        
        # Segment the user's background out
        segmented_bytes, cv2_bgra, _ = segment_garment(contents)
        encoded_img = base64.b64encode(segmented_bytes).decode('utf-8')
        
        # Extract skin tone from the top 15% of the segmented image (head/neck area)
        height_px = cv2_bgra.shape[0]
        top_region = cv2_bgra[0:int(height_px * 0.15), :]
        valid_pixels = top_region[top_region[:, :, 3] > 0]
        if len(valid_pixels) > 0:
            avg_color = np.mean(valid_pixels, axis=0)
            skin_tone = f"#{int(avg_color[2]):02x}{int(avg_color[1]):02x}{int(avg_color[0]):02x}"
        else:
            skin_tone = "#f1c27d" # Default generic light skin tone
            
        return JSONResponse(content={
            "success": True,
            "scaleMatrix": scale_matrix,
            "segmentedImage": encoded_img,
            "skinTone": skin_tone
        })
    except Exception as e:
        print(f"Error in tryon: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
