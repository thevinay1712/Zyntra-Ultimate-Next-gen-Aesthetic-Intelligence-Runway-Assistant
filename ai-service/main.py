from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.responses import Response, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import cv2
import numpy as np
import torch
import os
from transformers import CLIPProcessor, CLIPModel
from PIL import Image
import io

# Load .env so REPLICATE_API_TOKEN is available without manually setting env vars
try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))
except ImportError:
    pass  # python-dotenv not installed, env vars must be set manually

from core.quality import analyze_upload_quality
from core.segmentation import segment_garment
from core.understanding import extract_color_palette, classify_garment_pattern, determine_aesthetic

import sys
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if parent_dir not in sys.path:
    sys.path.append(parent_dir)
from VirtualTryOn.vton_processor import run_local_vton, call_replicate_vton

# ── New Try-On module imports ──────────────────────────────────────────────────
from tryon.avatars import AVATAR_REGISTRY, get_avatar_by_id, TRYON_RESULTS_DIR
from tryon.category_map import map_category, is_skip_category
from tryon.job_queue import enqueue_job, get_job
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional
import hashlib
import urllib.request

app = FastAPI(title="Zyntra Closet AI Service")

# Allow CORS for local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve generated try-on result images statically
app.mount("/tryon/result", StaticFiles(directory=str(TRYON_RESULTS_DIR)), name="tryon_results")

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

