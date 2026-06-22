const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { registerRules, loginRules } = require('../validators/auth.validator');
const { protect } = require('../middlewares/auth.middleware');
const { authLimiter } = require('../middlewares/rate-limiter');

router.post('/register', authLimiter, registerRules, authController.register);
router.post('/login', authLimiter, loginRules, authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', protect, authController.logout);

module.exports = router;
