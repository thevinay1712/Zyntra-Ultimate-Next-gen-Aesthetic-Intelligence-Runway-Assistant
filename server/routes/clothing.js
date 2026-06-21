const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const auth = require('../middleware/auth');
const Clothing = require('../models/Clothing');
const { extractColors } = require('../services/imageService');
const FormData = require('form-data');
const fetch = require('node-fetch');

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPG, PNG, WebP) are allowed'));
    }
  },
});

// POST /api/clothing — Upload new clothing item
router.post('/', auth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Image is required' });
    }

    const { name, category, subcategory, brand } = req.body;
    let season = [];
    let occasion = [];
    let tags = [];

    try {
      season = JSON.parse(req.body.season || '[]');
      occasion = JSON.parse(req.body.occasion || '[]');
      tags = JSON.parse(req.body.tags || '[]');
    } catch (e) {
      // Use defaults
    }

    let fileBuffer = fs.readFileSync(req.file.path);
    const originalMime = req.file.mimetype;

    // ── Parallel duplicate checks (hash + name) ──────────────────────────────
    const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    console.log(`[UPLOAD] User ID: ${req.userId}, File Hash: ${fileHash}`);

    const [existingHash, existingName] = await Promise.all([
      Clothing.findOne({ userId: req.userId, imageHash: fileHash }),
      Clothing.findOne({ userId: req.userId, name })
    ]);

    if (existingHash) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'You have already uploaded this exact image.' });
    }
    if (existingName) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'An item with this name already exists in your wardrobe.' });
    }

    // ── Single AI call: BG removal + analysis in one pass ────────────────────
    // /process-upload returns the transparent PNG as base64 AND all analysis
    // results in one JSON response — eliminates the old double rembg overhead.
    let aiQuality = 'Good';
    let aiQualityDetails = 'Excellent quality';
    let aiColor = null;
    let aiPattern = 'Solid';
    let aiAesthetic = 'Casual';
    let aiFit = 'Regular';
    let aiStyleVector = [];
    let detectedItemType = null;
    let nameIsValid = true;
    let transparentBuffer = null;

    try {
      console.log('🧠 Querying Zyntra AI (unified process-upload)...');
      const formData = new FormData();
      formData.append('image', fileBuffer, {
        filename: req.file.filename,
        contentType: originalMime
      });
      formData.append('category', category || 'tops');
      formData.append('item_name', name || '');

      const aiResponse = await fetch('http://localhost:8000/process-upload', {
        method: 'POST',
        body: formData,
        headers: formData.getHeaders(),
        timeout: 45000
      });

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        aiQuality        = aiData.quality;
        aiQualityDetails = aiData.qualityDetails;
        aiColor          = aiData.color;
        aiPattern        = aiData.pattern;
        aiAesthetic      = aiData.aesthetic;
        aiFit            = aiData.fit;
        aiStyleVector    = aiData.styleVector || [];
        detectedItemType = aiData.detectedItemType;
        if (aiData.nameIsValid === false) nameIsValid = false;

        // Decode the transparent PNG from base64
        if (aiData.transparentImageB64) {
          transparentBuffer = Buffer.from(aiData.transparentImageB64, 'base64');
        }

        console.log(`✅ AI result: Quality=${aiQuality}, Aesthetic=${aiAesthetic}, Pattern=${aiPattern}, DetectedType=${detectedItemType}, NameIsValid=${nameIsValid}`);
      } else {
        console.warn('AI Service returned non-ok status:', aiResponse.status);
      }
    } catch (err) {
      console.warn('AI Service offline or failed. Graceful fallback active:', err.message);
    }

    // ── Quality gate ─────────────────────────────────────────────────────────
    if (aiQuality === 'Bad') {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        message: `AI Upload Rejection: ${aiQualityDetails}`,
        quality: 'Bad',
        details: aiQualityDetails
      });
    }

    // ── Name validation gate ──────────────────────────────────────────────────
    if (!nameIsValid) {
      console.warn(`[UPLOAD REJECTION] CLIP rejected name "${name}" for detected garment "${detectedItemType}"`);
      try { fs.unlinkSync(req.file.path); } catch (e) {}
      return res.status(400).json({
        message: 'Garment mismatch',
        detectedType: detectedItemType,
        detectedLabel: detectedItemType || 'garment'
      });
    }

    // ── Save transparent PNG if received ─────────────────────────────────────
    if (transparentBuffer) {
      // Check isolated-image duplicate
      const transparentHash = crypto.createHash('sha256').update(transparentBuffer).digest('hex');
      const existingTransparent = await Clothing.findOne({ userId: req.userId, imageHash: transparentHash });
      if (existingTransparent) {
        try { fs.unlinkSync(req.file.path); } catch (e) {}
        return res.status(400).json({ message: 'You have already uploaded this exact image.' });
      }

      const baseName = path.basename(req.file.filename, path.extname(req.file.filename));
      const newFilename = `${baseName}-transparent.png`;
      const newPath = path.join(path.dirname(req.file.path), newFilename);
      fs.writeFileSync(newPath, transparentBuffer);
      try { fs.unlinkSync(req.file.path); } catch (e) {}
      req.file.path     = newPath;
      req.file.filename = newFilename;
      req.file.mimetype = 'image/png';
    }

    // ── Color fallback ────────────────────────────────────────────────────────
    let colorData = { primary: '#888888', secondary: '', palette: [] };
    if (aiColor) {
      colorData = aiColor;
    } else {
      try {
        colorData = await extractColors(req.file.path);
      } catch (e) {
        console.warn('Fallback color extraction failed:', e.message);
      }
    }

    const clothing = await Clothing.create({
      userId: req.userId,
      name,
      category,
      subcategory: subcategory || detectedItemType || '',
      color: colorData,
      season,
      occasion,
      imageUrl: `/uploads/${req.file.filename}`,
      imageHash: fileHash,
      brand: brand || '',
      tags,
      uploadQuality: aiQuality,
      aesthetic: aiAesthetic,
      pattern: aiPattern,
      fit: aiFit,
      styleVector: aiStyleVector
    });

    res.status(201).json({ clothing });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ message: 'Failed to upload clothing' });
  }
});