@app.on_event("startup")
def startup_event():
    import threading
    
    def preload_models():
        print("[Startup] Pre-loading CLIP model in background...")
        try:
            clip_wrapper.load()
            print("[Startup] CLIP model pre-loaded successfully in background!")
        except Exception as e:
            print(f"[Startup] Failed to pre-load CLIP model: {e}")
            
        print("[Startup] Pre-loading rembg session in background (downloads u2net model if missing)...")
        try:
            from rembg import new_session
            new_session()
            print("[Startup] rembg session pre-loaded successfully in background!")
        except Exception as e:
            print(f"[Startup] Failed to pre-load rembg session: {e}")
            
    # Start pre-loading in a background thread to prevent blocking server readiness
    threading.Thread(target=preload_models, daemon=True).start()

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
    category: str = Form("tops"),
    item_name: str = Form("")
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
            segmented_bytes, cv2_img_bgra, alpha_mask = segment_garment(contents)
            img_bgr_isolated = cv2.cvtColor(cv2_img_bgra, cv2.COLOR_BGRA2BGR)
        except Exception as e:
            # Fallback if rembg fails (e.g. invalid format or background removal model error)
            segmented_bytes = contents
            alpha_mask = np.ones(img_bgr.shape[:2], dtype=np.uint8) * 255
            img_bgr_isolated = img_bgr
            print(f"Rembg segmenter fallback: {e}")

        # 2. Verify Upload Quality Status
        quality, quality_details = analyze_upload_quality(img_bgr_isolated, alpha_mask)

        # 3. Fashion Feature Extraction (if quality is not Bad)
        dominant_colors = ["#888888", "#bbbbbb", "#dddddd"]
        primary_color = "#888888"
        pattern = "Solid"
        aesthetic = "Casual"
        fit = "Regular"
        style_vector = []
        detected_item = "item"
        name_is_valid = True  # Default: allow if CLIP is unavailable

        if quality != "Bad":
            # Extract dominant colors
            dominant_colors, primary_color = extract_color_palette(img_bgr_isolated, alpha_mask)
            # Classify garment pattern
            pattern = classify_garment_pattern(img_bgr_isolated, alpha_mask)
            # Classify style aesthetic & estimated fit
            aesthetic, fit = determine_aesthetic(category, primary_color, pattern)

            # 4. Generate local L2-Normalized CLIP style vector and zero-shot classify garment type
            try:
                model, processor = clip_wrapper.load()
                pil_img = Image.open(io.BytesIO(segmented_bytes)).convert("RGB")
                
                labels_map = {
                    "shirt": ["a photo of a button-down shirt", "a photo of a blouse", "a photo of a sweater", "a photo of a top"],
                    "tshirt": ["a photo of a t-shirt", "a photo of a tee shirt"],
                    "pant": ["a photo of pants", "a photo of trousers", "a photo of jeans", "a photo of sweatpants"],
                    "shorts": ["a photo of shorts"],
                    "skirt": ["a photo of a skirt"],
                    "shoe": ["a photo of shoes", "a photo of sneakers", "a photo of boots", "a photo of footwear"],
                    "jacket": ["a photo of a jacket", "a photo of a coat", "a photo of a blazer", "a photo of outerwear"],
                    "watch": ["a photo of a wristwatch", "a photo of a watch"],
                    "accessory": ["a photo of a belt", "a photo of sunglasses", "a photo of a hat", "a photo of a bag"]
                }
                
                # Flatten candidate texts for CLIP
                flat_texts = []
                text_to_cat = {}
                for cat, texts in labels_map.items():
                    for text in texts:
                        flat_texts.append(text)
                        text_to_cat[text] = cat

                inputs = processor(text=flat_texts, images=pil_img, return_tensors="pt", padding=True)
                with torch.no_grad():
                    outputs = model(**inputs)
                    logits_per_image = outputs.logits_per_image
                    probs = logits_per_image.softmax(dim=1)
                    best_idx = probs.argmax().item()
                    best_text = flat_texts[best_idx]
                    detected_item = text_to_cat[best_text]
                    print(f"[CLIP Classify] best_text='{best_text}' => detected_item='{detected_item}'")

                # 5. CLIP-based name validation — multi-candidate (robust, no hardcoded keywords)
                # Adds user's name to the full garment prompt pool and checks that it scores
                # at least 50% of the best-matching prompt for the detected garment type.
                # "Blue pant" for a shirt image: shirt prompts dominate → name_prob far below threshold → REJECT
                # "Blue Oxford Shirt" for a shirt image: name scores near/above shirt prompts → ACCEPT
                if item_name.strip() and detected_item != "item":
                    try:
                        # CLIP-driven text-to-text semantic matching to validate garment names.
                        # Evaluates if the user's name maps to the correct category and filters out gibberish.
                        categories = ['shirt', 't-shirt', 'pants', 'shorts', 'skirt', 'shoes', 'jacket', 'watch', 'accessory']
                        cat_prompts = [f"a photo of a {c}" for c in categories]
                        
                        # Map detected_item (image category) to allowed text categories
                        allowed_map = {
                            "shirt": ["shirt", "t-shirt", "jacket"],
                            "tshirt": ["shirt", "t-shirt", "jacket"],
                            "jacket": ["shirt", "t-shirt", "jacket"],
                            "pant": ["pants", "shorts", "skirt"],
                            "shorts": ["pants", "shorts", "skirt"],
                            "skirt": ["pants", "shorts", "skirt"],
                            "shoe": ["shoes"],
                            "watch": ["watch", "accessory"],
                            "accessory": ["accessory", "watch"]
                        }
                        
                        texts = [f"a photo of {item_name.strip()}"] + cat_prompts
                        val_inputs = processor(text=texts, return_tensors="pt", padding=True)
                        with torch.no_grad():
                            val_features = model.get_text_features(**val_inputs).pooler_output
                            
                        # Normalize and compute cosine similarities
                        val_features = val_features / val_features.norm(dim=-1, keepdim=True)
                        sims = (val_features[0:1] @ val_features[1:].T)[0].tolist()
                        
                        # Find the category with the highest semantic similarity
                        best_idx = sims.index(max(sims))
                        best_cat = categories[best_idx]
                        max_sim = sims[best_idx]
                        
                        # Check threshold for gibberish/unrelated names
                        is_gibberish = max_sim < 0.745
                        
                        # Verify that the best text match aligns with the detected garment type
                        allowed_cats = allowed_map.get(detected_item, [detected_item])
                        name_is_valid = (not is_gibberish) and (best_cat in allowed_cats)
                        
                        print(f"[CLIP Name Validation] name='{item_name}', best_match='{best_cat}', similarity={max_sim:.4f}, gibberish={is_gibberish}, allowed_for_{detected_item}={allowed_cats}, valid={name_is_valid}")
                    except Exception as val_err:
                        print(f"[CLIP Name Validation] Failed, defaulting to valid: {val_err}")
                        name_is_valid = True  # Fail open — never block on AI error


                # Generate CLIP style vector
                inputs_v = processor(images=pil_img, return_tensors="pt")
                with torch.no_grad():
                    image_features = model.get_image_features(**inputs_v)
                features_tensor = image_features.pooler_output[0]
                norm = torch.linalg.norm(features_tensor)
                normalized_tensor = features_tensor / norm if norm > 0 else features_tensor
                style_vector = normalized_tensor.tolist()
            except Exception as clip_err:
                print(f"CLIP embedding/classification failed, fallback active: {clip_err}")
                style_vector = []
                detected_item = "item"
                name_is_valid = True  # Fail open

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
            "styleVector": style_vector,
            "detectedItemType": detected_item,
            "nameIsValid": name_is_valid
        })

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in analyze-clothing: {e}")
        raise HTTPException(status_code=500, detail=f"AI Service processing error: {str(e)}")


