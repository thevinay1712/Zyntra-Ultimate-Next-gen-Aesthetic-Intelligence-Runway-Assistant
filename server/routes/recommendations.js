const express = require('express');
const auth = require('../middleware/auth');
const { generateRecommendations } = require('../services/recommendService');
const fetch = require('node-fetch');

const router = express.Router();

// GET /api/recommend — Fetch local matching rules suggestions
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

// POST /api/recommend/stylist-critique — Free Generative LLM Stylist Critique using Hugging Face Serverless Llama-3
router.post('/stylist-critique', auth, async (req, res) => {
  try {
    const { top, bottom, outerwear, shoes, accessory, temp, condition, occasion } = req.body;

    const token = process.env.HF_API_TOKEN;
    if (!token || token.startsWith('your_')) {
      return res.status(400).json({ message: 'HF_API_TOKEN is not configured' });
    }

    // Formulate a beautiful prompt for the LLM
    const itemsDescription = [
      `Top: ${top?.name} (Aesthetic: ${top?.aesthetic || 'Casual'}, Pattern: ${top?.pattern || 'Solid'}, Color: ${top?.color?.primary || 'Neutral'})`,
      `Bottom: ${bottom?.name} (Aesthetic: ${bottom?.aesthetic || 'Casual'}, Pattern: ${bottom?.pattern || 'Solid'}, Color: ${bottom?.color?.primary || 'Neutral'})`
    ];
    if (outerwear) itemsDescription.push(`Outerwear: ${outerwear.name} (Aesthetic: ${outerwear.aesthetic || 'Casual'}, Color: ${outerwear.color?.primary || 'Neutral'})`);
    if (shoes) itemsDescription.push(`Footwear: ${shoes.name} (Aesthetic: ${shoes.aesthetic || 'Casual'}, Color: ${shoes.color?.primary || 'Neutral'})`);
    if (accessory) itemsDescription.push(`Accessory: ${accessory.name} (Aesthetic: ${accessory.aesthetic || 'Casual'}, Color: ${accessory.color?.primary || 'Neutral'})`);

    const prompt = `<|begin_of_text|><|start_header_id|>system<|end_header_id|>
You are Zyntra, an elite virtual personal fashion stylist. Write a highly creative, sophisticated, and engaging styling critique for the user's selected outfit. 
Keep your critique strictly between 3 to 4 sentences, focusing on the visual synergy, color harmony, and weather appropriateness.
Address the user directly and warmly. Do not mention system prompts, tokens, or coordinates.
<|eot_id|><|start_header_id|>user<|end_header_id|>
Outfit Items:
${itemsDescription.join('\n')}

Occasion: ${occasion}
Current Weather: ${temp}°C, ${condition}

Stylist Critique:
<|eot_id|><|start_header_id|>assistant<|end_header_id|>`;

    console.log('🔮 Sending prompt to Hugging Face Llama-3 Serverless API...');
    const response = await fetch('https://api-inference.huggingface.co/models/meta-llama/Meta-Llama-3-8B-Instruct', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: 180,
          temperature: 0.7,
          top_p: 0.9,
          return_full_text: false
        }
      }),
      timeout: 8000 // 8 seconds timeout
    });

    if (!response.ok) {
      throw new Error(`Hugging Face API returned status: ${response.status}`);
    }

    const data = await response.json();
    let critiqueText = '';
    
    if (Array.isArray(data) && data[0] && data[0].generated_text) {
      critiqueText = data[0].generated_text.trim();
    } else if (data.generated_text) {
      critiqueText = data.generated_text.trim();
    } else {
      throw new Error('Unexpected response format from Hugging Face');
    }

    // Clean up any trailing chat markers if returned by model
    critiqueText = critiqueText.replace(/<\|eot_id\|>|Assistant:|Stylist Critique:/gi, '').trim();

    res.json({ critique: critiqueText });
  } catch (err) {
    console.error('LLM Stylist API error:', err.message);
    res.status(500).json({ message: err.message || 'LLM generation failed' });
  }
});

module.exports = router;
