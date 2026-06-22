/**
 * @fileoverview Vault Controller handling documents, cards, and notes REST actions.
 */

const vaultService = require('../services/vault.service');
const vaultItemRepository = require('../repositories/vault-item.repository');
const storageService = require('../services/storage.service');
const AppError = require('../utils/app-error');

/**
 * Upload a document file and save its metadata.
 */
const uploadDocument = async (req, res, next) => {
  try {
    const document = await vaultService.createDocument(req.user._id, req.body, req.file);
    res.status(201).json({
      success: true,
      data: {
        documentId: document._id,
        encryptedTitle: document.encryptedTitle,
        fileMetadata: {
          fileMimeType: document.fileMetadata.fileMimeType,
          fileSize: document.fileMetadata.fileSize
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add a credit/debit card credential.
 */
const createCard = async (req, res, next) => {
  try {
    const card = await vaultService.createCard(req.user._id, req.body);
    res.status(201).json({
      success: true,
      data: {
        cardId: card._id,
        encryptedTitle: card.encryptedTitle,
        cardBrand: card.cardBrand
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a secure note entry.
 */
const createNote = async (req, res, next) => {
  try {
    const note = await vaultService.createNote(req.user._id, req.body);
    res.status(201).json({
      success: true,
      data: {
        noteId: note._id,
        encryptedTitle: note.encryptedTitle
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Fetch a short-lived presigned download URL for a document.
 */
const getDownloadUrl = async (req, res, next) => {
  try {
    const item = await vaultItemRepository.findById(req.params.id);
    if (!item || item.userId.toString() !== req.user._id.toString()) {
      return next(new AppError('The requested document was not found or access is denied.', 404, 'DOCUMENT_NOT_FOUND'));
    }

    if (item.type !== 'document' || !item.fileMetadata || !item.fileMetadata.r2Key) {
      return next(new AppError('The requested item does not possess associated binary file streams.', 400, 'NO_FILE_ATTACHED'));
    }

    const downloadUrl = await storageService.getPresignedDownloadUrl(item.fileMetadata.r2Key);
    res.status(200).json({
      success: true,
      data: {
        downloadUrl
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a vault item (purges database records and removes storage keys).
 */
const deleteItem = async (req, res, next) => {
  try {
    await vaultService.deleteItem(req.user._id, req.params.id);
    res.status(200).json({
      success: true,
      message: 'Item successfully deleted.'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve user's vault items list matching optional filters.
 */
const listItems = async (req, res, next) => {
  try {
    const items = await vaultService.listItems(req.user._id, req.query);
    res.status(200).json({
      success: true,
      data: items.map(item => ({
        id: item._id,
        type: item.type,
        encryptedTitle: item.encryptedTitle,
        folderId: item.folderId,
        isFavorite: item.isFavorite,
        cardBrand: item.cardBrand,
        encryptedPayload: item.encryptedPayload,
        fileMetadata: item.fileMetadata ? {
          fileMimeType: item.fileMetadata.fileMimeType,
          fileSize: item.fileMetadata.fileSize,
          encryptedFileName: item.fileMetadata.encryptedFileName
        } : null,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
      }))
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update an existing vault item details.
 */
const updateItem = async (req, res, next) => {
  try {
    const updated = await vaultService.updateItem(req.user._id, req.params.id, req.body);
    res.status(200).json({
      success: true,
      message: 'Item updated successfully.',
      data: {
        id: updated._id,
        type: updated.type,
        encryptedTitle: updated.encryptedTitle,
        folderId: updated.folderId,
        isFavorite: updated.isFavorite,
        cardBrand: updated.cardBrand,
        encryptedPayload: updated.encryptedPayload
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadDocument,
  createCard,
  createNote,
  getDownloadUrl,
  deleteItem,
  listItems,
  updateItem
};
