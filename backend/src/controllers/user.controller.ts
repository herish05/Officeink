import { Response } from 'express';
import { User } from '../models/User';
import { AuthenticatedRequest } from '../middlewares/auth';
import logger from '../utils/logger';

export const getUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { departmentId, search, role } = req.query;
    const filter: any = { isActive: true };

    if (departmentId) {
      filter.departmentId = departmentId;
    }
    if (role) {
      filter.role = role;
    }
    if (search) {
      const regex = new RegExp(String(search), 'i');
      filter.$or = [
        { name: regex },
        { employeeId: regex },
        { username: regex },
        { designation: regex }
      ];
    }

    const users = await User.find(filter)
      .populate('departmentId', 'name code')
      .select('-passwordHash')
      .sort({ name: 1 })
      .lean();

    res.json({ success: true, data: users });
  } catch (error: any) {
    logger.error(`[UserController] getUsers error: ${error.message}`);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

export const getUserById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).populate('departmentId', 'name code').select('-passwordHash').lean();

    if (!user) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Employee not found' } });
      return;
    }

    res.json({ success: true, data: user });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

export const updateProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
      return;
    }

    const { statusText, phone, email, designation, avatar } = req.body;
    const user = await User.findById(req.user.userId);

    if (!user) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Employee not found' } });
      return;
    }

    if (statusText !== undefined) user.statusText = statusText;
    if (phone !== undefined) user.phone = phone;
    if (email !== undefined) user.email = email;
    if (designation !== undefined) user.designation = designation;
    if (avatar !== undefined) user.avatar = avatar;

    await user.save();

    res.json({ success: true, data: user });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};
