/**
 * Zyntra – Try-On Routes
 * POST /api/tryon/generate  — start a new outfit try-on job
 * GET  /api/tryon/:jobId    — poll job status / get result
 */

const express  = require('express');
const auth     = require('../middleware/auth');
const fetch    = require('node-fetch');
const Clothing = require('../models/Clothing');
const TryOnJob = require('../models/TryOnJob');
const fs       = require('fs');
const path     = require('path');
const crypto   = require('crypto');
const multer   = require('multer');

const router = express.Router();

const AI_BASE      = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const SERVER_BASE  = process.env.SERVER_BASE_URL || 'http://localhost:5000';
const RESULTS_DIR  = path.join(__dirname, '..', 'uploads', 'tryon_results');
const UPLOADS_DIR  = path.join(__dirname, '..', 'uploads');

// Ensure directories exist
if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer config for custom model photo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// ─── POST /api/tryon/generate ────────────────────────────────────────────────
router.post('/generate', auth, upload.single('model_image'), async (req, res) => {
  try {
    const { avatarId, seed, gender } = req.body;
    let itemIds = req.body.itemIds;

    // Parse itemIds if sent as stringified JSON array from FormData
    if (typeof itemIds === 'string') {
      try {
        itemIds = JSON.parse(itemIds);
      } catch (e) {
        itemIds = itemIds.split(',').map(id => id.trim());
      }
    }

    if (!avatarId || !Array.isArray(itemIds) || itemIds.length === 0) {
      return res.status(400).json({ message: 'avatarId and a non-empty itemIds array are required' });
    }

    // Fetch clothing items — validate user owns them
    const clothes = await Clothing.find({
      _id: { $in: itemIds },
      userId: req.userId,
    });

    if (clothes.length === 0) {
      return res.status(404).json({ message: 'No clothing items found for the given IDs' });
    }

    const foundIds = clothes.map(c => c._id.toString());
    const missing  = itemIds.filter(id => !foundIds.includes(id));
    if (missing.length > 0) {
      return res.status(403).json({
        message: `Items not found or not owned by user: ${missing.join(', ')}`,
      });
    }

    // Build items payload for ai-service
    const items = clothes.map(c => ({
      garment_image_url: `${SERVER_BASE}${c.imageUrl}`,
      category:    c.category,
      subcategory: c.subcategory || '',
      name:        c.name,
      item_id:     c._id.toString(),
    }));

    // Build cache key: hash(avatarId + sorted "itemId:imageHash")
    // Include custom model upload hash in cache check if it exists
    let cacheKeyString = avatarId;
    if (req.file) {
      const fileBuffer = fs.readFileSync(req.file.path);
      const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
      cacheKeyString += `|model:${fileHash}`;
    }
    const sortedItemKeys = clothes.map(c => `${c._id}:${c.imageHash || c._id}`).sort();
    cacheKeyString += `|${sortedItemKeys.join('|')}`;

    const cacheKey = crypto
      .createHash('sha256')
      .update(cacheKeyString)
      .digest('hex');

    // Check for an existing completed job with the same cache key
    const cached = await TryOnJob.findOne({
      cacheKey,
      status: 'done',
      userId: req.userId,
    });
    if (cached) {
      console.log(`[TryOn] Cache HIT for key ${cacheKey.slice(0, 12)}…`);
      // If we uploaded a custom model, we can clean up the temp file since we have a cache hit
      if (req.file) {
        try { fs.unlinkSync(req.file.path); } catch (e) {}
      }
      return res.json({
        jobId:     cached._id.toString(),
        status:    'done',
        resultUrl: cached.resultUrl,
        cached:    true,
      });
    }

    // Build AI service payload
    const aiPayload = {
      avatar_id:   avatarId,
      items,
      seed:        seed ? parseInt(seed, 10) : null,
      server_base: SERVER_BASE,
      custom_model_url: req.file ? `/uploads/${req.file.filename}` : null,
      gender:      gender || 'male'
    };

    // Forward job to ai-service
    const aiRes = await fetch(`${AI_BASE}/tryon`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(aiPayload),
      timeout: 15000,
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      // Clean up file on error
      if (req.file) {
        try { fs.unlinkSync(req.file.path); } catch (e) {}
      }
      return res.status(502).json({ message: `AI service error: ${errText}` });
    }

    const aiData = await aiRes.json();
    const aiJobId = aiData.job_id;

    // Persist job in MongoDB
    const job = await TryOnJob.create({
      userId:   req.userId,
      avatarId,
      itemIds:  foundIds,
      aiJobId,
      cacheKey,
      status:   'queued',
      progress: 'Waiting in queue…',
    });

    res.json({
      jobId:  job._id.toString(),
      status: 'queued',
    });

  } catch (err) {
    console.error('[TryOn] generate error:', err);
    res.status(500).json({ message: err.message || 'Failed to start try-on job' });
  }
});


