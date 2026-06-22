const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  action: {
    type: String,
    required: true
  },
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['success', 'failure'],
    required: true
  },
  details: {
    type: String,
    default: ''
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

AuditLogSchema.index({ userId: 1, timestamp: -1 });
AuditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 31536000 }); // TTL to delete after 1 year (31536000 sec)

module.exports = mongoose.model('AuditLog', AuditLogSchema);
