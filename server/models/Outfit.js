const mongoose = require('mongoose');

const outfitSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: [true, 'Outfit name is required'],
    trim: true,
  },
  items: {
    top: { type: mongoose.Schema.Types.ObjectId, ref: 'Clothing' },
    bottom: { type: mongoose.Schema.Types.ObjectId, ref: 'Clothing' },
    shoes: { type: mongoose.Schema.Types.ObjectId, ref: 'Clothing' },
    outerwear: { type: mongoose.Schema.Types.ObjectId, ref: 'Clothing' },
    accessory: { type: mongoose.Schema.Types.ObjectId, ref: 'Clothing' },
  },
  occasion: String,
  season: String,
  rating: {
    type: Number,
    min: 1,
    max: 5,
    default: 3,
  },
  timesWorn: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Outfit', outfitSchema);
