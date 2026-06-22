/**
 * @fileoverview Authentication middleware to protect endpoints and authorize role assertions.
 */

const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/user.repository');
const AppError = require('../utils/app-error');

/**
 * Protect route handler verifying incoming JWT access tokens.
 */
const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new AppError('Authentication credentials are missing.', 401, 'UNAUTHORIZED'));
    }

    // Verify token validity
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return next(new AppError('Session expired. Please log in again.', 401, 'TOKEN_EXPIRED'));
      }
      return next(new AppError('Invalid authentication token.', 401, 'INVALID_TOKEN'));
    }

    // Confirm user still exists and is active
    const currentUser = await userRepository.findById(decoded.userId);
    if (!currentUser) {
      return next(new AppError('The user associated with this session no longer exists.', 401, 'USER_NOT_FOUND'));
    }

    if (currentUser.status === 'suspended') {
      return next(new AppError('Your account has been suspended.', 403, 'ACCOUNT_SUSPENDED'));
    }

    // Attach user profile to request object
    req.user = currentUser;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Restrict routes to specific user roles.
 * @param {...string} roles - Permitted roles list (e.g. 'admin', 'user').
 * @returns {Function} Express middleware.
 */
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to execute this operation.', 403, 'FORBIDDEN_ROLE'));
    }
    next();
  };
};

module.exports = {
  protect,
  restrictTo
};
