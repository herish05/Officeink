import { Router } from 'express';
import { login, getMe, logout } from '../controllers/auth.controller';
import { authenticateJWT } from '../middlewares/auth';

const router = Router();

router.post('/login', login);
router.get('/me', authenticateJWT, getMe);
router.post('/logout', authenticateJWT, logout);

export default router;