// ─── GET /api/tryon/:jobId ────────────────────────────────────────────────────
router.get('/:jobId', auth, async (req, res) => {
  try {
    const job = await TryOnJob.findOne({
      _id:    req.params.jobId,
      userId: req.userId,
    });

    if (!job) {
      return res.status(404).json({ message: 'Try-on job not found' });
    }

    // If already done/failed, return stored state
    if (job.status === 'done' || job.status === 'failed') {
      return res.json({
        jobId:     job._id.toString(),
        status:    job.status,
        progress:  job.progress,
        resultUrl: job.resultUrl,
        error:     job.error,
      });
    }

    // Otherwise, poll ai-service for latest status
    let aiStatus = null;
    if (job.aiJobId) {
      try {
        const aiRes = await fetch(`${AI_BASE}/tryon/${job.aiJobId}`, { timeout: 5000 });
        if (aiRes.ok) {
          aiStatus = await aiRes.json();
        }
      } catch (e) {
        console.warn('[TryOn] Could not reach ai-service, returning cached status');
      }
    }

    // If AI job completed, download + store result image locally
    if (aiStatus && aiStatus.status === 'done' && aiStatus.result_url) {
      const aiResultUrl = aiStatus.result_url.startsWith('/')
        ? `${AI_BASE}${aiStatus.result_url}`
        : aiStatus.result_url;

      let localResultUrl = null;
      try {
        const imgRes  = await fetch(aiResultUrl, { timeout: 30000 });
        const imgBuf  = await imgRes.buffer();
        const fname   = `${job._id}.png`;
        const fpath   = path.join(RESULTS_DIR, fname);
        fs.writeFileSync(fpath, imgBuf);
        localResultUrl = `/uploads/tryon_results/${fname}`;
      } catch (e) {
        console.error('[TryOn] Failed to download result image:', e.message);
        // Fall back to direct AI URL so user still gets something
        localResultUrl = aiResultUrl;
      }

      job.status    = 'done';
      job.progress  = 'Complete';
      job.resultUrl = localResultUrl;
      await job.save();

      return res.json({
        jobId:     job._id.toString(),
        status:    'done',
        progress:  'Complete',
        resultUrl: localResultUrl,
      });
    }

    if (aiStatus && aiStatus.status === 'failed') {
      job.status   = 'failed';
      job.error    = aiStatus.error || 'Generation failed';
      job.progress = 'Failed';
      await job.save();

      return res.json({
        jobId:    job._id.toString(),
        status:   'failed',
        progress: 'Failed',
        error:    job.error,
      });
    }

    // Still processing
    const progress = (aiStatus && aiStatus.progress) || job.progress;
    const queuePos = (aiStatus && aiStatus.queue_pos) || 0;

    if (aiStatus) {
      job.status   = aiStatus.status || job.status;
      job.progress = progress;
      await job.save();
    }

    return res.json({
      jobId:    job._id.toString(),
      status:   job.status,
      progress,
      queuePos,
    });

  } catch (err) {
    console.error('[TryOn] status error:', err);
    res.status(500).json({ message: err.message || 'Failed to get job status' });
  }
});

module.exports = router;
