import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt';
import { logAuditEvent } from '../utils/audit';
import { AuthenticatedRequest } from '../middlewares/auth';
import logger from '../utils/logger';

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { employeeId, password } = req.body;
    const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';

    if (!employeeId || !password) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Employee ID and password are required' } });
      return;
    }

    const user = await User.findOne({ employeeId: employeeId.trim().toUpperCase() }).populate('departmentId');
    if (!user) {
      await logAuditEvent({ action: 'FAILED_LOGIN', resourceType: 'USER', ipAddress, details: { employeeId } });
      res.status(401).json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid Employee ID or password' } });
      return;
    }

    if (!user.isActive) {
      await logAuditEvent({ actorId: user._id.toString(), actorName: user.name, action: 'LOGIN_BLOCKED_DISABLED', resourceType: 'USER', ipAddress });
      res.status(403).json({ success: false, error: { code: 'ACCOUNT_DISABLED', message: 'Account has been disabled by administrator' } });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      await logAuditEvent({ actorId: user._id.toString(), actorName: user.name, action: 'FAILED_LOGIN', resourceType: 'USER', ipAddress });
      res.status(401).json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid Employee ID or password' } });
      return;
    }

    const payload = {
      userId: user._id.toString(),
      employeeId: user.employeeId,
      role: user.role
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    user.lastSeen = new Date();
    await user.save();

    await logAuditEvent({
      actorId: user._id.toString(),
      actorName: user.name,
      action: 'EMPLOYEE_LOGIN',
      resourceType: 'USER',
      ipAddress
    });

    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: false, // LAN HTTP deployment
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({
      success: true,
      data: {
        token: accessToken,
        refreshToken,
        user: {
          id: user._id.toString(),
          employeeId: user.employeeId,
          name: user.name,
          username: user.username,
          role: user.role,
          department: user.departmentId,
          avatar: user.avatar,
          phone: user.phone,
          email: user.email,
          designation: user.designation,
          statusText: user.statusText
        }
      }
    });
  } catch (error: any) {
    logger.error(`[Auth] Login Error: ${error.message}`);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'An unexpected error occurred during login' } });
  }
};

export const getMe = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
      return;
    }

    const user = await User.findById(req.user.userId).populate('departmentId').lean();
    if (!user) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
      return;
    }

    res.json({
      success: true,
      data: {
        id: user._id.toString(),
        employeeId: user.employeeId,
        name: user.name,
        username: user.username,
        role: user.role,
        department: user.departmentId,
        avatar: user.avatar,
        phone: user.phone,
        email: user.email,
        designation: user.designation,
        statusText: user.statusText,
        isActive: user.isActive,
        lastSeen: user.lastSeen
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

export const logout = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (req.user) {
      await logAuditEvent({
        actorId: req.user.userId,
        actorName: req.user.name,
        action: 'EMPLOYEE_LOGOUT',
        resourceType: 'USER',
        ipAddress: req.ip || '127.0.0.1'
      });
    }
    res.clearCookie('access_token');
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};
