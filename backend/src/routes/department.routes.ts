import { Router } from 'express';
import { getDepartments, createDepartment } from '../controllers/department.controller';
import { authenticateJWT, requireAdmin } from '../middlewares/auth';

const router = Router();

router.use(authenticateJWT);

router.get('/', getDepartments);
router.post('/', requireAdmin, createDepartment);

export default router;
