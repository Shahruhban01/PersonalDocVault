const mongoose = require('mongoose');
const vaultItemRepository = require('../repositories/vault-item.repository');
const folderRepository = require('../repositories/folder.repository');
const storageService = require('./storage.service');
const AppError = require('../utils/app-error');

class VaultService {
  /**
   * Create a new folder.
   * @param {string} userId - Owner ID.
   * @param {object} folderData - Folder parameters (encryptedName, parentFolderId, icon, color).
   * @returns {Promise<import('mongoose').Document>}
   */
  async createFolder(userId, folderData) {
    const { encryptedName, parentFolderId, icon, color } = folderData;

    // If nesting, verify parent exists and belongs to this user
    if (parentFolderId) {
      const parentFolder = await folderRepository.findById(parentFolderId);
      if (!parentFolder || parentFolder.userId.toString() !== userId.toString()) {
        throw new AppError('The specified parent folder does not exist or access is denied.', 404, 'PARENT_FOLDER_NOT_FOUND');
      }
    }

    return folderRepository.create({
      userId,
      encryptedName,
      parentFolderId,
      icon,
      color
    });
  }

  /**
   * Create a document and upload its binary payload to Cloudflare R2.
   * @param {string} userId - Owner ID.
   * @param {object} itemDetails - Metadata specifications.
   * @param {Express.Multer.File} file - Uploaded binary file.
   * @returns {Promise<import('mongoose').Document>}
   */
  async createDocument(userId, itemDetails, file) {
    const { encryptedTitle, encryptedFileName, categoryId, folderId, encryptedPayload, checksum } = itemDetails;

    if (!file) {
      throw new AppError('A valid file binary is required for document creations.', 400, 'FILE_REQUIRED');
    }

    // Verify folder ownership if provided
    if (folderId) {
      const folder = await folderRepository.findById(folderId);
      if (!folder || folder.userId.toString() !== userId.toString()) {
        throw new AppError('Access to specified folder is denied.', 403, 'FOLDER_ACCESS_DENIED');
      }
    }

    // Generate unique R2 path
    const fileId = new mongoose.Types.ObjectId();
    const r2Key = `users/${userId}/documents/${fileId}_enc.bin`;

    // Stream upload to R2
    await storageService.uploadFile(r2Key, file.buffer, file.mimetype);

    // Parse encryptedPayload if it arrives as a JSON string from FormData
    let parsedPayload = {};
    if (encryptedPayload) {
      try {
        parsedPayload = typeof encryptedPayload === 'string'
          ? JSON.parse(encryptedPayload)
          : encryptedPayload;
      } catch (_) {
        parsedPayload = encryptedPayload;
      }
    }

    // Save to Database
    return vaultItemRepository.create({
      userId,
      folderId: folderId || null,
      type: 'document',
      encryptedTitle,
      encryptedPayload: parsedPayload,
      fileMetadata: {
        r2Key,
        // Store the encrypted original filename (with extension) if provided,
        // otherwise fall back to the display title
        encryptedFileName: encryptedFileName || encryptedTitle,
        fileMimeType: file.mimetype,
        fileSize: file.size,
        checksum
      }
    });
  }

  /**
   * Create a card credentials object.
   * @param {string} userId - User ID.
   * @param {object} cardDetails - Card parameters.
   * @returns {Promise<import('mongoose').Document>}
   */
  async createCard(userId, cardDetails) {
    const { encryptedTitle, encryptedPayload, cardBrand, folderId } = cardDetails;

    return vaultItemRepository.create({
      userId,
      folderId: folderId || null,
      type: 'card',
      encryptedTitle,
      encryptedPayload,
      cardBrand
    });
  }

  /**
   * Create a secure text note.
   * @param {string} userId - User ID.
   * @param {object} noteDetails - Note parameters.
   * @returns {Promise<import('mongoose').Document>}
   */
  async createNote(userId, noteDetails) {
    const { encryptedTitle, encryptedBody, folderId } = noteDetails;

    return vaultItemRepository.create({
      userId,
      folderId: folderId || null,
      type: 'note',
      encryptedTitle,
      encryptedPayload: { encryptedBody }
    });
  }

