/**
 * @fileoverview Auth Controller mapping Express requests to AuthService.
 */

const authService = require('../services/auth.service');

/**
 * Configure cookie parameters for the refresh token.
 */
const setCookieOptions = () => {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 Days
  };
};

/**
 * Register a user.
 */
const register = async (req, res, next) => {
  try {
    const user = await authService.register(req.body);
    res.status(201).json({
      success: true,
      message: 'User registered successfully.',
      data: {
        userId: user._id,
        email: user.email
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Log in a user.
 */
const login = async (req, res, next) => {
  try {
    const clientMetadata = {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || 'unknown'
    };

    const session = await authService.login(req.body.email, req.body.password, clientMetadata);

    // If multi-factor challenge is triggered
    if (session.mfaRequired) {
      return res.status(200).json({
        success: true,
        data: {
          mfaRequired: true,
          tempToken: session.tempToken
        }
      });
    }

    // Set refresh token in http-only cookie
    res.cookie('jid', session.refreshToken, setCookieOptions());

    res.status(200).json({
      success: true,
      data: {
        accessToken: session.accessToken,
        encryptionSalt: session.encryptionSalt,
        user: session.user
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh rotated session tokens.
 */
const refresh = async (req, res, next) => {
  try {
    const rawRefreshToken = req.cookies.jid;
    if (!rawRefreshToken) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'No session context found.' }
      });
    }

    const clientMetadata = {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || 'unknown'
    };

    const session = await authService.refreshSession(rawRefreshToken, clientMetadata);

    // Set rotated refresh token in cookie
    res.cookie('jid', session.refreshToken, setCookieOptions());

    res.status(200).json({
      success: true,
      data: {
        accessToken: session.accessToken
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Log out and invalidate refresh tokens.
 */
const logout = async (req, res, next) => {
  try {
    const rawRefreshToken = req.cookies.jid;
    if (rawRefreshToken) {
      await authService.logout(rawRefreshToken);
    }

    res.clearCookie('jid', setCookieOptions());
    res.status(200).json({
      success: true,
      message: 'Logged out successfully.'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update profile details (name, avatar).
 */
const updateProfile = async (req, res, next) => {
  try {
    const user = await authService.updateProfile(req.user.id, req.body);
    res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      data: {
        user: {
          id: user._id,
          email: user.email,
          role: user.role,
          name: user.name,
          avatar: user.avatar
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Change passphrase hash.
 */
const changePassword = async (req, res, next) => {
  try {
    const { newPasswordHash } = req.body;
    if (!newPasswordHash) {
      return res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'New password hash is required.' }
      });
    }

    await authService.changePassword(req.user.id, newPasswordHash);
    res.status(200).json({
      success: true,
      message: 'Password changed successfully.'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  refresh,
  logout,
  updateProfile,
  changePassword
};
