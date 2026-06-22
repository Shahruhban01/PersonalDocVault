/**
 * @fileoverview Validation schemas for Vault operations (Documents, Cards, Notes).
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

const documentUploadRules = [
  body('encryptedTitle').notEmpty().withMessage('Encrypted title is required.'),
  body('categoryId').isMongoId().withMessage('Valid document category ID is required.'),
  body('folderId').optional({ nullable: true }).isMongoId().withMessage('Folder ID must be a valid ObjectId.'),
  body('checksum').isLength({ min: 64, max: 64 }).withMessage('Valid SHA-256 checksum string is required.'),
  validate
];

const cardCreateRules = [
  body('encryptedTitle').notEmpty().withMessage('Encrypted title is required.'),
  body('cardBrand').isIn(['visa', 'mastercard', 'amex', 'rupay', 'other']).withMessage('Invalid card brand type.'),
  body('folderId').optional({ nullable: true }).isMongoId().withMessage('Folder ID must be a valid ObjectId.'),
  body('encryptedPayload').isObject().withMessage('Encrypted payload object is required.'),
  body('encryptedPayload.cardholderName_enc').notEmpty().withMessage('Encrypted cardholder name is required.'),
  body('encryptedPayload.cardNumber_enc').notEmpty().withMessage('Encrypted card number is required.'),
  body('encryptedPayload.expiryDate_enc').notEmpty().withMessage('Encrypted expiry date is required.'),
  body('encryptedPayload.cvv_enc').notEmpty().withMessage('Encrypted CVV is required.'),
  validate
];

const noteCreateRules = [
  body('encryptedTitle').notEmpty().withMessage('Encrypted title is required.'),
  body('encryptedBody').notEmpty().withMessage('Encrypted body string is required.'),
  body('folderId').optional({ nullable: true }).isMongoId().withMessage('Folder ID must be a valid ObjectId.'),
  validate
];

const itemUpdateRules = [
  body('encryptedTitle').optional().notEmpty().withMessage('Encrypted title cannot be empty if provided.'),
  body('folderId').optional({ nullable: true }).isMongoId().withMessage('Folder ID must be a valid ObjectId.'),
  body('isFavorite').optional().isBoolean().withMessage('isFavorite must be a boolean flag.'),
  body('encryptedPayload').optional().isObject().withMessage('Encrypted payload must be an object.'),
  validate
];

module.exports = {
  documentUploadRules,
  cardCreateRules,
  noteCreateRules,
  itemUpdateRules
};
