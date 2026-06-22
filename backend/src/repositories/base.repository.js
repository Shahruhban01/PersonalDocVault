/**
 * @fileoverview Base Repository class defining common database interactions.
 */

class BaseRepository {
  /**
   * Create a BaseRepository.
   * @param {import('mongoose').Model} model - The Mongoose Model.
   */
  constructor(model) {
    this.model = model;
  }

  /**
   * Create a new document.
   * @param {object} item - Document details.
   * @returns {Promise<import('mongoose').Document>}
   */
  async create(item) {
    return this.model.create(item);
  }

  /**
   * Find a document by ID.
   * @param {string} id - Document ID.
   * @param {string|object} [populate] - Populate configurations.
   * @returns {Promise<import('mongoose').Document|null>}
   */
  async findById(id, populate = '') {
    return this.model.findById(id).populate(populate).exec();
  }

  /**
   * Find a single matching document.
   * @param {object} filter - Query filter.
   * @param {string|object} [populate] - Populate configurations.
   * @returns {Promise<import('mongoose').Document|null>}
   */
  async findOne(filter, populate = '') {
    return this.model.findOne(filter).populate(populate).exec();
  }

  /**
   * Find multiple matching documents.
   * @param {object} filter - Query filter.
   * @param {string|object} [populate] - Populate configurations.
   * @param {object} [sort={}] - Sort sorting definitions.
   * @param {number} [limit=0] - Limit constraints.
   * @param {number} [skip=0] - Offset metrics.
   * @returns {Promise<Array<import('mongoose').Document>>}
   */
  async find(filter, populate = '', sort = {}, limit = 0, skip = 0) {
    let query = this.model.find(filter).populate(populate).sort(sort);
    if (skip > 0) query = query.skip(skip);
    if (limit > 0) query = query.limit(limit);
    return query.exec();
  }

  /**
   * Update a document by ID.
   * @param {string} id - Document ID.
   * @param {object} item - Properties to modify.
   * @returns {Promise<import('mongoose').Document|null>}
   */
  async updateById(id, item) {
    return this.model.findByIdAndUpdate(id, item, { new: true, runValidators: true }).exec();
  }

  /**
   * Delete a document by ID.
   * @param {string} id - Document ID.
   * @returns {Promise<import('mongoose').Document|null>}
   */
  async deleteById(id) {
    return this.model.findByIdAndDelete(id).exec();
  }
}

module.exports = BaseRepository;
