const BaseRepository = require('./base.repository');
const Folder = require('../models/folder.model');

class FolderRepository extends BaseRepository {
  constructor() {
    super(Folder);
  }

  /**
   * Find folders belonging to a user under a specific parent folder.
   * @param {string} userId - User ID.
   * @param {string|null} parentFolderId - Parent folder identifier.
   * @returns {Promise<Array<import('mongoose').Document>>}
   */
  async findByUserAndParent(userId, parentFolderId) {
    return this.find({ userId, parentFolderId });
  }

  /**
   * Fetch all folders owned by a specific user.
   * @param {string} userId - User ID.
   * @returns {Promise<Array<import('mongoose').Document>>}
   */
  async findUserFolders(userId) {
    return this.find({ userId }, '', { createdAt: -1 });
  }
}

module.exports = new FolderRepository();
