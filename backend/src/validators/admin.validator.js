/**
 * @fileoverview Request validation schemas for Administrative operations.
 */

const { body, validationResult } = require('express-validator');
const AppError = require('../utils/app-error');

/**
 * Standard formatter mapping express-validator errors to standard AppError envelopes.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }

  const extractedErrors = [];
  errors.array().map(err => extractedErrors.push({ [err.path]: err.msg }));

  next(new AppError('Invalid payload specifications.', 400, 'VALIDATION_FAILED', extractedErrors));
};

const userStatusUpdateRules = [
  body('status').isIn(['active', 'suspended', 'pending_verification']).withMessage('Invalid user status parameter.'),
  validate
];

module.exports = {
  userStatusUpdateRules
};
