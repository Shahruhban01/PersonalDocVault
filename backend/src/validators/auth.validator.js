const { body, validationResult } = require('express-validator');
const AppError = require('../utils/app-error');

/**
 * Common request validation formatter returning standard operational errors if rules fail.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }

  const extractedErrors = [];
  errors.array().map(err => extractedErrors.push({ [err.path]: err.msg }));

  next(new AppError('Invalid payload parameter specifications.', 400, 'VALIDATION_FAILED', extractedErrors));
};

const registerRules = [
  body('email').isEmail().withMessage('Please provide a valid email address.').normalizeEmail(),
  body('password').isLength({ min: 64, max: 64 }).withMessage('Password must be a 64-character hex authentication hash.'),
  body('encryptionSalt').isLength({ min: 32, max: 32 }).withMessage('Encryption salt must be a 32-character hex key salt.'),
  validate
];

const loginRules = [
  body('email').isEmail().withMessage('Please provide a valid email address.').normalizeEmail(),
  body('password').notEmpty().withMessage('Password cannot be empty.'),
  validate
];

module.exports = {
  registerRules,
  loginRules
};
