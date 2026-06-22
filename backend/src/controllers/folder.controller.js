/**
 * @fileoverview Folder Controller handling folders CRUD REST actions.
 */

const vaultService = require('../services/vault.service');
const folderRepository = require('../repositories/folder.repository');
const vaultItemRepository = require('../repositories/vault-item.repository');
const AppError = require('../utils/app-error');

/**
 * Create a new folder (supports nested folders).
 */
const createFolder = async (req, res, next) => {
  try {
    const folder = await vaultService.createFolder(req.user._id, req.body);
    res.status(201).json({
      success: true,
      data: {
        id: folder._id,
        encryptedName: folder.encryptedName,
        parentFolderId: folder.parentFolderId,
        icon: folder.icon,
        color: folder.color
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Fetch list of all folders belonging to the user.
 */
const listFolders = async (req, res, next) => {
  try {
    const folders = await folderRepository.findUserFolders(req.user._id);
    res.status(200).json({
      success: true,
      data: folders.map(f => ({
        id: f._id,
        encryptedName: f.encryptedName,
        parentFolderId: f.parentFolderId,
        icon: f.icon,
        color: f.color,
        createdAt: f.createdAt
      }))
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Fetch child folder directories and nested vault items inside a specific folder.
 */
const getFolderDetails = async (req, res, next) => {
  try {
    const folder = await folderRepository.findById(req.params.id);
    if (!folder || folder.userId.toString() !== req.user._id.toString()) {
      return next(new AppError('The requested folder was not found or access is denied.', 404, 'FOLDER_NOT_FOUND'));
    }

    // Retrieve child folders
    const childFolders = await folderRepository.findByUserAndParent(req.user._id, folder._id);

    // Retrieve vault items directly inside this folder
    const vaultItems = await vaultItemRepository.findUserItems(req.user._id, { folderId: folder._id });

    res.status(200).json({
      success: true,
      data: {
        id: folder._id,
        encryptedName: folder.encryptedName,
        parentFolderId: folder.parentFolderId,
        childFolders: childFolders.map(cf => ({
          id: cf._id,
          encryptedName: cf.encryptedName,
          icon: cf.icon
        })),
        vaultItems: vaultItems.map(vi => ({
          id: vi._id,
          type: vi.type,
          encryptedTitle: vi.encryptedTitle,
          isFavorite: vi.isFavorite,
          createdAt: vi.createdAt
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update folder metadata attributes.
 */
const updateFolder = async (req, res, next) => {
  try {
    const folder = await folderRepository.findById(req.params.id);
    if (!folder || folder.userId.toString() !== req.user._id.toString()) {
      return next(new AppError('The requested folder was not found or access is denied.', 404, 'FOLDER_NOT_FOUND'));
    }

    const { encryptedName, icon, color } = req.body;
    if (encryptedName) folder.encryptedName = encryptedName;
    if (icon) folder.icon = icon;
    if (color) folder.color = color;

    const updatedFolder = await folder.save();

    res.status(200).json({
      success: true,
      message: 'Folder updated successfully.',
      data: {
        id: updatedFolder._id,
        encryptedName: updatedFolder.encryptedName,
        icon: updatedFolder.icon,
        color: updatedFolder.color
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a folder (orphan or cascade items).
 */
const deleteFolder = async (req, res, next) => {
  try {
    const mode = req.query.mode || 'orphan';
    if (!['orphan', 'cascade'].includes(mode)) {
      return next(new AppError('Invalid folder deletion mode. Expected orphan or cascade.', 400, 'INVALID_MODE'));
    }

    await vaultService.deleteFolder(req.user._id, req.params.id, mode);

    res.status(200).json({
      success: true,
      message: `Folder deleted successfully in ${mode} mode.`
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createFolder,
  listFolders,
  getFolderDetails,
  updateFolder,
  deleteFolder
};