// GET /api/clothing/:id/similar — Retrieve visually similar clothes using local Cosine Similarity
router.get('/:id/similar', auth, async (req, res) => {
  try {
    const target = await Clothing.findOne({ _id: req.params.id, userId: req.userId });
    if (!target) {
      return res.status(404).json({ message: 'Clothing item not found' });
    }

    if (!target.styleVector || target.styleVector.length === 0) {
      return res.json({ similar: [] }); // No visual vectors extracted (e.g. uploaded before update or fallback)
    }

    // Fetch all other items in the wardrobe
    const allItems = await Clothing.find({ 
      userId: req.userId, 
      _id: { $ne: target._id } 
    });

    const cosineSimilarity = (vecA, vecB) => {
      if (!vecA || !vecB || vecA.length !== vecB.length || vecA.length === 0) return 0.0;
      let dot = 0.0;
      for (let i = 0; i < vecA.length; i++) {
        dot += vecA[i] * vecB[i];
      }
      return dot;
    };

    // Calculate score, sort, and return top 5
    const similar = allItems
      .map(item => {
        const score = cosineSimilarity(target.styleVector, item.styleVector);
        return {
          item,
          score: Math.round(score * 100) // Percentage score
        };
      })
      .filter(entry => entry.score > 0) // Filter out items with no vectors
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    res.json({ similar });
  } catch (err) {
    console.error('Similarity search error:', err);
    res.status(500).json({ message: 'Failed to search similar clothes' });
  }
});

// GET /api/clothing — Get all user's clothes (with optional filters)
router.get('/', auth, async (req, res) => {
  try {
    const query = { userId: req.userId };

    if (req.query.category) query.category = req.query.category;
    if (req.query.season) query.season = req.query.season;
    if (req.query.occasion) query.occasion = req.query.occasion;

    const clothes = await Clothing.find(query).sort({ createdAt: -1 });
    res.json({ clothes });
  } catch (err) {
    console.error('Fetch error:', err);
    res.status(500).json({ message: 'Failed to fetch clothes' });
  }
});

