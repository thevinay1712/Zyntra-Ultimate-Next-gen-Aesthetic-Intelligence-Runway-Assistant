"""
Zyntra Virtual Try-On — Avatar Configuration & Management
=========================================================
Defines the stock avatars, their metadata, and accessory anchor coords.
All avatar images live in ai-service/assets/avatars/.
Preprocessed outputs are cached to ai-service/cache/avatar_preprocessed/<avatar_id>/.
"""

import os
import hashlib
import json
from pathlib import Path

# ─── Base paths ───────────────────────────────────────────────────────────────
BASE_DIR          = Path(__file__).resolve().parent.parent          # ai-service/
ASSETS_DIR        = BASE_DIR / "assets" / "avatars"
CACHE_DIR         = BASE_DIR / "cache" / "avatar_preprocessed"
TRYON_RESULTS_DIR = BASE_DIR / "cache" / "tryon_results"

ASSETS_DIR.mkdir(parents=True, exist_ok=True)
CACHE_DIR.mkdir(parents=True, exist_ok=True)
TRYON_RESULTS_DIR.mkdir(parents=True, exist_ok=True)

# ─── Stock Avatar Registry ────────────────────────────────────────────────────
# We source from VirtualTryOn/models which already has high-quality photos.
VTON_MODELS_DIR = BASE_DIR.parent / "VirtualTryOn" / "models"

AVATAR_REGISTRY = [
    {
        "id": "male_01",
        "label": "Alex (Male, Athletic)",
        "gender": "male",
        "image_path": str(VTON_MODELS_DIR / "male_model.png"),
        "thumbnail_url": "/avatars/male_01/thumb",
    },
    {
        "id": "female_01",
        "label": "Mia (Female, Slim)",
        "gender": "female",
        "image_path": str(VTON_MODELS_DIR / "female_model.png"),
        "thumbnail_url": "/avatars/female_01/thumb",
    },
]

# ─── Accessory Anchor Coordinates (per avatar, per category) ─────────────────
# Pixel coordinates on the 1024×1024 model canvas.
# Format: { avatar_id: { category: { x, y, scale } } }
ACCESSORY_ANCHORS = {
    "male_01": {
        "shoes":        {"x": 512, "y": 940, "scale": 0.11},
        "watches":      {"x": 625, "y": 510, "scale": 0.08},
        "accessories":  {"x": 512, "y": 200, "scale": 0.12},
        "sunglasses":   {"x": 512, "y": 140, "scale": 0.15},
        "hats":         {"x": 512, "y": 95, "scale": 0.22},
        "belts":        {"x": 512, "y": 480, "scale": 0.20},
    },
    "female_01": {
        "shoes":        {"x": 512, "y": 940, "scale": 0.11},
        "watches":      {"x": 635, "y": 510, "scale": 0.07},
        "accessories":  {"x": 512, "y": 195, "scale": 0.11},
        "sunglasses":   {"x": 512, "y": 140, "scale": 0.15},
        "hats":         {"x": 512, "y": 90, "scale": 0.20},
        "belts":        {"x": 512, "y": 480, "scale": 0.20},
    },
}


def get_avatar_by_id(avatar_id: str) -> dict | None:
    """Return avatar config dict or None if not found."""
    return next((a for a in AVATAR_REGISTRY if a["id"] == avatar_id), None)


def get_avatar_image_hash(avatar_id: str) -> str | None:
    """SHA-256 hash of the avatar image file for cache invalidation."""
    avatar = get_avatar_by_id(avatar_id)
    if avatar is None:
        return None
    path = Path(avatar["image_path"])
    if not path.exists():
        return None
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def get_avatar_cache_dir(avatar_id: str) -> Path:
    return CACHE_DIR / avatar_id


def get_avatar_cache_meta_path(avatar_id: str) -> Path:
    return get_avatar_cache_dir(avatar_id) / "meta.json"


def is_avatar_cache_valid(avatar_id: str) -> bool:
    """Return True if the cached preprocessing is still valid (hash matches)."""
    meta_path = get_avatar_cache_meta_path(avatar_id)
    if not meta_path.exists():
        return False
    try:
        meta = json.loads(meta_path.read_text())
        current_hash = get_avatar_image_hash(avatar_id)
        return meta.get("image_hash") == current_hash
    except Exception:
        return False


def save_avatar_cache_meta(avatar_id: str, image_hash: str):
    """Persist cache metadata (hash) so we can detect stale caches."""
    cache_dir = get_avatar_cache_dir(avatar_id)
    cache_dir.mkdir(parents=True, exist_ok=True)
    meta = {"avatar_id": avatar_id, "image_hash": image_hash}
    (cache_dir / "meta.json").write_text(json.dumps(meta, indent=2))
