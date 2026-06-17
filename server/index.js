require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');

// Import routes
const authRoutes = require('./routes/auth');
const clothingRoutes = require('./routes/clothing');
const outfitRoutes = require('./routes/outfits');
const recommendRoutes = require('./routes/recommendations');
const imageSearchRoutes = require('./routes/imagesearch');
const tryOnRoutes = require('./routes/tryon');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded images as static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// Serve default try-on templates
app.use('/models', express.static(path.join(__dirname, '..', 'VirtualTryOn', 'models')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/clothing', clothingRoutes);
app.use('/api/outfits', outfitRoutes);
app.use('/api/recommend', recommendRoutes);
app.use('/api/imagesearch', imageSearchRoutes);
app.use('/api/tryon', tryOnRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', name: 'Zyntra – AI Wardrobe & Outfit Stylist', version: '1.0.0', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Zyntra – Ultimate Next-gen Aesthetic Intelligence & Runway Assistant`);
  console.log(`📁 Uploads served from /uploads`);
  console.log(`🔗 API base: http://localhost:${PORT}/api\n`);
});