  /**
   * Delete a vault item. Removes binary storage objects if they exist.
   * @param {string} userId - User ID.
   * @param {string} itemId - Item ID.
   * @returns {Promise<void>}
   */
  async deleteItem(userId, itemId) {
    const item = await vaultItemRepository.findById(itemId);
    if (!item || item.userId.toString() !== userId.toString()) {
      throw new AppError('The requested item was not found or access is denied.', 404, 'ITEM_NOT_FOUND');
    }

    // If item has R2 file attachments, delete binary block
    if (item.type === 'document' && item.fileMetadata && item.fileMetadata.r2Key) {
      await storageService.deleteFile(item.fileMetadata.r2Key);
    }

    await vaultItemRepository.deleteById(itemId);
  }

  /**
   * Delete a folder. Supports orphan or cascade item deletion modes.
   * @param {string} userId - User ID.
   * @param {string} folderId - Folder ID.
   * @param {string} [mode='orphan'] - Deletion mode: 'orphan' or 'cascade'.
   * @returns {Promise<void>}
   */
  async deleteFolder(userId, folderId, mode = 'orphan') {
    const folder = await folderRepository.findById(folderId);
    if (!folder || folder.userId.toString() !== userId.toString()) {
      throw new AppError('The requested folder was not found or access is denied.', 404, 'FOLDER_NOT_FOUND');
    }

    if (mode === 'orphan') {
      // Set folderId to null for all items inside this folder
      await vaultItemRepository.model.updateMany(
        { userId, folderId },
        { $set: { folderId: null } }
      ).exec();

      // Set parentFolderId to null for all nested sub-folders
      await folderRepository.model.updateMany(
        { userId, parentFolderId: folderId },
        { $set: { parentFolderId: null } }
      ).exec();
    } else if (mode === 'cascade') {
      // Retrieve and recursively delete nested sub-folders
      const subFolders = await folderRepository.findByUserAndParent(userId, folderId);
      for (const sub of subFolders) {
        await this.deleteFolder(userId, sub._id, 'cascade');
      }

      // Retrieve and delete all items directly inside this folder
      const items = await vaultItemRepository.findUserItems(userId, { folderId });
      for (const item of items) {
        await this.deleteItem(userId, item._id);
      }
    }

    await folderRepository.deleteById(folderId);
  }

  /**
   * Fetch vault items for a user with optional filter constraints.
   * @param {string} userId - User ID.
   * @param {object} [filters={}] - Query filters.
   * @returns {Promise<Array<import('mongoose').Document>>}
   */
  async listItems(userId, filters = {}) {
    const cleanFilters = {};
    if (filters.type) cleanFilters.type = filters.type;
    if (filters.folderId !== undefined) {
      cleanFilters.folderId = filters.folderId === 'null' || filters.folderId === null ? null : filters.folderId;
    }
    if (filters.isFavorite !== undefined) {
      cleanFilters.isFavorite = filters.isFavorite === 'true' || filters.isFavorite === true;
    }
    return vaultItemRepository.findUserItems(userId, cleanFilters);
  }

  /**
   * Update a vault item with validation.
   * @param {string} userId - Owner ID.
   * @param {string} itemId - Item ID.
   * @param {object} updateData - Key/value edits.
   * @returns {Promise<import('mongoose').Document>}
   */
  async updateItem(userId, itemId, updateData) {
    const item = await vaultItemRepository.findById(itemId);
    if (!item || item.userId.toString() !== userId.toString()) {
      throw new AppError('The requested item was not found or access is denied.', 404, 'ITEM_NOT_FOUND');
    }

    // Verify folder ownership if moving item
    if (updateData.folderId && updateData.folderId !== 'null' && updateData.folderId !== '') {
      const folder = await folderRepository.findById(updateData.folderId);
      if (!folder || folder.userId.toString() !== userId.toString()) {
        throw new AppError('The specified destination folder does not exist or access is denied.', 404, 'FOLDER_NOT_FOUND');
      }
    }

    const allowedUpdates = ['encryptedTitle', 'folderId', 'isFavorite', 'encryptedPayload', 'cardBrand'];
    allowedUpdates.forEach(key => {
      if (updateData[key] !== undefined) {
        if (key === 'folderId' && (updateData[key] === 'null' || updateData[key] === '')) {
          item.folderId = null;
        } else {
          item[key] = updateData[key];
        }
      }
    });

    return item.save();
  }
}

module.exports = new VaultService();
