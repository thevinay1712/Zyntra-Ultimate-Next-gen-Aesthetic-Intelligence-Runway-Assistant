const express = require('express');
const auth = require('../middleware/auth');
const Outfit = require('../models/Outfit');

const router = express.Router();

// POST /api/outfits — Save new outfit
router.post('/', auth, async (req, res) => {
  try {
    const { name, items, occasion, season } = req.body;

    if (!name || !items?.top || !items?.bottom) {
      return res.status(400).json({ message: 'Outfit name, top, and bottom are required' });
    }

    // Check if the user has already saved this exact clothing combination
    const existing = await Outfit.findOne({
      userId: req.userId,
      'items.top': items.top,
      'items.bottom': items.bottom,
      'items.shoes': items.shoes || null,
      'items.outerwear': items.outerwear || null,
      'items.accessory': items.accessory || null,
    });

    if (existing) {
      return res.status(400).json({ 
        message: `You have already saved this exact outfit combination as "${existing.name}".` 
      });
    }

    const outfit = await Outfit.create({
      userId: req.userId,
      name,
      items,
      occasion,
      season,
    });

    res.status(201).json({ outfit });
  } catch (err) {
    console.error('Create outfit error:', err);
    res.status(500).json({ message: 'Failed to create outfit' });
  }
});

// GET /api/outfits — Get all user's outfits
router.get('/', auth, async (req, res) => {
  try {
    const outfits = await Outfit.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.json({ outfits });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch outfits' });
  }
});

// DELETE /api/outfits/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const outfit = await Outfit.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!outfit) return res.status(404).json({ message: 'Outfit not found' });
    res.json({ message: 'Outfit deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete outfit' });
  }
});

module.exports = router;
