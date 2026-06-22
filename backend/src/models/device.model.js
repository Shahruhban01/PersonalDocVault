const mongoose = require('mongoose');

const DeviceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  deviceFingerprint: {
    type: String,
    required: true
  },
  deviceName: {
    type: String,
    default: 'Generic Device'
  },
  os: {
    type: String,
    enum: ['iOS', 'Android', 'macOS', 'Windows', 'Linux', 'Web'],
    required: true
  },
  pushToken: {
    type: String,
    default: null
  },
  isTrusted: {
    type: Boolean,
    default: false
  },
  lastActiveAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// A user can only register a fingerprint once.
DeviceSchema.index({ userId: 1, deviceFingerprint: 1 }, { unique: true });

module.exports = mongoose.model('Device', DeviceSchema);
