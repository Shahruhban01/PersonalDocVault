/**
 * @fileoverview Validation schemas for Folder operations.
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

const folderCreateRules = [
  body('encryptedName').notEmpty().withMessage('Encrypted folder name is required.'),
  body('parentFolderId').optional({ nullable: true }).isMongoId().withMessage('Parent folder ID must be a valid ObjectId.'),
  body('icon').optional().isString().withMessage('Icon identifier must be a string.'),
  body('color').optional().isString().withMessage('Color theme parameter must be a string.'),
  validate
];

const folderUpdateRules = [
  body('encryptedName').optional().notEmpty().withMessage('Encrypted name cannot be empty.'),
  body('icon').optional().isString().withMessage('Icon identifier must be a string.'),
  body('color').optional().isString().withMessage('Color theme parameter must be a string.'),
  validate
];

module.exports = {
  folderCreateRules,
  folderUpdateRules
};
