const express = require('express');
const auth = require('../middleware/auth');
const { generateRecommendations } = require('../services/recommendService');

const router = express.Router();

// GET /api/recommend
router.get('/', auth, async (req, res) => {
  try {
    const { occasion = 'casual', season, limit = 5 } = req.query;

    const recommendations = await generateRecommendations(req.userId, {
      occasion,
      season,
      limit: parseInt(limit),
    });

    res.json({ recommendations });
  } catch (err) {
    console.error('Recommendation error:', err);
    res.status(500).json({ message: 'Failed to generate recommendations' });
  }
});

module.exports = router;
