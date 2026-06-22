const mongoose = require('mongoose');

const FolderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  parentFolderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder',
    default: null
  },
  encryptedName: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    default: 'folder'
  },
  color: {
    type: String,
    default: '#3498db'
  }
}, {
  timestamps: true
});

FolderSchema.index({ userId: 1, parentFolderId: 1 });

module.exports = mongoose.model('Folder', FolderSchema);
