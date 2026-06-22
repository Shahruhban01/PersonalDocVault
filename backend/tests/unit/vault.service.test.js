const vaultService = require('../../src/services/vault.service');
const vaultItemRepository = require('../../src/repositories/vault-item.repository');
const folderRepository = require('../../src/repositories/folder.repository');
const storageService = require('../../src/services/storage.service');

// Mock dependencies
jest.mock('../../src/repositories/vault-item.repository');
jest.mock('../../src/repositories/folder.repository');
jest.mock('../../src/services/storage.service');

describe('VaultService - Unit Tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createFolder', () => {
    it('should throw an error if parent folder does not belong to user', async () => {
      // Mock repository returning parent folder owned by someone else
      folderRepository.findById.mockResolvedValue({
        _id: 'parent_id',
        userId: 'different_user_id'
      });

      await expect(
        vaultService.createFolder('user_id', {
          encryptedName: 'New Folder',
          parentFolderId: 'parent_id'
        })
      ).rejects.toThrow('The specified parent folder does not exist or access is denied.');

      expect(folderRepository.findById).toHaveBeenCalledWith('parent_id');
      expect(folderRepository.create).not.toHaveBeenCalled();
    });

    it('should create folder successfully if parent check passes', async () => {
      folderRepository.findById.mockResolvedValue({
        _id: 'parent_id',
        userId: 'user_id'
      });
      folderRepository.create.mockResolvedValue({
        _id: 'new_folder_id',
        encryptedName: 'New Folder'
      });

      const folder = await vaultService.createFolder('user_id', {
        encryptedName: 'New Folder',
        parentFolderId: 'parent_id'
      });

      expect(folderRepository.create).toHaveBeenCalledWith({
        userId: 'user_id',
        encryptedName: 'New Folder',
        parentFolderId: 'parent_id',
        icon: undefined,
        color: undefined
      });
      expect(folder._id).toBe('new_folder_id');
    });
  });

  describe('createDocument', () => {
    it('should throw an error if file parameter is missing', async () => {
      await expect(
        vaultService.createDocument('user_id', {
          encryptedTitle: 'Title',
          categoryId: 'cat_id'
        }, null)
      ).rejects.toThrow('A valid file binary is required for document creations.');

      expect(storageService.uploadFile).not.toHaveBeenCalled();
      expect(vaultItemRepository.create).not.toHaveBeenCalled();
    });

    it('should upload encrypted file to R2 and create database entry', async () => {
      storageService.uploadFile.mockResolvedValue(null);
      vaultItemRepository.create.mockResolvedValue({
        _id: 'doc_id',
        encryptedTitle: 'Title'
      });

      const fileMock = {
        buffer: Buffer.from('data'),
        mimetype: 'application/pdf',
        size: 1024
      };

      const result = await vaultService.createDocument('user_id', {
        encryptedTitle: 'Title',
        categoryId: '60c72b9a9b1d8a23a41d5a90',
        checksum: 'checksum_hex_64_characters_hash_sha256'
      }, fileMock);

      expect(storageService.uploadFile).toHaveBeenCalled();
      expect(vaultItemRepository.create).toHaveBeenCalled();
      expect(result._id).toBe('doc_id');
    });
  });

  describe('listItems', () => {
    it('should retrieve list of items matching clean filters', async () => {
      const mockItems = [{ _id: 'item_1', encryptedTitle: 'Doc 1' }];
      vaultItemRepository.findUserItems.mockResolvedValue(mockItems);

      const result = await vaultService.listItems('user_id', {
        type: 'document',
        folderId: 'null',
        isFavorite: 'true'
      });

      expect(vaultItemRepository.findUserItems).toHaveBeenCalledWith('user_id', {
        type: 'document',
        folderId: null,
        isFavorite: true
      });
      expect(result).toBe(mockItems);
    });
  });

  describe('updateItem', () => {
    it('should throw an error if item is not found or access is denied', async () => {
      vaultItemRepository.findById.mockResolvedValue(null);

      await expect(
        vaultService.updateItem('user_id', 'item_id', { encryptedTitle: 'New Title' })
      ).rejects.toThrow('The requested item was not found or access is denied.');
    });

    it('should throw an error if folderId does not belong to user', async () => {
      vaultItemRepository.findById.mockResolvedValue({
        _id: 'item_id',
        userId: 'user_id'
      });
      folderRepository.findById.mockResolvedValue({
        _id: 'dest_folder_id',
        userId: 'other_user_id'
      });

      await expect(
        vaultService.updateItem('user_id', 'item_id', { folderId: 'dest_folder_id' })
      ).rejects.toThrow('The specified destination folder does not exist or access is denied.');
    });

    it('should update and save the item attributes successfully', async () => {
      const mockSave = jest.fn().mockImplementation(function() {
        return Promise.resolve(this);
      });
      vaultItemRepository.findById.mockResolvedValue({
        _id: 'item_id',
        userId: 'user_id',
        encryptedTitle: 'Old Title',
        isFavorite: false,
        save: mockSave
      });

      const result = await vaultService.updateItem('user_id', 'item_id', {
        encryptedTitle: 'New Title',
        isFavorite: true
      });

      expect(mockSave).toHaveBeenCalled();
      expect(result.encryptedTitle).toBe('New Title');
      expect(result.isFavorite).toBe(true);
    });
  });
});
