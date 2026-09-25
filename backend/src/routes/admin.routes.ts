import { Router } from 'express';
import { getDashboardStats, createUser, updateUserStatus, getAuditLogs, triggerBackup } from '../controllers/admin.controller';
import { authenticateJWT, requireAdmin } from '../middlewares/auth';

const router = Router();

router.use(authenticateJWT, requireAdmin);

router.get('/stats', getDashboardStats);
router.post('/users', createUser);
router.put('/users/:id', updateUserStatus);
router.get('/audit-logs', getAuditLogs);
router.post('/backup', triggerBackup);

export default router;
