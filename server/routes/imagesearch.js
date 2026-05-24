const express = require('express');
const auth = require('../middleware/auth');

const router = express.Router();

// ============================================================
// CURATED REAL UNSPLASH PHOTO IDs — guaranteed to load
// Format: images.unsplash.com/photo-{ID}?auto=format&fit=crop&w=600&q=80
// ============================================================
const PHOTO_POOLS = {
  tops: [
    '1596755094514-f87e34085b2c',
    '1521572267360-ee0c2909d518',
    '1556821840-3a63f95609a7',
    '1620799140408-edc6dcb6d633',
    '1529374255404-311a2a4f1fd9',
    '1583743814966-8d4d0ec82421',
    '1603252109303-2751441dd157',
    '1618354691321-601f57e011b9',
    '1562157873-818bc0726f68',
    '1598033129183-9c1f4b65e673',
    '1611911813383-53f8cc0f17af',
    '1489987707025-afc232f7ea0f',
    '1542060748-10c7f0d859e4',
    '1609545614026-1c07d7c5df7d',
    '1593030761757-71fae45fa0e7',
  ],
  bottoms: [
    '1541099649105-f69ad21f3246',
    '1624378439575-d8705ad7ae80',
    '1506629082925-6fc6c9850d7e',
    '1473966968600-fa801b869a1a',
    '1582552938357-32b906df40cb',
    '1604176354204-926874887a76',
    '1542574621-e088a4464cc4',
    '1598554747436-c9293d6a588f',
    '1548624313-65feca2a5a27',
    '1542272604-787c3835535d',
    '1585386959984-a4155224a1ad',
    '1473945521523-9c7bda5e68e4',
  ],
  shoes: [
    '1542291026-7eec264c27ff',
    '1491553895911-0055eca6402d',
    '1608256246200-53e635b5b65f',
    '1520639888713-7851133b1ed0',
    '1543508282-6319a3ca2e62',
    '1600185365926-3a2ce3cbe9eb',
    '1516478177764-9fe5bd7e9717',
    '1605408499391-6368c628ef42',
    '1587563609-e5fc8e0eb7e9',
    '1525966222134-84801746b408',
    '1549298916-b41d501d3772',
    '1562183241-840b8af0721e',
  ],
  outerwear: [
    '1551028719-00167b16eac5',
    '1591047139829-d91aecb6caea',
    '1548883354-7622d03aca27',
    '1611312449412-6cefac5dc3e4',
    '1544022613-e87e84560a3a',
    '1576566588028-4147f3842f27',
    '1578681994506-b8f463906a3a',
    '1539533018543-3f9926ca0d67',
    '1507679799987-c73779587ccf',
    '1519657742478-6f4a68c7cb52',
    '1548375861-f5a3ba1e2f06',
    '1601601392655-5c18c4eccc11',
  ],
  accessories: [
    '1522312346375-d1a52e2b99b3',
    '1511499767150-a48a237f0083',
    '1624222247344-550fb8ecf7db',
    '1553062407-98eeb64c6a62',
    '1606760227091-3dd870d97f1d',
    '1548036328-c9fa89d128fa',
    '1617038260897-41a533ab2d84',
    '1542060215-1e84b17cf8a6',
    '1588864608498-22a2c17a1b54',
    '1591561954555-07c96c92bde6',
    '1523170335258-f87a2d362d29',
    '1508214751196-bcfd4ca60f91',
  ],
};

/**
 * Deterministic shuffle based on query string so same query = same results
 * but different enough from other queries
 */
function seededShuffle(arr, seed) {
  const a = [...arr];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const j = Math.abs(s) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function strToSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(31, h) + str.charCodeAt(i);
  }
  return h;
}

function extractBrand(query) {
  const knownBrands = [
    'nike', 'adidas', "levi's", 'levis', 'zara', 'gucci', 'casio', 'rolex',
    'champion', 'dickies', 'supreme', 'carhartt', 'hermes', 'puma', 'reebok',
    'h&m', 'uniqlo', 'gap', 'uspa', 'us polo', 'calvin klein', 'tommy hilfiger',
    'armani', 'versace', 'burberry', 'balenciaga', 'off-white', 'converse', 'vans',
    'peter england', 'allen solly', 'arrow', 'raymond', 'wrangler', 'pepe',
  ];
  const lower = query.toLowerCase();
  for (const brand of knownBrands) {
    if (lower.includes(brand)) {
      return brand.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
  }
  const words = query.trim().split(/\s+/);
  if (words[0] && words[0].length > 2) {
    return words[0].charAt(0).toUpperCase() + words[0].slice(1);
  }
  return 'Catalog';
}

function formatTitle(query, suffix) {
  const clean = query.split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  return `${clean} ${suffix}`;
}

/**
 * GET /api/imagesearch?q=levis+jeans&category=bottoms
 */
router.get('/', auth, (req, res) => {
  const { q, category } = req.query;

  if (!q || q.trim().length < 2) {
    return res.status(400).json({ message: 'Query too short' });
  }

  const query = q.trim();
  const cat = PHOTO_POOLS[category] ? category : 'tops';
  const pool = PHOTO_POOLS[cat];
  const brand = extractBrand(query);

  // Deterministically pick 6 unique photos based on query
  const seed = strToSeed(query.toLowerCase());
  const shuffled = seededShuffle(pool, seed);
  const picked = shuffled.slice(0, 6);

  const labels = [
    '– Classic Fit',
    '– Premium Style',
    '– Minimalist Look',
    '– Street Edition',
    '– Trending Pick',
    '– Essential',
  ];

  const BASE = 'https://images.unsplash.com/photo-';
  const results = picked.map((id, i) => ({
    id: `result-${i}`,
    title: formatTitle(query, labels[i] || ''),
    brand,
    url: `${BASE}${id}?auto=format&fit=crop&w=600&q=80`,
    thumb: `${BASE}${id}?auto=format&fit=crop&w=300&q=70`,
    description: query,
    credit: 'Unsplash',
    creditUrl: 'https://unsplash.com',
  }));

  res.json({ results });
});

module.exports = router;
