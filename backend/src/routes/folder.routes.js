const express = require('express');
const router = express.Router();

const folderController = require('../controllers/folder.controller');
const { protect } = require('../middlewares/auth.middleware');
const { apiLimiter } = require('../middlewares/rate-limiter');
const { folderCreateRules, folderUpdateRules } = require('../validators/folder.validator');

// Require authentication and rate limiter
router.use(protect);
router.use(apiLimiter);

// Folder endpoints
router.post('/', folderCreateRules, folderController.createFolder);
router.get('/', folderController.listFolders);
router.get('/:id', folderController.getFolderDetails);
router.put('/:id', folderUpdateRules, folderController.updateFolder);
router.delete('/:id', folderController.deleteFolder);

module.exports = router;
