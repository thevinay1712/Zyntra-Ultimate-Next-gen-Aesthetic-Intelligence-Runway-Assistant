from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.responses import Response, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import cv2
import numpy as np

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
            _, _, alpha_mask = segment_garment(contents)
        except Exception as e:
            # Fallback if rembg fails (e.g. invalid format or background removal model error)
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

        if quality != "Bad":
            # Extract dominant colors
            dominant_colors, primary_color = extract_color_palette(img_bgr, alpha_mask)
            # Classify garment pattern
            pattern = classify_garment_pattern(img_bgr, alpha_mask)
            # Classify style aesthetic & estimated fit
            aesthetic, fit = determine_aesthetic(category, primary_color, pattern)

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
            "fit": fit
        })

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in analyze-clothing: {e}")
        raise HTTPException(status_code=500, detail=f"AI Service processing error: {str(e)}")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
