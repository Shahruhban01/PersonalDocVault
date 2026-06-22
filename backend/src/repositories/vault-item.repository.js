const BaseRepository = require('./base.repository');
const VaultItem = require('../models/vault-item.model');

class VaultItemRepository extends BaseRepository {
  constructor() {
    super(VaultItem);
  }

  /**
   * Fetch vault items belonging to a user with optional filter constraints.
   * @param {string} userId - User ID.
   * @param {object} [filters={}] - Optional query filters (type, folderId, isFavorite).
   * @returns {Promise<Array<import('mongoose').Document>>}
   */
  async findUserItems(userId, filters = {}) {
    const query = { userId, ...filters };
    return this.find(query, '', { createdAt: -1 });
  }

  /**
   * Fetch favorite items for a specific user.
   * @param {string} userId - User ID.
   * @returns {Promise<Array<import('mongoose').Document>>}
   */
  async findFavorites(userId) {
    return this.find({ userId, isFavorite: true }, '', { createdAt: -1 });
  }
}

module.exports = new VaultItemRepository();
