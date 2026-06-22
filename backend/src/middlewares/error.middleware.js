/**
 * @fileoverview Express global error handling pipeline integrating Winston logging.
 */

const logger = require('../config/logger');

/**
 * Handle operational errors vs system crashes, returning structured envelopes.
 */
const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';
  err.code = err.code || 'INTERNAL_SERVER_ERROR';

  // Format log properties
  const logContext = {
    message: err.message,
    statusCode: err.statusCode,
    code: err.code,
    path: req.originalUrl,
    method: req.method,
    ip: req.ip,
    stack: err.stack
  };

  if (err.statusCode >= 500) {
    logger.error('Unexpected crash captured:', logContext);
  } else {
    logger.warn('Operational error captured:', logContext);
  }

  // Development VS Production response variations
  if (process.env.NODE_ENV === 'development') {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details || [],
        stack: err.stack
      }
    });
  } else {
    // Production Mode: Do not leak detailed stacks
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.isOperational ? err.message : 'An unexpected error occurred on the server.'
      }
    });
  }
};

module.exports = globalErrorHandler;
