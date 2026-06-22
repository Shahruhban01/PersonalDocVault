/**
 * @fileoverview Admin Controller managing user statuses, system logs, and system metrics.
 */

const userRepository = require('../repositories/user.repository');
const sessionRepository = require('../repositories/session.repository');
const auditLogRepository = require('../repositories/audit-log.repository');
const vaultItemRepository = require('../repositories/vault-item.repository');
const AppError = require('../utils/app-error');

/**
 * Fetch paginated list of all users.
 */
const listUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const users = await userRepository.find({}, '', { createdAt: -1 }, limit, skip);
    const totalUsers = await userRepository.model.countDocuments().exec();

    res.status(200).json({
      success: true,
      data: {
        docs: users.map(u => ({
          id: u._id,
          email: u.email,
          role: u.role,
          status: u.status,
          createdAt: u.createdAt
        })),
        totalDocs: totalUsers,
        totalPages: Math.ceil(totalUsers / limit),
        page
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Suspend or activate a user account. Revokes active sessions if suspended.
 */
const updateUserStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const targetUser = await userRepository.findById(req.params.id);
    if (!targetUser) {
      return next(new AppError('The requested user profile was not found.', 404, 'USER_NOT_FOUND'));
    }

    targetUser.status = status;
    await targetUser.save();

    // If suspended, immediately revoke all active refresh tokens/sessions
    if (status === 'suspended') {
      await sessionRepository.revokeSessionsForUser(targetUser._id);
    }

    res.status(200).json({
      success: true,
      message: `User status successfully updated to ${status}.`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Fetch paginated list of security audit logs.
 */
const listAuditLogs = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const logs = await auditLogRepository.findPaginatedLogs({}, limit, skip);
    const totalLogs = await auditLogRepository.countLogs({});

    res.status(200).json({
      success: true,
      data: {
        logs: logs.map(l => ({
          id: l._id,
          userId: l.userId,
          action: l.action,
          ipAddress: l.ipAddress,
          userAgent: l.userAgent,
          status: l.status,
          details: l.details,
          timestamp: l.timestamp
        })),
        totalDocs: totalLogs,
        totalPages: Math.ceil(totalLogs / limit),
        page
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Fetch global system metrics.
 */
const getStatistics = async (req, res, next) => {
  try {
    const totalUsers = await userRepository.model.countDocuments().exec();
    const activeUsers = await userRepository.model.countDocuments({ status: 'active' }).exec();
    const suspendedUsers = await userRepository.model.countDocuments({ status: 'suspended' }).exec();

    const documentCount = await vaultItemRepository.model.countDocuments({ type: 'document' }).exec();
    const cardCount = await vaultItemRepository.model.countDocuments({ type: 'card' }).exec();
    const noteCount = await vaultItemRepository.model.countDocuments({ type: 'note' }).exec();

    res.status(200).json({
      success: true,
      data: {
        metrics: {
          usersCount: {
            total: totalUsers,
            active: activeUsers,
            suspended: suspendedUsers
          },
          vaultItemCount: {
            documents: documentCount,
            cards: cardCount,
            notes: noteCount
          }
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listUsers,
  updateUserStatus,
  listAuditLogs,
  getStatistics
};
