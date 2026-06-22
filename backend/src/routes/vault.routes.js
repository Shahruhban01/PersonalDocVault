const express = require('express');
const multer = require('multer');
const router = express.Router();

const vaultController = require('../controllers/vault.controller');
const { protect } = require('../middlewares/auth.middleware');
const { apiLimiter } = require('../middlewares/rate-limiter');
const { documentUploadRules, cardCreateRules, noteCreateRules, itemUpdateRules } = require('../validators/vault.validator');

// Multer memory-buffer configuration (Up to 5MB)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Protect all vault operations
router.use(protect);
router.use(apiLimiter);

// Vault CRUD mappings
router.get('/items', vaultController.listItems);
router.post('/documents/upload', upload.single('file'), documentUploadRules, vaultController.uploadDocument);
router.post('/cards', cardCreateRules, vaultController.createCard);
router.post('/notes', noteCreateRules, vaultController.createNote);
router.get('/documents/:id/download', vaultController.getDownloadUrl);
router.put('/items/:id', itemUpdateRules, vaultController.updateItem);
router.delete('/items/:id', vaultController.deleteItem);

module.exports = router;
