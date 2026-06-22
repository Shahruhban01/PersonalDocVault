const express = require('express');
const router = express.Router();

const adminController = require('../controllers/admin.controller');
const { protect, restrictTo } = require('../middlewares/auth.middleware');
const { userStatusUpdateRules } = require('../validators/admin.validator');
const { apiLimiter } = require('../middlewares/rate-limiter');

// Protect all administrative endpoints
router.use(protect);
router.use(restrictTo('admin'));
router.use(apiLimiter);

// Admin endpoints
router.get('/users', adminController.listUsers);
router.put('/users/:id/status', userStatusUpdateRules, adminController.updateUserStatus);
router.get('/logs', adminController.listAuditLogs);
router.get('/statistics', adminController.getStatistics);

module.exports = router;
