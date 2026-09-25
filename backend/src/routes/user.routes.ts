import { Router } from 'express';
import { getUsers, getUserById, updateProfile } from '../controllers/user.controller';
import { authenticateJWT } from '../middlewares/auth';

const router = Router();

router.use(authenticateJWT);

router.get('/', getUsers);
router.get('/:id', getUserById);
router.put('/profile', updateProfile);

export default router;