@app.post("/virtual-tryon")
async def api_virtual_tryon(
    image: UploadFile = File(...),
    gender: str = Form(...),
    type: str = Form(...),
    model_image: UploadFile = File(None)
):
    """
    2D AI Virtual Try-On Endpoint (legacy single-garment endpoint).
    """
    if gender not in ["male", "female"]:
        raise HTTPException(status_code=400, detail="Invalid gender. Must be 'male' or 'female'.")
    if type not in ["tshirt", "jeans"]:
        raise HTTPException(status_code=400, detail="Invalid garment type. Must be 'tshirt' or 'jeans'.")

    try:
        # 1. Read and segment garment image
        garment_contents = await image.read()
        segmented_bytes, cv2_garment_bgra, _ = segment_garment(garment_contents)

        # 2. Prepare model (human) image
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        vto_dir = os.path.join(base_dir, "VirtualTryOn")
        
        if model_image is not None:
            # User uploaded a custom model photo
            model_bytes = await model_image.read()
            nparr = np.frombuffer(model_bytes, np.uint8)
            cv2_model_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if cv2_model_bgr is None:
                raise HTTPException(status_code=400, detail="Uploaded custom model image is invalid.")
        else:
            # Use default model template
            model_path = os.path.join(vto_dir, "models", f"{gender}_model.png")
            if not os.path.exists(model_path):
                raise HTTPException(status_code=500, detail=f"Default model file not found at {model_path}.")
            cv2_model_bgr = cv2.imread(model_path)
            with open(model_path, "rb") as f:
                model_bytes = f.read()

        # 3. Check for Replicate Cloud Token
        replicate_token = os.environ.get("REPLICATE_API_TOKEN")
        output_bytes = None
        
        if replicate_token:
            category = "upper_body" if type == "tshirt" else "lower_body"
            output_bytes = call_replicate_vton(model_bytes, segmented_bytes, category, replicate_token)
            
        if output_bytes is None:
            # Fallback to local CV engine
            print("[AI-Service] Running local OpenCV VTON engine...")
            is_default = (model_image is None)
            cv2_output_bgr = run_local_vton(cv2_model_bgr, cv2_garment_bgra, type, gender, is_default)
            success, buffer = cv2.imencode('.png', cv2_output_bgr)
            if not success:
                raise Exception("Failed to encode final local VTON composite to PNG.")
            output_bytes = buffer.tobytes()

        return Response(content=output_bytes, media_type="image/png")

    except HTTPException:
        raise
    except Exception as e:
        print(f"[AI-Service] Try-on error: {e}")
        raise HTTPException(status_code=500, detail=f"Virtual Try-On failed: {str(e)}")


