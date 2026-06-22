const vaultService = require('../../src/services/vault.service');
const vaultItemRepository = require('../../src/repositories/vault-item.repository');
const folderRepository = require('../../src/repositories/folder.repository');
const storageService = require('../../src/services/storage.service');

// Mock dependencies
jest.mock('../../src/repositories/vault-item.repository');
jest.mock('../../src/repositories/folder.repository');
jest.mock('../../src/services/storage.service');

describe('VaultService - Folder Deletion Unit Tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('deleteFolder', () => {
    it('should throw an error if the folder is not found or not owned by user', async () => {
      folderRepository.findById.mockResolvedValue(null);

      await expect(
        vaultService.deleteFolder('user_id', 'folder_id', 'orphan')
      ).rejects.toThrow('The requested folder was not found or access is denied.');

      expect(folderRepository.findById).toHaveBeenCalledWith('folder_id');
      expect(folderRepository.deleteById).not.toHaveBeenCalled();
    });

    it('should orphan children folders and items if mode is orphan', async () => {
      folderRepository.findById.mockResolvedValue({
        _id: 'folder_id',
        userId: 'user_id'
      });

      // Mock updateMany methods inside repositories
      const mockUpdateMany = jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue({}) });
      vaultItemRepository.model = { updateMany: mockUpdateMany };
      folderRepository.model = { updateMany: mockUpdateMany };

      await vaultService.deleteFolder('user_id', 'folder_id', 'orphan');

      expect(mockUpdateMany).toHaveBeenCalledTimes(2);
      expect(folderRepository.deleteById).toHaveBeenCalledWith('folder_id');
    });

    it('should recursively cascade delete folders and items if mode is cascade', async () => {
      folderRepository.findById.mockResolvedValue({
        _id: 'folder_id',
        userId: 'user_id'
      });

      // Sub-folders returned: empty for simple test
      folderRepository.findByUserAndParent.mockResolvedValue([]);

      // Items inside: one document
      vaultItemRepository.findUserItems.mockResolvedValue([
        {
          _id: 'item_id_1',
          type: 'document',
          fileMetadata: { r2Key: 'key_1' }
        }
      ]);

      // Mock deletion endpoints
      vaultItemRepository.findById.mockResolvedValue({
        _id: 'item_id_1',
        userId: 'user_id',
        type: 'document',
        fileMetadata: { r2Key: 'key_1' }
      });
      storageService.deleteFile.mockResolvedValue(null);
      vaultItemRepository.deleteById.mockResolvedValue({});
      folderRepository.deleteById.mockResolvedValue({});

      await vaultService.deleteFolder('user_id', 'folder_id', 'cascade');

      expect(folderRepository.findByUserAndParent).toHaveBeenCalledWith('user_id', 'folder_id');
      expect(vaultItemRepository.findUserItems).toHaveBeenCalledWith('user_id', { folderId: 'folder_id' });
      expect(storageService.deleteFile).toHaveBeenCalledWith('key_1');
      expect(vaultItemRepository.deleteById).toHaveBeenCalledWith('item_id_1');
      expect(folderRepository.deleteById).toHaveBeenCalledWith('folder_id');
    });
  });
});
