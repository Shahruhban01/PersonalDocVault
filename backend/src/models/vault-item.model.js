const mongoose = require('mongoose');

const VaultItemSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  folderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder',
    default: null
  },
  type: {
    type: String,
    enum: ['document', 'card', 'note', 'password_note'],
    required: true
  },
  encryptedTitle: {
    type: String,
    required: true
  },
  encryptedTags: [{
    type: String
  }],
  isFavorite: {
    type: Boolean,
    default: false
  },
  encryptedPayload: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  fileMetadata: {
    r2Key: {
      type: String,
      default: null
    },
    encryptedFileName: {
      type: String,
      default: null
    },
    fileMimeType: {
      type: String,
      default: null
    },
    fileSize: {
      type: Number,
      default: 0
    },
    checksum: {
      type: String,
      default: null
    }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('VaultItem', VaultItemSchema);
