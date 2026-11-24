const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const connectDB = require('./config/db');
const os = require('os');

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

// LAN IP endpoint for mobile AR QR code
app.get('/api/network-ip', (req, res) => {
  const interfaces = os.networkInterfaces();
  let bestIp = '127.0.0.1';
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        if (net.address.startsWith('192.168.')) {
          return res.json({ ip: net.address });
        }
        bestIp = net.address;
      }
    }
  }
  res.json({ ip: bestIp });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/clothing', clothingRoutes);
app.use('/api/outfits', outfitRoutes);
app.use('/api/recommend', recommendRoutes);
app.use('/api/imagesearch', imageSearchRoutes);
app.use('/api/tryon', tryOnRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', name: 'Zyntra', version: '1.0.0', timestamp: new Date().toISOString() });
});

// Serve static client assets in production
const clientDist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ message: 'API route not found' });
    }
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

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
