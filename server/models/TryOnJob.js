const mongoose = require('mongoose');

const tryOnJobSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  avatarId: {
    type: String,
    required: true,
  },
  itemIds: [String],              // Clothing item IDs included in this job
  aiJobId: {
    type: String,
    default: null,
    index: true,
  },
  cacheKey: {
    type: String,
    default: '',
    index: true,
  },
  status: {
    type: String,
    enum: ['queued', 'processing', 'done', 'failed'],
    default: 'queued',
  },
  progress: {
    type: String,
    default: 'Waiting in queue…',
  },
  resultUrl: {
    type: String,
    default: null,
  },
  error: {
    type: String,
    default: null,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('TryOnJob', tryOnJobSchema);
