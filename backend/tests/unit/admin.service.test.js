const adminController = require('../../src/controllers/admin.controller');
const userRepository = require('../../src/repositories/user.repository');
const sessionRepository = require('../../src/repositories/session.repository');
const AppError = require('../../src/utils/app-error');

// Mock repositories
jest.mock('../../src/repositories/user.repository');
jest.mock('../../src/repositories/session.repository');
jest.mock('../../src/repositories/audit-log.repository');
jest.mock('../../src/repositories/vault-item.repository');

describe('AdminController - Unit Tests', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      params: {},
      query: {},
      body: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('updateUserStatus', () => {
    it('should throw an error if the user is not found', async () => {
      req.params.id = 'invalid_id';
      req.body.status = 'suspended';
      userRepository.findById.mockResolvedValue(null);

      await adminController.updateUserStatus(req, res, next);

      expect(userRepository.findById).toHaveBeenCalledWith('invalid_id');
      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].statusCode).toBe(404);
      expect(next.mock.calls[0][0].code).toBe('USER_NOT_FOUND');
    });

    it('should update status and revoke session if user is suspended', async () => {
      req.params.id = 'user_id_1';
      req.body.status = 'suspended';

      const mockSave = jest.fn().mockResolvedValue({});
      const mockUser = {
        _id: 'user_id_1',
        status: 'active',
        save: mockSave
      };
      userRepository.findById.mockResolvedValue(mockUser);
      sessionRepository.revokeSessionsForUser.mockResolvedValue({ modifiedCount: 2 });

      await adminController.updateUserStatus(req, res, next);

      expect(mockUser.status).toBe('suspended');
      expect(mockSave).toHaveBeenCalled();
      expect(sessionRepository.revokeSessionsForUser).toHaveBeenCalledWith('user_id_1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'User status successfully updated to suspended.'
      });
    });
  });
});
