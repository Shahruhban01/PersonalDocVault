/**
 * @fileoverview Auth Service for managing registrations, logons, sessions, and credentials.
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const userRepository = require('../repositories/user.repository');
const sessionRepository = require('../repositories/session.repository');
const AppError = require('../utils/app-error');

class AuthService {
  /**
   * Register a new user.
   * @param {object} userData - Properties including email, password (pre-hashed authKey), and salt.
   * @returns {Promise<import('mongoose').Document>}
   */
  async register(userData) {
    const { email, password, encryptionSalt } = userData;

    // Check if user already exists
    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      throw new AppError('An account with this email address already exists.', 400, 'USER_EXISTS');
    }

    // Hash the password (pre-hashed from client)
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    return userRepository.create({
      email,
      password: passwordHash,
      encryptionSalt
    });
  }

  /**
   * Log in user, returning token structures.
   * @param {string} email - User Email.
   * @param {string} password - Client-derived key.
   * @param {object} [clientMetadata={}] - IP, userAgent metadata.
   * @returns {Promise<object>}
   */
  async login(email, password, clientMetadata = {}) {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
    }

    if (user.status === 'suspended') {
      throw new AppError('This account has been suspended by administrators.', 403, 'ACCOUNT_SUSPENDED');
    }

    // Verify bcrypt password match
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
    }

    // If user has MFA enabled, return request state
    if (user.mfaEnabled) {
      const tempToken = jwt.sign(
        { userId: user._id, mfaRequired: true },
        process.env.JWT_SECRET,
        { expiresIn: '5m' }
      );
      return { mfaRequired: true, tempToken };
    }

    return this.generateUserSession(user, clientMetadata);
  }

  /**
   * Generate access and refresh tokens.
   * @param {import('mongoose').Document} user - User document.
   * @param {object} clientMetadata - Client IP/Agent context.
   * @returns {Promise<object>}
   */
  async generateUserSession(user, clientMetadata) {
    const accessToken = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    const rawRefreshToken = crypto.randomBytes(40).toString('hex');
    const refreshTokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');

    // Store session in MongoDB
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 Days
    await sessionRepository.create({
      userId: user._id,
      refreshTokenHash,
      ipAddress: clientMetadata.ipAddress,
      userAgent: clientMetadata.userAgent,
      expiresAt
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      encryptionSalt: user.encryptionSalt,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        name: user.name || '',
        avatar: user.avatar || 'avatar_1'
      }
    };
  }

  /**
   * Refresh the access token using a refresh token.
   * @param {string} rawRefreshToken - Placed in HTTP cookie.
   * @param {object} clientMetadata - IP, agent context.
   * @returns {Promise<object>}
   */
  async refreshSession(rawRefreshToken, clientMetadata) {
    const hash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
    const session = await sessionRepository.findByTokenHash(hash);
    if (!session) {
      throw new AppError('Invalid or expired session.', 401, 'INVALID_SESSION');
    }

    if (new Date() > session.expiresAt) {
      session.isRevoked = true;
      await session.save();
      throw new AppError('Session expired.', 401, 'SESSION_EXPIRED');
    }

    const user = await userRepository.findById(session.userId);
    if (!user || user.status === 'suspended') {
      throw new AppError('User profile no longer exists or is suspended.', 403, 'ACCESS_DENIED');
    }

    // Rotate refresh token: revoke current, issue new
    session.isRevoked = true;
    await session.save();

    return this.generateUserSession(user, clientMetadata);
  }

  /**
   * Log out and revoke session.
   * @param {string} rawRefreshToken - Active refresh token.
   * @returns {Promise<void>}
   */
  async logout(rawRefreshToken) {
    const hash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
    const session = await sessionRepository.findByTokenHash(hash);
    if (session) {
      session.isRevoked = true;
      await session.save();
    }
  }

  /**
   * Update user profile details.
   * @param {string} userId - User ID.
   * @param {object} profileData - Properties containing name and/or avatar.
   * @returns {Promise<import('mongoose').Document>}
   */
  async updateProfile(userId, profileData) {
    const { name, avatar } = profileData;
    const update = {};
    if (name !== undefined) update.name = name;
    if (avatar !== undefined) update.avatar = avatar;

    const user = await userRepository.updateById(userId, update);
    if (!user) {
      throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
    }
    return user;
  }

  /**
   * Change user password credentials.
   * @param {string} userId - User ID.
   * @param {string} newPasswordHash - The SHA-256 pre-hashed authKey from client.
   * @returns {Promise<import('mongoose').Document>}
   */
  async changePassword(userId, newPasswordHash) {
    // Generate bcrypt hash of the SHA-256 pre-hashed authKey
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(newPasswordHash, salt);

    const user = await userRepository.updateById(userId, { password: passwordHash });
    if (!user) {
      throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
    }
    return user;
  }
}

module.exports = new AuthService();
