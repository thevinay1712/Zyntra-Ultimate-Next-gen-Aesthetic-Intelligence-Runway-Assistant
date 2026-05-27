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

    const fileBuffer = fs.readFileSync(req.file.path);
    const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    const existingHash = await Clothing.findOne({ userId: req.userId, imageHash: fileHash });
    if (existingHash) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ message: 'You have already uploaded this exact image.' });
    }

    const existing = await Clothing.findOne({ userId: req.userId, name: name });
    if (existing) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ message: 'An item with this name already exists in your wardrobe.' });
    }

    // --- CLOSET AI: FORWARD IMAGE FOR QUALITY & FASHION UNDERSTANDING ---
    let aiQuality = 'Good';
    let aiQualityDetails = 'Excellent quality';
    let aiColor = null;
    let aiPattern = 'Solid';
    let aiAesthetic = 'Casual';
    let aiFit = 'Regular';
    let aiStyleVector = [];

    try {
      console.log('🧠 Querying Zyntra Closet AI service...');
      const formData = new FormData();
      formData.append('image', fs.createReadStream(req.file.path));
      formData.append('category', category || 'tops');

      const aiResponse = await fetch('http://localhost:8000/analyze-clothing', {
        method: 'POST',
        body: formData,
        headers: formData.getHeaders(),
        timeout: 10000 // 10-second timeout
      });

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        aiQuality = aiData.quality;
        aiQualityDetails = aiData.qualityDetails;
        aiColor = aiData.color;
        aiPattern = aiData.pattern;
        aiAesthetic = aiData.aesthetic;
        aiFit = aiData.fit;
        aiStyleVector = aiData.styleVector || [];

        console.log(`✅ Zyntra Closet AI result: Quality=${aiQuality}, Aesthetic=${aiAesthetic}, Pattern=${aiPattern}, VectorLength=${aiStyleVector.length}`);
      } else {
        console.warn('AI Service returned non-ok status:', aiResponse.status);
      }
    } catch (err) {
      console.warn('AI Service offline or failed. Graceful fallback active:', err.message);
    }

    // If quality is Bad, reject the upload and delete the file!
    if (aiQuality === 'Bad') {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        message: `AI Upload Rejection: ${aiQualityDetails}`,
        quality: 'Bad',
        details: aiQualityDetails
      });
    }

    // Extract colors (use AI colors if available, otherwise run local fallback)
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
      subcategory: subcategory || '',
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

module.exports = router;
