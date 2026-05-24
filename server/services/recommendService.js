const Clothing = require('../models/Clothing');
const { colorHarmonyScore, getColorNote } = require('../utils/colorHarmony');

/**
 * AI Recommendation Engine
 * Generates outfit suggestions based on:
 * 1. Color harmony (color theory rules)
 * 2. Occasion matching
 * 3. Season matching
 * 4. Style variety (avoids repeating same items)
 */
async function generateRecommendations(userId, { occasion = 'casual', season, limit = 5 }) {
  // Fetch user's wardrobe
  const clothes = await Clothing.find({ userId });

  const tops = clothes.filter((c) => c.category === 'tops');
  const bottoms = clothes.filter((c) => c.category === 'bottoms');
  const shoes = clothes.filter((c) => c.category === 'shoes');
  const outerwear = clothes.filter((c) => c.category === 'outerwear');
  const accessories = clothes.filter((c) => c.category === 'accessories');

  if (tops.length === 0 || bottoms.length === 0) {
    return [];
  }

  const outfits = [];

  // Generate all top-bottom combinations and score them
  for (const top of tops) {
    for (const bottom of bottoms) {
      let score = 0;
      let reasons = [];

      // 1. Color harmony (0-100, weighted heavily)
      const colorScore = colorHarmonyScore(top.color?.primary, bottom.color?.primary);
      score += colorScore * 0.4;

      // 2. Occasion match
      const topOccasionMatch = top.occasion?.includes(occasion);
      const bottomOccasionMatch = bottom.occasion?.includes(occasion);
      if (topOccasionMatch && bottomOccasionMatch) {
        score += 25;
        reasons.push('occasion match');
      } else if (topOccasionMatch || bottomOccasionMatch) {
        score += 12;
      }

      // 3. Season match
      if (season) {
        const topSeasonMatch = top.season?.includes(season);
        const bottomSeasonMatch = bottom.season?.includes(season);
        if (topSeasonMatch && bottomSeasonMatch) {
          score += 20;
          reasons.push('season match');
        } else if (topSeasonMatch || bottomSeasonMatch) {
          score += 8;
        }
      } else {
        score += 10; // No season filter, neutral bonus
      }

      // 4. Variety bonus (less worn items get a boost)
      const avgWearCount = (top.wearCount + bottom.wearCount) / 2;
      if (avgWearCount < 3) score += 10;
      if (avgWearCount === 0) score += 5;

      // Determine best reason label
      let reason = 'style mix';
      if (colorScore >= 85) reason = 'color harmony';
      else if (topOccasionMatch && bottomOccasionMatch) reason = occasion;
      else if (reasons.length > 0) reason = reasons[0];

      // Pick best matching shoes
      let bestShoe = null;
      let bestShoeScore = 0;
      for (const shoe of shoes) {
        let shoeScore = colorHarmonyScore(shoe.color?.primary, top.color?.primary) * 0.3 +
          colorHarmonyScore(shoe.color?.primary, bottom.color?.primary) * 0.3;
        if (shoe.occasion?.includes(occasion)) shoeScore += 20;
        if (shoeScore > bestShoeScore) {
          bestShoeScore = shoeScore;
          bestShoe = shoe;
        }
      }

      // Pick optional outerwear
      let bestOuterwear = null;
      if (season === 'winter' || season === 'fall') {
        let bestOwScore = 0;
        for (const ow of outerwear) {
          let owScore = colorHarmonyScore(ow.color?.primary, top.color?.primary) * 0.5;
          if (ow.season?.includes(season)) owScore += 30;
          if (owScore > bestOwScore) {
            bestOwScore = owScore;
            bestOuterwear = ow;
          }
        }
      }

      // Pick optional accessory
      let bestAccessory = null;
      if (accessories.length > 0) {
        let bestAccScore = 0;
        for (const acc of accessories) {
          let accScore = colorHarmonyScore(acc.color?.primary, top.color?.primary) * 0.5;
          if (acc.occasion?.includes(occasion)) accScore += 20;
          if (accScore > bestAccScore) {
            bestAccScore = accScore;
            bestAccessory = acc;
          }
        }
      }

      const items = {
        top: top,
        bottom: bottom,
      };
      if (bestShoe) items.shoes = bestShoe;
      if (bestOuterwear) items.outerwear = bestOuterwear;
      if (bestAccessory) items.accessory = bestAccessory;

      outfits.push({
        items,
        score: Math.min(Math.round(score), 99),
        reason,
        colorNote: getColorNote(top.color?.primary, bottom.color?.primary),
      });
    }
  }

  // Sort by score descending, return top results
  outfits.sort((a, b) => b.score - a.score);

  // Remove duplicate top-bottom combos and return top N
  const seen = new Set();
  const unique = [];
  for (const outfit of outfits) {
    const key = `${outfit.items.top._id}-${outfit.items.bottom._id}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(outfit);
    }
    if (unique.length >= limit) break;
  }

  return unique;
}

module.exports = { generateRecommendations };
