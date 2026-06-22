/**
 * @fileoverview Custom operational error class for standardizing HTTP error responses.
 */

/**
 * Standardized operational error representing issues that are known and handled by the app.
 * @extends Error
 */
class AppError extends Error {
  /**
   * Create an AppError.
   * @param {string} message - Human-readable error message.
   * @param {number} statusCode - HTTP Status code (e.g., 400, 401, 403, 404).
   * @param {string} code - Machine-readable error code (e.g., 'BAD_REQUEST', 'UNAUTHORIZED').
   * @param {Array<object>} [details=[]] - Optional list of payload validation details.
   */
  constructor(message, statusCode, code, details = []) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.code = code;
    this.details = details;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
