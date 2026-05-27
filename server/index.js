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

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/clothing', clothingRoutes);
app.use('/api/outfits', outfitRoutes);
app.use('/api/recommend', recommendRoutes);
app.use('/api/imagesearch', imageSearchRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', name: 'Zyntra API', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Zyntra API running on http://localhost:${PORT}`);
  console.log(`📁 Uploads served from /uploads`);
  console.log(`🔗 API base: http://localhost:${PORT}/api\n`);
});