// GET /api/clothing/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const clothing = await Clothing.findOne({ _id: req.params.id, userId: req.userId });
    if (!clothing) return res.status(404).json({ message: 'Item not found' });
    res.json({ clothing });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch item' });
  }
});

// PUT /api/clothing/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const clothing = await Clothing.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!clothing) return res.status(404).json({ message: 'Item not found' });
    res.json({ clothing });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update item' });
  }
});

// DELETE /api/clothing/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const clothing = await Clothing.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!clothing) return res.status(404).json({ message: 'Item not found' });

    // Delete image file
    const imagePath = path.join(__dirname, '..', clothing.imageUrl);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

    res.json({ message: 'Item deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete item' });
  }
});

// POST /api/clothing/tryon — Render virtual try-on on avatar
router.post('/tryon', auth, upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'model_image', maxCount: 1 }
]), async (req, res) => {
  let tempFilePath = null;
  let tempModelPath = null;
  try {
    const { gender, type, clothingId } = req.body;
    
    const garmentFile = req.files && req.files.image ? req.files.image[0] : null;
    const modelFile = req.files && req.files.model_image ? req.files.model_image[0] : null;

    if (!gender || !type) {
      if (garmentFile) fs.unlinkSync(garmentFile.path);
      if (modelFile) fs.unlinkSync(modelFile.path);
      return res.status(400).json({ message: 'Gender and type are required' });
    }

    let imageStream = null;

    if (clothingId && clothingId !== 'null' && clothingId !== 'undefined') {
      // Use existing wardrobe item
      const item = await Clothing.findOne({ _id: clothingId, userId: req.userId });
      if (!item) {
        if (garmentFile) fs.unlinkSync(garmentFile.path);
        if (modelFile) fs.unlinkSync(modelFile.path);
        return res.status(404).json({ message: 'Wardrobe item not found' });
      }
      
      const imagePath = path.join(__dirname, '..', item.imageUrl);
      if (!fs.existsSync(imagePath)) {
        if (garmentFile) fs.unlinkSync(garmentFile.path);
        if (modelFile) fs.unlinkSync(modelFile.path);
        return res.status(404).json({ message: 'Wardrobe image file not found on disk' });
      }
      imageStream = fs.createReadStream(imagePath);
      
      // Clean up uploaded file if the client sent both
      if (garmentFile) {
        fs.unlinkSync(garmentFile.path);
      }
    } else {
      // Use uploaded image file
      if (!garmentFile) {
        if (modelFile) fs.unlinkSync(modelFile.path);
        return res.status(400).json({ message: 'Image or clothingId is required' });
      }
      imageStream = fs.createReadStream(garmentFile.path);
      tempFilePath = garmentFile.path;
    }

    console.log(`🧠 Express forwarding try-on to local AI service: gender=${gender}, type=${type}`);
    const formData = new FormData();
    formData.append('image', imageStream);
    formData.append('gender', gender);
    formData.append('type', type);
    
    if (modelFile) {
      formData.append('model_image', fs.createReadStream(modelFile.path));
      tempModelPath = modelFile.path;
    }

    const aiResponse = await fetch('http://localhost:8000/virtual-tryon', {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders(),
      timeout: 120000 // 2-minute timeout for VTON processing
    });

    // Clean up uploaded temp files immediately if present
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (err) {}
    }
    if (tempModelPath && fs.existsSync(tempModelPath)) {
      try {
        fs.unlinkSync(tempModelPath);
      } catch (err) {}
    }

    if (aiResponse.ok) {
      res.setHeader('Content-Type', 'image/png');
      aiResponse.body.pipe(res);
    } else {
      const errorText = await aiResponse.text();
      console.error('AI Service virtual-tryon failed:', errorText);
      res.status(500).json({ message: `AI Service tryon failed: ${errorText}` });
    }

  } catch (err) {
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (e) {}
    }
    if (tempModelPath && fs.existsSync(tempModelPath)) {
      try {
        fs.unlinkSync(tempModelPath);
      } catch (e) {}
    }
    console.error('Virtual try-on error:', err);
    res.status(500).json({ message: 'Failed to process virtual try-on' });
  }
});

module.exports = router;

