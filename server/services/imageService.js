const Vibrant = require('node-vibrant');

/**
 * Extract dominant colors from an image file
 * @param {string} imagePath - Path to the image file
 * @returns {Object} Color data with primary, secondary, and palette
 */
async function extractColors(imagePath) {
  try {
    const palette = await Vibrant.from(imagePath).getPalette();

    const swatches = [
      palette.Vibrant,
      palette.DarkVibrant,
      palette.LightVibrant,
      palette.Muted,
      palette.DarkMuted,
      palette.LightMuted,
    ].filter(Boolean);

    if (swatches.length === 0) {
      return { primary: '#888888', secondary: '', palette: [] };
    }

    // Sort by population (most dominant first)
    swatches.sort((a, b) => b.population - a.population);

    const primary = swatches[0].hex;
    const secondary = swatches.length > 1 ? swatches[1].hex : '';
    const colorPalette = swatches.slice(0, 5).map((s) => s.hex);

    return { primary, secondary, palette: colorPalette };
  } catch (err) {
    console.warn('Color extraction error:', err.message);
    return { primary: '#888888', secondary: '', palette: [] };
  }
}

module.exports = { extractColors };
