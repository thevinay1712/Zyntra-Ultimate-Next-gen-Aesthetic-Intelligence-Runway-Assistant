"""
Zyntra Virtual Try-On — Garment Category Mapping
=================================================
Maps Zyntra Clothing model categories → IDM-VTON categories.
Fails loudly (KeyError) for unmapped categories so callers always get
an explicit error, never silent data loss.

IDM-VTON categories:  "upper_body" | "lower_body" | "dresses"
Non-VTON categories:  "skip" (accessory overlay only, not sent to diffusion)
"""

# ─── Main mapping table ───────────────────────────────────────────────────────
# Zyntra category   : IDM-VTON category  (or "skip" for accessories)
CATEGORY_MAP: dict[str, str] = {
    # Tops
    "tops":       "upper_body",
    # Bottoms
    "bottoms":    "lower_body",
    # Outerwear — treat as upper body
    "outerwear":  "upper_body",
    # Shoes / Accessories — not sent to model, overlaid separately
    "shoes":      "skip",
    "accessories":"skip",
}

# Subcategory overrides (Zyntra subcategory field → IDM-VTON category)
SUBCATEGORY_OVERRIDE_MAP: dict[str, str] = {
    "dress":     "dresses",
    "skirt":     "lower_body",
    "shirt":     "upper_body",
    "t-shirt":   "upper_body",
    "tshirt":    "upper_body",
    "jeans":     "lower_body",
    "trousers":  "lower_body",
    "pants":     "lower_body",
    "shorts":    "lower_body",
    "jacket":    "upper_body",
    "hoodie":    "upper_body",
    "blazer":    "upper_body",
    "coat":      "upper_body",
    "watch":     "skip",
    "watches":   "skip",
    "hat":       "skip",
    "bag":       "skip",
    "sneakers":  "skip",
    "boots":     "skip",
    "sandals":   "skip",
}


def map_category(category: str, subcategory: str = "") -> str:
    """
    Return the IDM-VTON category string for a garment.
    Raises ValueError if the category is unknown (explicit fail-loud).
    Returns "skip" for accessories/shoes (caller decides what to do).
    """
    sub = (subcategory or "").strip().lower()
    cat = (category or "").strip().lower()

    # Sub-category override takes priority
    if sub and sub in SUBCATEGORY_OVERRIDE_MAP:
        return SUBCATEGORY_OVERRIDE_MAP[sub]

    if cat in CATEGORY_MAP:
        return CATEGORY_MAP[cat]

    raise ValueError(
        f"Unknown garment category '{category}' (subcategory='{subcategory}'). "
        f"Cannot map to IDM-VTON category. Please re-categorize this item."
    )


def is_skip_category(vton_category: str) -> bool:
    """Return True if the garment should be handled via accessory overlay, not diffusion."""
    return vton_category == "skip"


def is_dress(vton_category: str) -> bool:
    return vton_category == "dresses"
