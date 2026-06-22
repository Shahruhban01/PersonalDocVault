const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  refreshTokenHash: {
    type: String,
    required: true,
    unique: true
  },
  ipAddress: {
    type: String,
    default: '0.0.0.0'
  },
  userAgent: {
    type: String,
    default: 'unknown'
  },
  expiresAt: {
    type: Date,
    required: true
  },
  isRevoked: {
    type: Boolean,
    default: false,
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Session', SessionSchema);
