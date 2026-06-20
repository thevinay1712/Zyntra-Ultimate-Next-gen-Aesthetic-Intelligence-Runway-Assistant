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
  const checkItemOccasionCompat = (item, occasionId) => {
    if (!occasionId) return 0;
    const cleanOccasion = occasionId.toLowerCase().trim();
    
    if (item.occasion?.map(o => o.toLowerCase()).includes(cleanOccasion)) {
      return 0;
    }
    
    if (cleanOccasion === 'formal') {
      if (item.aesthetic === 'Activewear') return -45;
      if (item.aesthetic === 'Streetwear') return -25;
      
      const lowerName = item.name.toLowerCase();
      if (lowerName.includes('tshirt') || lowerName.includes('t-shirt') || lowerName.includes('hoodie') || lowerName.includes('sweatpants') || lowerName.includes('jogger') || lowerName.includes('shorts') || lowerName.includes('jersey') || lowerName.includes('activewear')) {
        return -35;
      }
    }
    
    if (cleanOccasion === 'sport') {
      if (item.aesthetic === 'Formal') return -45;
      
      const lowerName = item.name.toLowerCase();
      if (lowerName.includes('blazer') || lowerName.includes('suit') || lowerName.includes('oxford') || lowerName.includes('loafer') || lowerName.includes('trousers') || lowerName.includes('heels')) {
        return -35;
      }
    }
    
    if (cleanOccasion === 'party') {
      if (item.aesthetic === 'Activewear') return -25;
    }

    if (cleanOccasion === 'casual') {
      if (item.aesthetic === 'Formal') return -20;
      const lowerName = item.name.toLowerCase();
      if (lowerName.includes('blazer') || lowerName.includes('suit') || lowerName.includes('tuxedo')) {
        return -40; // Avoid blazers for casual outings like "school" or "cafe"
      }
    }
    
    return 0;
  };

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

      // Apply compatibility penalty
      score += checkItemOccasionCompat(top, occasion);
      score += checkItemOccasionCompat(bottom, occasion);

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
      let bestShoeScore = -999;
      for (const shoe of shoes) {
        let shoeScore = colorHarmonyScore(shoe.color?.primary, top.color?.primary) * 0.3 +
          colorHarmonyScore(shoe.color?.primary, bottom.color?.primary) * 0.3;
        if (shoe.occasion?.includes(occasion)) shoeScore += 20;
        
        shoeScore += checkItemOccasionCompat(shoe, occasion);
        
        if (shoeScore > bestShoeScore) {
          bestShoeScore = shoeScore;
          bestShoe = shoe;
        }
      }

      // Pick optional outerwear
      let bestOuterwear = null;
      let bestOwScore = -999;
      for (const ow of outerwear) {
        let owScore = colorHarmonyScore(ow.color?.primary, top.color?.primary) * 0.5;
        if (ow.season?.includes(season)) owScore += 30;
        
        owScore += checkItemOccasionCompat(ow, occasion);
        
        if (owScore > bestOwScore) {
          bestOwScore = owScore;
          bestOuterwear = ow;
        }
      }

      // Pick optional accessory
      let bestAccessory = null;
      let bestAccScore = -999;
      if (accessories.length > 0) {
        for (const acc of accessories) {
          let accScore = colorHarmonyScore(acc.color?.primary, top.color?.primary) * 0.5;
          if (acc.occasion?.includes(occasion)) accScore += 20;
          
          accScore += checkItemOccasionCompat(acc, occasion);
          
          if (accScore > bestAccScore) {
            bestAccScore = accScore;
            bestAccessory = acc;
          }
        }
      }

      const isOuterwearAppropriate = season === 'winter' || season === 'fall' || occasion.toLowerCase().trim() === 'formal';
      const items = {
        top: top,
        bottom: bottom,
      };
      if (bestShoe && bestShoeScore > 0) items.shoes = bestShoe;
      if (bestOuterwear && isOuterwearAppropriate && bestOwScore > 40) items.outerwear = bestOuterwear;
      if (bestAccessory && bestAccScore > 0) items.accessory = bestAccessory;

      outfits.push({
        items,
        score: Math.max(40, Math.min(Math.round(score), 99)),
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
