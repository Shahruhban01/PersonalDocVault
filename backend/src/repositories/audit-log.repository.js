const BaseRepository = require('./base.repository');
const AuditLog = require('../models/audit-log.model');

class AuditLogRepository extends BaseRepository {
  constructor() {
    super(AuditLog);
  }

  /**
   * Find paginated audit logs sorted by timestamp descending.
   * @param {object} filter - Query filter.
   * @param {number} limit - Limit counts.
   * @param {number} skip - Offset metrics.
   * @returns {Promise<Array<import('mongoose').Document>>}
   */
  async findPaginatedLogs(filter, limit, skip) {
    return this.find(filter, 'userId', { timestamp: -1 }, limit, skip);
  }

  /**
   * Count total log matching filters.
   * @param {object} filter - Query filter.
   * @returns {Promise<number>}
   */
  async countLogs(filter) {
    return this.model.countDocuments(filter).exec();
  }
}

module.exports = new AuditLogRepository();
