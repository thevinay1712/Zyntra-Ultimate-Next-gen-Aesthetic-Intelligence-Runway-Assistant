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
You are Zyntra, an elite virtual personal fashion stylist. Write a highly concise, elegant styling critique for the user's outfit.
Keep your critique strictly to 2 short sentences (maximum 40-50 words total). Focus on why this coordinate is sophisticated and occasion-ready. 
Address the user directly and warmly. Do not mention any instructions, tags, or system details.
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

// Helper for local validation & template fallback
const runLocalValidation = (destination, temp, condition, season) => {
  const query = destination.toLowerCase().trim();
  
  // 1. Off-topic/inappropriate location keywords
  const offTopicKeywords = ['toilet', 'bathroom', 'restroom', 'washroom', 'wc', 'poop', 'pee', 'shit', 'urinal', 'garbage', 'trash', 'dumpster', 'sewer', 'sewage', 'lavatory', 'commode'];
  const isOffTopic = offTopicKeywords.some(keyword => {
    const regex = new RegExp(`\\b${keyword}\\w*\\b`, 'i');
    return regex.test(query);
  });

  if (isOffTopic) {
    return {
      valid: false,
      message: `"${destination}" is not a suitable outing location for Zyntra AI wardrobe styling. Please enter a standard location or activity (e.g. Cafe, Office, Gym, Party, Dinner).`
    };
  }

  // 2. Gibberish detection rules:
  // - Check for words > 3 characters with 0 vowels
  const words = query.split(/\s+/);
  for (const word of words) {
    // Only check if it's purely letters
    if (/^[a-zA-Z]+$/.test(word) && word.length > 3) {
      const hasVowels = /[aeiouy]/i.test(word);
      if (!hasVowels) {
        return {
          valid: false,
          message: `"${destination}" seems to be gibberish or unrecognized. Please enter a real location or activity (e.g., Office, Gym, Cafe with friends).`
        };
      }
    }
  }

  // - Too many repeated consecutive characters (e.g. "aaaaa", "ssdfg" etc)
  if (/(.)\1{3,}/.test(query)) {
    return {
      valid: false,
      message: `"${destination}" contains too many repeated characters. Please enter a real location or activity.`
    };
  }

  // - Random key smash strings (consonant clusters longer than 4 chars e.g. "sdfgh", "rtgfd")
  const consonantClusters = query.match(/[^aeiouy\s]{5,}/g);
  if (consonantClusters) {
    return {
      valid: false,
      message: `"${destination}" contains unrecognized consonant combinations. Please enter a real location or activity.`
    };
  }

  // 3. Simple classification based on keyword matching
  let category = 'casual';
  if (query.includes('office') || query.includes('work') || query.includes('business') || query.includes('meeting') || query.includes('interview') || query.includes('conference') || query.includes('formal') || query.includes('suit')) {
    category = 'formal';
  } else if (query.includes('gym') || query.includes('workout') || query.includes('run') || query.includes('sport') || query.includes('active') || query.includes('train') || query.includes('trek') || query.includes('hike') || query.includes('climb') || query.includes('football') || query.includes('soccer') || query.includes('fit')) {
    category = 'sport';
  } else if (query.includes('party') || query.includes('club') || query.includes('night') || query.includes('bar') || query.includes('pub') || query.includes('celebrat') || query.includes('festive') || query.includes('dance') || query.includes('concert')) {
    category = 'party';
  }

  // 4. Generate dynamic template-based advice
  let advice = '';
  const parsedTemp = parseFloat(temp) || 22;
  const isCold = parsedTemp < 15;
  const cond = (condition || '').toLowerCase();
  const isRainy = cond.includes('rain') || cond.includes('shower') || cond.includes('storm') || cond.includes('drizzle');

  if (category === 'formal') {
    advice = `For your formal event at "${destination}", dress professionally. `;
    if (isCold) {
      advice += `Under ${temp}°C conditions, we suggest a tailored trench coat or thick blazer layered over a structured shirt, paired with smart trousers and premium leather shoes.`;
    } else if (isRainy) {
      advice += `With wet weather outdoors, layer a breathable blazer over your shirt and wear water-resistant dress boots to stay clean and sharp.`;
    } else {
      advice += `Opt for a lightweight linen or cotton blazer, matching trousers, and clean oxfords to stay cool yet elegant.`;
    }
  } else if (category === 'sport') {
    advice = `Heading out for sports/activewear to "${destination}". `;
    if (isCold) {
      advice += `At a chilly ${temp}°C, a high-performance thermal compression top paired with tech fleece joggers and trainers is ideal.`;
    } else if (isRainy) {
      advice += `Under wet conditions, wear a water-repellent windbreaker, sweat-wicking active pants, and grippy running shoes.`;
    } else {
      advice += `Keep it light with a breathable athletic tee, sweat-wicking training shorts, and your favorite active sneakers.`;
    }
  } else if (category === 'party') {
    advice = `Getting ready for a night out/party at "${destination}"! `;
    if (isCold) {
      advice += `Stay warm yet stylish in a premium leather jacket layered over a smart fitted top, paired with dark jeans or a chic skirt and boots.`;
    } else if (isRainy) {
      advice += `Keep your look pristine with an aesthetic outer shell jacket, tailored bottoms, and stylish leather footwear to resist the elements.`;
    } else {
      advice += `Opt for a sleek statement shirt, tailored trousers or shorts, and trendy sneakers to stand out under the lights.`;
    }
  } else {
    advice = `Perfect day for a casual trip to "${destination}". `;
    if (isCold) {
      advice += `For the ${temp}°C chilly weather, cozy up in a warm knitted sweater or hoodie, styled with comfortable denim jeans and casual trainers.`;
    } else if (isRainy) {
      advice += `Bring along a stylish water-resistant windbreaker or light utility jacket over a comfortable tee, paired with casual boots.`;
    } else {
      advice += `Enjoy the clear day in a classic graphic tee, casual cargo pants or shorts, and minimal canvas sneakers.`;
    }
  }

  return {
    valid: true,
    category,
    advice
  };
};

