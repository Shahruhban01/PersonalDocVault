const BaseRepository = require('./base.repository');
const User = require('../models/user.model');

class UserRepository extends BaseRepository {
  constructor() {
    super(User);
  }

  /**
   * Find a user by their email address.
   * @param {string} email - Email address.
   * @returns {Promise<import('mongoose').Document|null>}
   */
  async findByEmail(email) {
    return this.findOne({ email: email.toLowerCase() });
  }

  /**
   * Update status of user.
   * @param {string} id - User ID.
   * @param {string} status - Enum status.
   * @returns {Promise<import('mongoose').Document|null>}
   */
  async updateStatus(id, status) {
    return this.updateById(id, { status });
  }
}

module.exports = new UserRepository();
