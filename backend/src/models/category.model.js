const mongoose = require('mongoose');

const DocumentCategorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  isSystem: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

DocumentCategorySchema.index({ userId: 1 });

module.exports = mongoose.model('DocumentCategory', DocumentCategorySchema);
