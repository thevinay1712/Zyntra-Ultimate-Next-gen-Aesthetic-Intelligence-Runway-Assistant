# Zyntra Virtual Try-On Feature — Implementation Prompt (IDM-VTON Integration)

## Context

You are working on **Zyntra**, a wardrobe digitization and AI styling assistant with the following existing architecture:

- **client/** — React + Vite frontend (Vanilla CSS, glassmorphism design)
- **server/** — Node.js + Express backend, MongoDB Atlas + Mongoose, JWT auth
- **ai-service/** — Python FastAPI microservice currently running `clip-vit-base-patch32` for visual similarity (cosine similarity on embeddings)

Existing pipeline relevant to this feature:
- Users upload garment photos. The client performs local pixel flood-fill background isolation, producing clean, transparent-background garment cutouts.
- A "border-clearance ratio" check blocks uploads where the background removal is imperfect (edge splotches/shadows), guaranteeing clean garment images.
- A recommendation engine (`server/services/recommendService`) scores outfit combinations (top, bottom, shoes, accessories) using HSL color harmony, occasion, season, and wear history.

## Objective

Implement a **virtual try-on feature**: when a user selects a recommended outfit, they can choose a stock avatar (male/female) and see a photorealistic generated image of that avatar wearing the recommended garments, using **IDM-VTON** (https://github.com/yisol/IDM-VTON) as the underlying diffusion model, integrated as a new capability of `ai-service`.

This replaces a previously-attempted 3D avatar (MakeHuman/Blender) approach. The try-on result is a static generated image per outfit, not a rotatable 3D model — design the UX around that.

---

## Part 1: Avatar Management

1. Add a small fixed set of stock avatar images (e.g., 1-2 male, 1-2 female, ideally different body types) stored in `ai-service/assets/avatars/`. These are NOT user photos.
2. Build a **one-time preprocessing pipeline** per avatar: human parsing mask, DensePose, and pose estimation — the inputs IDM-VTON needs that depend only on the person image, not the garment.
3. Cache this preprocessing output to disk (e.g., `ai-service/cache/avatar_preprocessed/<avatar_id>/`), keyed by avatar ID and a content hash of the avatar image file. **Every try-on generation for that avatar reuses this cache** — do not recompute per request.
4. Provide a CLI/admin script to regenerate this cache if avatar assets are added/changed (detect via hash mismatch and auto-invalidate).
5. Each avatar entry should be a config object: `{ id, label, gender, image_path, preprocessed_path }` exposed via an endpoint like `GET /avatars` so the frontend can populate the avatar picker.

---

## Part 2: Garment Input Handling

1. Map Zyntra's garment categories (whatever taxonomy exists in the Mongoose `Clothing` model — e.g., shirt, t-shirt, jeans, jacket, dress, shoes, watch) to IDM-VTON's three categories: `upper_body`, `lower_body`, `dresses`. Build this as an explicit lookup table, not inference — fail loudly (with a clear error) if a garment's category has no mapping.
2. Items that don't map to any IDM-VTON category (shoes, watches, bags, hats, etc.) are **not sent to the diffusion model** — handle them separately (see Part 4, accessory overlay).
3. Before sending a garment image to the model:
   - Re-validate it passes the existing border-clearance/background-isolation check. If a stored garment image somehow fails this (e.g., legacy upload before the check existed), reject it from try-on with a clear message rather than letting the model produce garbage.
   - Composite the transparent-background garment cutout onto a plain neutral/white background (IDM-VTON's garment encoder expects a garment-on-plain-background image, not a transparent PNG).
   - Resize/pad to the model's expected input resolution (commonly 768×1024) while preserving aspect ratio — never stretch/distort the garment.

---

## Part 3: Core Try-On Generation Pipeline (ai-service)

1. Set up IDM-VTON in `ai-service`:
   - Clone/vendor the inference code from yisol/IDM-VTON.
   - Download required checkpoints (SDXL base, SDXL inpainting, IDM-VTON weights, image encoder, human parsing, densepose, openpose models). Document exact download steps and expected disk usage (multi-GB) in a setup script/README section.
   - Load models **once at service startup** (lazy-load on first request if startup time is a concern), not per-request — this is the single biggest performance lever.

2. Implement a core function `generate_tryon(avatar_id, garment_image, category, seed=None) -> image` wrapping IDM-VTON inference, using the avatar's precomputed preprocessing + the prepared garment image.

3. **Full-outfit chaining**: a recommendation typically includes both a top and a bottom (or a dress).
   - For `dresses`: single pass, done.
   - For top + bottom: run pass 1 (upper_body) on the base avatar → produces intermediate image. Run pass 2 (lower_body) using the **intermediate image as the new person input** (not the original avatar) → final result. Note: pass 2 needs its own preprocessing (parsing/pose) computed on the intermediate image — this cannot use the avatar's cached preprocessing, since the person image has changed. Document this clearly as the expensive step.
   - If only a top OR only a bottom is recommended (no full outfit), do a single pass and skip chaining.

4. Expose this via a FastAPI endpoint, e.g.:
   ```
   POST /tryon
   { avatar_id, items: [{ garment_image_url, category }], seed? }
   → { job_id }  (async — see Part 5)
   ```

---

## Part 4: Accessories (Shoes, Watches, etc.)

IDM-VTON does not handle small accessories well. After the diffusion result is produced:

1. Implement a lightweight 2D overlay step: composite the user's actual (background-removed) shoe/watch image onto the generated result at approximate, category-specific anchor positions (e.g., wrist region for watches, feet region for shoes), with a configurable scale per category.
2. Since avatar poses are fixed/known in advance (precomputed per avatar), anchor coordinates can be hardcoded per avatar ID per accessory category — define these as a config map, not computed dynamically.
3. If an outfit has no accessories, skip this step entirely — it's optional, not required for a valid result.
4. Treat overlay misalignment as a known limitation, not a bug to chase indefinitely — flag it in the UI as "accessories shown approximately."

---

## Part 5: Async Job Queue & API Layer

GPU inference takes seconds-to-tens-of-seconds per pass, and full outfits require 2 passes. This must be async.

1. **ai-service**: implement a simple job queue (in-memory queue + background worker is fine for a single-GPU setup; use Redis/RQ if you want persistence across restarts). One worker processes one job at a time (GPU can't parallelize this cheaply).
   - `POST /tryon` → enqueue, return `{ job_id, status: "queued" }`
   - `GET /tryon/{job_id}` → `{ status: "queued"|"processing"|"done"|"failed", progress?, result_url?, error? }`
   - `progress` should reflect multi-stage chaining (e.g., "generating top", "generating bottom", "applying accessories").

2. **server (Express)**: proxy endpoints
   - `POST /api/tryon/generate` — validates the request (user owns the referenced garment items, items map to valid categories), forwards to ai-service, stores a `TryOnJob` document (userId, outfitId/itemIds, avatarId, status, jobId from ai-service, cacheKey).
   - `GET /api/tryon/:jobId` — polls ai-service, updates and returns status.
   - On completion, download the result image from ai-service and store it (file storage / bucket), save the URL on the `TryOnJob` document.

3. **Caching**: compute a deterministic `cacheKey = hash(avatarId + sorted garment item IDs/version hashes + category set)`. Before enqueuing a new job, check for an existing completed `TryOnJob` with the same cache key and return that result immediately. Invalidate (don't reuse) the cache entry if a garment's underlying image has been re-uploaded/edited since the cached result was generated (compare an image-content hash, not just the item ID).

---

## Part 6: Frontend (client)

1. On the recommendation/outfit view, add a "Try it on" action.
2. Avatar picker (male/female, plus any additional body types) — fetched from `GET /avatars`.
3. On submit, call `POST /api/tryon/generate`, then poll `GET /api/tryon/:jobId` (e.g., every 2-3s) and show a staged loading indicator reflecting `progress` (e.g., "Generating top...", "Generating bottom...", "Adding accessories...").
4. Result view: show the generated image, with an option to view the original recommendation side-by-side for comparison, and a "regenerate" action (new seed) if the user wants a different rendering.
5. Error state: clear, non-technical message + retry button if generation fails or times out.
6. Ensure this view is responsive/mobile-friendly, consistent with the existing glassmorphism aesthetic.

---

## Part 7: Hosted Fallback (No Local GPU)

1. Add a config flag `TRYON_BACKEND = "local" | "hosted"`.
2. If `hosted`, implement the same `generate_tryon` interface but routed through `gradio_client` against a hosted IDM-VTON Space (same pattern already used for the HF Llama endpoint). Expect this to be slower and rate-limited.
3. If neither local GPU nor hosted endpoint is configured/reachable, the `/tryon` endpoint should return a clear, structured "try-on unavailable" error — the rest of Zyntra (recommendations, etc.) must continue to function normally. This feature must degrade gracefully, never break the core app.

---

## Edge Cases — Explicit Checklist

Handle and (where relevant) write tests for all of the following:

- **No GPU / model not loaded**: return a structured error immediately, don't hang the queue.
- **Garment image fails quality re-check at try-on time**: reject with a message pointing the user back to re-upload that item; don't send to the model.
- **Recommendation missing a category** (e.g., no shoes suggested): skip that step silently — not an error.
- **Dress vs. top+bottom branching**: ensure the chaining logic correctly takes the single-pass path for dresses and never tries to run a "bottom" pass on a dress.
- **Unmappable garment category**: explicit error, never silently skip a core clothing item without telling the user.
- **Generation timeout/crash mid-job**: mark job `failed` with a reason, allow one automatic retry, then surface to the user — never leave a job stuck in `processing` indefinitely (add a timeout watchdog).
- **Concurrent requests from multiple users**: queue serializes GPU access; surface queue position/estimated wait if non-trivial.
- **Duplicate/repeat requests** (same outfit + avatar): served instantly from cache.
- **Stale cache after garment edit/re-upload**: cache key must account for garment image content changes, not just item ID.
- **Image resolution/aspect ratio mismatches**: auto-resize/pad, never distort.
- **Transparent-background garment images sent to the model**: must be flattened onto neutral background first.
- **Avatar asset changes**: detect via hash, auto-invalidate and regenerate avatar preprocessing cache.
- **Storage growth**: define a retention/cleanup policy for generated try-on images (e.g., TTL, or cap per user).
- **Rate limiting**: cap try-on generations per user per time window to control compute cost, with a friendly message when limit is hit.
- **Security**: validate all image inputs (type, size, dimensions) before passing to the model pipeline; sanitize all values used to build file paths/cache keys (no path traversal via item IDs).
- **License compliance**: IDM-VTON checkpoints are CC BY-NC-SA 4.0 (non-commercial). Add a code comment/README note flagging this — if Zyntra becomes commercial, this dependency needs revisiting (alternative model or custom-trained weights).
- **Logging/monitoring**: log generation time, success/failure, and queue depth for each job — needed to tune the "is this feature usable" question over time.

---

## Deliverables Checklist

- [ ] `ai-service`: IDM-VTON setup script/instructions, avatar preprocessing cache + admin regeneration script, `generate_tryon` core function, category mapping config, accessory overlay module, job queue + `/tryon` and `/tryon/{job_id}` endpoints, `/avatars` endpoint, local/hosted backend switch
- [ ] `server`: `TryOnJob` Mongoose model, `/api/tryon/generate` and `/api/tryon/:jobId` routes, cache-key logic, image storage integration
- [ ] `client`: avatar picker component, "Try it on" trigger from recommendation view, polling + staged loading UI, result viewer with comparison and regenerate, error/retry states
- [ ] Config: env vars for model/checkpoint paths, queue settings, hosted backend URL, rate limits, cache TTLs
- [ ] README updates: setup steps, hardware requirements, license note
- [ ] Tests: category mapping, cache key generation/invalidation, dress vs. top+bottom branching, queue timeout/retry behavior, graceful degradation when try-on backend is unavailable
