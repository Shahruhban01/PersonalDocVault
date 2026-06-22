const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  encryptionSalt: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  mfaEnabled: {
    type: Boolean,
    default: false
  },
  mfaSecret: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'pending_verification'],
    default: 'active'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', UserSchema);