# ═══════════════════════════════════════════════════════════════════════════════
# NEW: Outfit Try-On endpoints (IDM-VTON style, async job queue)
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/avatars")
def api_get_avatars():
    """Return list of available stock avatars for the frontend avatar picker."""
    avatars = []
    for a in AVATAR_REGISTRY:
        avatars.append({
            "id":        a["id"],
            "label":     a["label"],
            "gender":    a["gender"],
            "thumbUrl":  f"http://localhost:8000/avatars/{a['id']}/thumb",
        })
    return JSONResponse(content={"avatars": avatars})


@app.get("/avatars/{avatar_id}/thumb")
def api_avatar_thumb(avatar_id: str):
    """Serve the avatar thumbnail (full image served as thumb for now)."""
    avatar = get_avatar_by_id(avatar_id)
    if avatar is None:
        raise HTTPException(status_code=404, detail=f"Avatar '{avatar_id}' not found")
    img_path = avatar["image_path"]
    if not os.path.exists(img_path):
        raise HTTPException(status_code=404, detail="Avatar image file not found")
    with open(img_path, "rb") as f:
        return Response(content=f.read(), media_type="image/png")


class TryOnItem(BaseModel):
    garment_image_url: str           # Server URL to the garment image
    category: str                    # Zyntra category (tops, bottoms, shoes…)
    subcategory: Optional[str] = ""  # e.g. "jeans", "dress"
    name: Optional[str] = "Garment"
    item_id: Optional[str] = ""      # For cache key


class TryOnRequest(BaseModel):
    avatar_id: str
    items: List[TryOnItem]
    seed: Optional[int] = None
    server_base: Optional[str] = "http://localhost:5000"  # to resolve relative URLs


@app.post("/tryon")
async def api_post_tryon(req: TryOnRequest):
    """
    Enqueue a full-outfit try-on job.
    Returns { job_id, status: "queued" }.
    """
    # Validate avatar
    avatar = get_avatar_by_id(req.avatar_id)
    if avatar is None:
        raise HTTPException(status_code=400, detail=f"Avatar '{req.avatar_id}' not found")

    if not req.items:
        raise HTTPException(status_code=400, detail="At least one garment item is required")

    # Resolve + download garment images, map categories
    resolved_items = []
    for item in req.items:
        # Map category — fail loudly for unmapped
        try:
            vton_cat = map_category(item.category, item.subcategory or "")
        except ValueError as e:
            raise HTTPException(status_code=422, detail=str(e))

        # Fetch garment image bytes
        url = item.garment_image_url
        if url.startswith("/"):
            url = f"{req.server_base}{url}"
        try:
            with urllib.request.urlopen(url, timeout=15) as resp:
                garment_bytes = resp.read()
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Could not fetch garment image for '{item.name}': {e}"
            )

        resolved_items.append({
            "name":              item.name,
            "garment_bytes":     garment_bytes,
            "vton_category":     vton_cat,
            "original_category": item.category,
            "item_id":           item.item_id,
        })

    # Build cache key
    cache_parts = [req.avatar_id] + sorted(
        f"{i['item_id']}:{hashlib.sha256(i['garment_bytes']).hexdigest()[:12]}"
        for i in resolved_items
    )
    cache_key = hashlib.sha256("|".join(cache_parts).encode()).hexdigest()

    job_id = enqueue_job({
        "avatar_id":  req.avatar_id,
        "items":      resolved_items,
        "cache_key":  cache_key,
        "seed":       req.seed,
    })

    return JSONResponse(content={"job_id": job_id, "status": "queued"})


@app.get("/tryon/{job_id}")
def api_get_tryon_status(job_id: str):
    """
    Poll try-on job status.
    Returns { status, progress, result_url, error, queue_pos }.
    """
    job = get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found")

    return JSONResponse(content={
        "job_id":     job["id"],
        "status":     job["status"],
        "progress":   job.get("progress", ""),
        "queue_pos":  job.get("queue_pos", 0),
        "result_url": job.get("result_url"),
        "error":      job.get("error"),
    })


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