// POST /api/recommend/analyze-destination — Analyze typed destination for gibberish and generate styling guidance
router.post('/analyze-destination', auth, async (req, res) => {
  try {
    const { destination, temp, condition, season } = req.body;
    
    if (!destination || !destination.trim()) {
      return res.json({ valid: true, category: 'casual', advice: 'Please specify where you are going today to receive styling advice.' });
    }

    // 1. Run local validation checks first
    const localCheck = runLocalValidation(destination, temp, condition, season);
    if (!localCheck.valid) {
      return res.json(localCheck);
    }

    const token = process.env.HF_API_TOKEN;
    if (!token || token.startsWith('your_')) {
      // Return local template fallback immediately if HF API Token is not ready
      return res.json(localCheck);
    }

    const systemPrompt = `You are Zyntra AI, an elite fashion destination analyzer. 
Analyze the user's typed destination: "${destination}".
Your response must be a valid JSON object. Do not include any markdown styling, conversational text, or explanation.

Determine if the destination is "gibberish" (meaningless letters like "asdfg", "xyz", random numbers, or words completely unrelated to an activity/event/location where someone would go wearing clothes).

If it is gibberish, return this JSON:
{
  "valid": false,
  "message": "We couldn't recognize your destination. Please enter a real location or activity (e.g., Office, Gym, Cafe with friends)."
}

If it is valid:
1. Classify the activity/destination into one of these standard categories: "casual", "formal", "sport", "party".
2. Write a highly specific, unique, and personalized fashion advice paragraph (2-3 sentences max) detailing the styling prep guidelines for the activity under the weather "${temp}°C, ${condition}" and season "${season || 'Auto'}". Suggest appropriate layering, fabric choices, or styles suitable for both the activity and the weather. Address the user directly and warmly.

Return this JSON format:
{
  "valid": true,
  "category": "classified_category_here",
  "advice": "your_styling_advice_paragraph_here"
}`;

    const prompt = `<|begin_of_text|><|start_header_id|>system<|end_header_id|>
${systemPrompt}
<|eot_id|><|start_header_id|>user<|end_header_id|>
Analyze the destination: "${destination}"
Weather: ${temp}°C, ${condition}
Season Filter: ${season || 'Auto'}
<|eot_id|><|start_header_id|>assistant<|end_header_id|>`;

    try {
      const response = await fetch('https://api-inference.huggingface.co/models/meta-llama/Meta-Llama-3-8B-Instruct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: 250,
            temperature: 0.3,
            top_p: 0.9,
            return_full_text: false
          }
        }),
        timeout: 6000
      });

      if (!response.ok) {
        throw new Error(`Hugging Face API returned status: ${response.status}`);
      }

      const data = await response.json();
      let text = '';
      if (Array.isArray(data) && data[0] && data[0].generated_text) {
        text = data[0].generated_text.trim();
      } else if (data.generated_text) {
        text = data.generated_text.trim();
      } else {
        throw new Error('Unexpected response format from Hugging Face');
      }

      text = text.replace(/<\|eot_id\|>|Assistant:/gi, '').trim();

      let parsedResult;
      try {
        const startIdx = text.indexOf('{');
        const endIdx = text.lastIndexOf('}');
        if (startIdx !== -1 && endIdx !== -1) {
          const jsonString = text.substring(startIdx, endIdx + 1);
          parsedResult = JSON.parse(jsonString);
        } else {
          parsedResult = JSON.parse(text);
        }
      } catch (parseErr) {
        console.warn('JSON parsing failed for text:', text);
        parsedResult = localCheck;
      }

      res.json(parsedResult);
    } catch (apiErr) {
      console.warn('Hugging Face API failed, falling back to local guidance:', apiErr.message);
      res.json(localCheck);
    }
  } catch (err) {
    console.error('Destination analysis error:', err);
    res.status(500).json({ message: 'Failed to analyze destination' });
  }
});

module.exports = router;


