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

    // Calculate hash of the ORIGINAL uploaded image to check for duplicates
    const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    console.log(`[UPLOAD] User ID: ${req.userId} (type: ${typeof req.userId}), File Hash: ${fileHash}`);

    // 1. Check if the exact same image has already been uploaded by the user
    const existingHash = await Clothing.findOne({ userId: req.userId, imageHash: fileHash });
    console.log(`[UPLOAD] Duplicate query result:`, existingHash ? { id: existingHash._id, name: existingHash.name, hash: existingHash.imageHash } : 'None found');
    if (existingHash) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ message: 'You have already uploaded this exact image.' });
    }

    // 2. Check if an item with the same name already exists in user's wardrobe
    const existingName = await Clothing.findOne({ userId: req.userId, name: name });
    if (existingName) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ message: 'An item with this name already exists in your wardrobe.' });
    }

    let bgRemoved = false;
    let transparentBuffer = null;

    // --- HUGGING FACE: AI BACKGROUND REMOVAL (Option 1) ---
    if (process.env.HF_API_TOKEN) {
      try {
        console.log('🤖 Querying Hugging Face RMBG-1.4 model for background isolation...');
        const hfResponse = await fetch('https://api-inference.huggingface.co/models/briaai/RMBG-1.4', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.HF_API_TOKEN}`,
            'Content-Type': originalMime
          },
          body: fileBuffer,
          timeout: 15000 // 15-second timeout
        });

        if (hfResponse.ok) {
          transparentBuffer = await hfResponse.buffer();
          bgRemoved = true;
          console.log('✅ Background isolated successfully via Hugging Face RMBG-1.4!');
        } else {
          const errorText = await hfResponse.text();
          console.warn(`Hugging Face API background removal failed (status ${hfResponse.status}): ${errorText}`);
        }
      } catch (err) {
        console.warn('Failed to call Hugging Face background removal API:', err.message);
      }
    } else {
      console.warn('HF_API_TOKEN is not defined in .env. Skipping Hugging Face background removal.');
    }

    // --- FALLBACK: LOCAL PYTHON AI SERVICE BACKGROUND REMOVAL ---
    if (!bgRemoved) {
      try {
        console.log('🔌 Falling back to local Python AI service for background removal...');
        const localFormData = new FormData();
        localFormData.append('file', fileBuffer, {
          filename: req.file.filename,
          contentType: originalMime
        });

        const localResponse = await fetch('http://localhost:8000/remove-bg', {
          method: 'POST',
          body: localFormData,
          headers: localFormData.getHeaders(),
          timeout: 25000 // 25-second timeout
        });

        if (localResponse.ok) {
          transparentBuffer = await localResponse.buffer();
          bgRemoved = true;
          console.log('✅ Background isolated successfully via local Python AI service!');
        } else {
          const localErrorText = await localResponse.text();
          console.warn(`Local AI service background removal failed (status ${localResponse.status}): ${localErrorText}`);
        }
      } catch (err) {
        console.warn('Failed to call local Python AI background removal service:', err.message);
      }
    }

    // If background was removed successfully, save the transparent PNG and update file details
    if (bgRemoved && transparentBuffer) {
      // Calculate hash of the transparent/isolated PNG to check against legacy DB entries
      const transparentHash = crypto.createHash('sha256').update(transparentBuffer).digest('hex');
      console.log(`[UPLOAD] Isolated Hash: ${transparentHash}`);

      const existingTransparent = await Clothing.findOne({ userId: req.userId, imageHash: transparentHash });
      console.log(`[UPLOAD] Legacy/isolated duplicate query result:`, existingTransparent ? { id: existingTransparent._id, name: existingTransparent.name } : 'None found');
      if (existingTransparent) {
        if (req.file) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(400).json({ message: 'You have already uploaded this exact image.' });
      }

      // Generate new unique name with .png extension
      const baseName = path.basename(req.file.filename, path.extname(req.file.filename));
      const newFilename = `${baseName}-transparent.png`;
      const newPath = path.join(path.dirname(req.file.path), newFilename);
      
      // Write the isolated PNG to disk
      fs.writeFileSync(newPath, transparentBuffer);
      
      // Delete original uploaded file
      try {
        fs.unlinkSync(req.file.path);
      } catch (err) {
        console.warn('Failed to delete original file temp path:', err.message);
      }
      
      // Update req.file details
      req.file.path = newPath;
      req.file.filename = newFilename;
      req.file.mimetype = 'image/png';
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

