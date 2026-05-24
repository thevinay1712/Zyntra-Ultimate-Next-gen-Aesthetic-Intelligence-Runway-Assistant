/**
 * Color Harmony Utilities
 * Used by the recommendation engine to score outfit color combinations
 */

/**
 * Convert hex to HSL
 */
function hexToHSL(hex) {
  hex = hex.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

/**
 * Check if two colors are complementary (opposite on color wheel)
 */
function isComplementary(hex1, hex2) {
  const hsl1 = hexToHSL(hex1);
  const hsl2 = hexToHSL(hex2);
  const diff = Math.abs(hsl1.h - hsl2.h);
  return diff >= 150 && diff <= 210;
}

/**
 * Check if two colors are analogous (close on color wheel)
 */
function isAnalogous(hex1, hex2) {
  const hsl1 = hexToHSL(hex1);
  const hsl2 = hexToHSL(hex2);
  const diff = Math.abs(hsl1.h - hsl2.h);
  return diff <= 30 || diff >= 330;
}

/**
 * Check if a color is neutral (low saturation)
 */
function isNeutral(hex) {
  const hsl = hexToHSL(hex);
  return hsl.s < 15 || hsl.l < 15 || hsl.l > 90;
}

/**
 * Score two colors for harmony (0-100)
 */
function colorHarmonyScore(hex1, hex2) {
  if (!hex1 || !hex2) return 50;

  // Neutral + anything = good
  if (isNeutral(hex1) || isNeutral(hex2)) return 85;

  // Same color family = good
  if (isAnalogous(hex1, hex2)) return 80;

  // Complementary = great
  if (isComplementary(hex1, hex2)) return 90;

  // Otherwise moderate
  const hsl1 = hexToHSL(hex1);
  const hsl2 = hexToHSL(hex2);
  const hueDiff = Math.abs(hsl1.h - hsl2.h);

  // Triadic (120° apart) = decent
  if ((hueDiff >= 110 && hueDiff <= 130) || (hueDiff >= 230 && hueDiff <= 250)) return 75;

  return 60;
}

/**
 * Get color harmony description
 */
function getColorNote(hex1, hex2) {
  if (!hex1 || !hex2) return 'Classic combination';

  if (isNeutral(hex1) && isNeutral(hex2)) return 'Neutral palette — timeless and versatile';
  if (isNeutral(hex1) || isNeutral(hex2)) return 'Neutral base with a color accent — always works';
  if (isComplementary(hex1, hex2)) return 'Complementary colors — bold and eye-catching';
  if (isAnalogous(hex1, hex2)) return 'Analogous harmony — smooth and cohesive';

  return 'Interesting color mix — makes a statement';
}

module.exports = { hexToHSL, isComplementary, isAnalogous, isNeutral, colorHarmonyScore, getColorNote };
