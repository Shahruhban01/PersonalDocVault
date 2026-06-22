const authService = require('../../src/services/auth.service');
const userRepository = require('../../src/repositories/user.repository');
const bcrypt = require('bcryptjs');

// Mock dependencies
jest.mock('../../src/repositories/user.repository');
jest.mock('bcryptjs');

describe('AuthService - Unit Tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should throw an error if the user already exists', async () => {
      userRepository.findByEmail.mockResolvedValue({ email: 'existing@example.com' });

      await expect(
        authService.register({ email: 'existing@example.com', password: 'hash', encryptionSalt: 'salt' })
      ).rejects.toThrow('An account with this email address already exists.');

      expect(userRepository.findByEmail).toHaveBeenCalledWith('existing@example.com');
      expect(userRepository.create).not.toHaveBeenCalled();
    });

    it('should hash the password and create the user if email is unique', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      bcrypt.genSalt.mockResolvedValue('salt_val');
      bcrypt.hash.mockResolvedValue('hashed_password');
      userRepository.create.mockResolvedValue({
        _id: 'mock_user_id',
        email: 'new@example.com'
      });

      const result = await authService.register({
        email: 'new@example.com',
        password: 'plain_password',
        encryptionSalt: 'salt'
      });

      expect(userRepository.findByEmail).toHaveBeenCalledWith('new@example.com');
      expect(bcrypt.genSalt).toHaveBeenCalledWith(12);
      expect(bcrypt.hash).toHaveBeenCalledWith('plain_password', 'salt_val');
      expect(userRepository.create).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'hashed_password',
        encryptionSalt: 'salt'
      });
      expect(result._id).toBe('mock_user_id');
    });
  });
});
