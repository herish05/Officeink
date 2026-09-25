import { AuditLog } from '../models/AuditLog';
import logger from './logger';

export const logAuditEvent = async (params: {
  actorId?: string;
  actorName?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  ipAddress?: string;
  details?: Record<string, any>;
}): Promise<void> => {
  try {
    await AuditLog.create({
      actorId: params.actorId,
      actorName: params.actorName || 'System',
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId || '',
      ipAddress: params.ipAddress || '127.0.0.1',
      details: params.details || {}
    });
  } catch (err: any) {
    logger.warn(`[AuditLog] Failed to record audit log: ${err.message}`);
  }
};
