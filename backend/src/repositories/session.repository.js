const BaseRepository = require('./base.repository');
const Session = require('../models/session.model');

class SessionRepository extends BaseRepository {
  constructor() {
    super(Session);
  }

  /**
   * Find session by active refresh token hash.
   * @param {string} tokenHash - Hashed token string.
   * @returns {Promise<import('mongoose').Document|null>}
   */
  async findByTokenHash(tokenHash) {
    return this.findOne({ refreshTokenHash: tokenHash, isRevoked: false });
  }

  /**
   * Revoke all sessions for a specific user.
   * @param {string} userId - User ID.
   * @returns {Promise<object>} - Write Result.
   */
  async revokeSessionsForUser(userId) {
    return this.model.updateMany(
      { userId, isRevoked: false },
      { $set: { isRevoked: true } }
    ).exec();
  }
}

module.exports = new SessionRepository();
