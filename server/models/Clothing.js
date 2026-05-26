const mongoose = require('mongoose');

const clothingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: [true, 'Item name is required'],
    trim: true,
  },
  category: {
    type: String,
    required: true,
    enum: ['tops', 'bottoms', 'shoes', 'outerwear', 'accessories'],
  },
  subcategory: {
    type: String,
    trim: true,
    default: '',
  },
  color: {
    primary: { type: String, default: '#888888' },
    secondary: { type: String, default: '' },
    palette: [String],
  },
  season: [{
    type: String,
    enum: ['spring', 'summer', 'fall', 'winter'],
  }],
  occasion: [{
    type: String,
    enum: ['casual', 'formal', 'sport', 'party'],
  }],
  imageUrl: {
    type: String,
    required: true,
  },
  imageHash: {
    type: String,
    default: '',
    index: true,
  },
  brand: {
    type: String,
    trim: true,
    default: '',
  },
  tags: [String],
  wearCount: {
    type: Number,
    default: 0,
  },
  lastWorn: Date,
  uploadQuality: {
    type: String,
    enum: ['Good', 'Medium', 'Bad'],
    default: 'Good'
  },
  aesthetic: {
    type: String,
    enum: ['Streetwear', 'Casual', 'Formal', 'Minimal', 'Activewear'],
    default: 'Casual'
  },
  pattern: {
    type: String,
    enum: ['Solid', 'Striped', 'Graphic', 'Patterned'],
    default: 'Solid'
  },
  fit: {
    type: String,
    enum: ['Loose', 'Slim', 'Oversized', 'Regular'],
    default: 'Regular'
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Clothing', clothingSchema);
