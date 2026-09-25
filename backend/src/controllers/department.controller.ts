import { Response } from 'express';
import { Department } from '../models/Department';
import { AuthenticatedRequest } from '../middlewares/auth';
import { logAuditEvent } from '../utils/audit';

export const getDepartments = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const departments = await Department.find().sort({ name: 1 }).lean();
    res.json({ success: true, data: departments });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

export const createDepartment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, code, description } = req.body;

    if (!name || !code) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Name and Code are required' } });
      return;
    }

    const existing = await Department.findOne({ $or: [{ name }, { code: code.toUpperCase() }] });
    if (existing) {
      res.status(400).json({ success: false, error: { code: 'EXISTS', message: 'Department with same name or code already exists' } });
      return;
    }

    const dept = await Department.create({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description: description || ''
    });

    await logAuditEvent({
      actorId: req.user?.userId,
      actorName: req.user?.name,
      action: 'CREATE_DEPARTMENT',
      resourceType: 'DEPARTMENT',
      resourceId: dept._id.toString(),
      details: { name: dept.name, code: dept.code }
    });

    res.status(201).json({ success: true, data: dept });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};
