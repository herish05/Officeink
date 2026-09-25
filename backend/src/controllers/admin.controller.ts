import { Response } from 'express';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { User } from '../models/User';
import { Department } from '../models/Department';
import { Message } from '../models/Message';
import { FileMetadata } from '../models/FileMetadata';
import { AuditLog } from '../models/AuditLog';
import { Conversation } from '../models/Conversation';
import { getRedisClient } from '../config/redis';
import { ENV } from '../config/env';
import { AuthenticatedRequest } from '../middlewares/auth';
import { logAuditEvent } from '../utils/audit';
import logger from '../utils/logger';

export const getDashboardStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const totalEmployees = await User.countDocuments({ isActive: true });
    const totalDisabled = await User.countDocuments({ isActive: false });
    const totalDepartments = await Department.countDocuments();
    const totalMessages = await Message.countDocuments();
    const totalFiles = await FileMetadata.countDocuments();
    const totalConversations = await Conversation.countDocuments();

    // Sum storage size
    const fileStats = await FileMetadata.aggregate([
      { $group: { _id: null, totalBytes: { $sum: '$size' } } }
    ]);
    const totalStorageBytes = fileStats.length > 0 ? fileStats[0].totalBytes : 0;

    // Get online user count from Redis / Presence keys
    const redis = getRedisClient();
    const presenceKeys = await redis.keys('online:user:*');
    const onlineCount = presenceKeys.length;

    res.json({
      success: true,
      data: {
        totalEmployees,
        totalDisabled,
        totalDepartments,
        totalMessages,
        totalFiles,
        totalConversations,
        totalStorageBytes,
        onlineCount,
        lanIp: ENV.LAN_IP,
        nodeVersion: process.version,
        uptimeSeconds: process.uptime()
      }
    });
  } catch (error: any) {
    logger.error(`[AdminController] getDashboardStats error: ${error.message}`);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

export const createUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { employeeId, name, username, password, departmentId, role, designation, phone, email } = req.body;

    if (!employeeId || !name || !username || !password) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Employee ID, Name, Username and Password are required' } });
      return;
    }

    const existing = await User.findOne({
      $or: [
        { employeeId: employeeId.trim().toUpperCase() },
        { username: username.trim().toLowerCase() }
      ]
    });

    if (existing) {
      res.status(400).json({ success: false, error: { code: 'EXISTS', message: 'User with this Employee ID or Username already exists' } });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      employeeId: employeeId.trim().toUpperCase(),
      name: name.trim(),
      username: username.trim().toLowerCase(),
      passwordHash,
      departmentId: departmentId || undefined,
      role: role || 'EMPLOYEE',
      designation: designation || 'Staff Member',
      phone: phone || '',
      email: email || '',
      isActive: true
    });

    await logAuditEvent({
      actorId: req.user?.userId,
      actorName: req.user?.name,
      action: 'ADMIN_CREATE_USER',
      resourceType: 'USER',
      resourceId: newUser._id.toString(),
      details: { employeeId: newUser.employeeId, name: newUser.name, role: newUser.role }
    });

    res.status(201).json({ success: true, data: newUser });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

export const updateUserStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { isActive, role, newPassword, departmentId, designation } = req.body;

    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
      return;
    }

    if (isActive !== undefined) user.isActive = isActive;
    if (role !== undefined) user.role = role;
    if (departmentId !== undefined) user.departmentId = departmentId;
    if (designation !== undefined) user.designation = designation;

    if (newPassword) {
      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash(newPassword, salt);
    }

    await user.save();

    await logAuditEvent({
      actorId: req.user?.userId,
      actorName: req.user?.name,
      action: 'ADMIN_UPDATE_USER',
      resourceType: 'USER',
      resourceId: user._id.toString(),
      details: { employeeId: user.employeeId, isActive: user.isActive, role: user.role, passwordReset: !!newPassword }
    });

    res.json({ success: true, data: user });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

export const getAuditLogs = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '50', 10);
    const skip = (page - 1) * limit;

    const logs = await AuditLog.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('actorId', 'name employeeId')
      .lean();

    const total = await AuditLog.countDocuments();

    res.json({
      success: true,
      data: {
        logs,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) }
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

export const triggerBackup = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const backupDir = path.resolve('./uploads/backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `backup_${timestamp}.json`);

    const users = await User.find().select('-passwordHash').lean();
    const departments = await Department.find().lean();
    const conversations = await Conversation.find().lean();
    const files = await FileMetadata.find().lean();
    const messages = await Message.find().limit(5000).lean();

    const backupData = {
      timestamp: new Date().toISOString(),
      app: 'OfficeLink LAN Platform',
      version: '1.0.0',
      data: { users, departments, conversations, filesCount: files.length, messagesCount: messages.length }
    };

    fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));

    await logAuditEvent({
      actorId: req.user?.userId,
      actorName: req.user?.name,
      action: 'TRIGGER_DATABASE_BACKUP',
      resourceType: 'SYSTEM',
      details: { backupFile: `backup_${timestamp}.json` }
    });

    res.json({
      success: true,
      message: 'System backup created successfully',
      data: { fileName: `backup_${timestamp}.json`, path: backupPath }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};
