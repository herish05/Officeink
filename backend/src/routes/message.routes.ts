import { Router } from 'express';
import { sendMessageREST } from '../controllers/message.controller';
import { authenticateJWT } from '../middlewares/auth';

const router = Router();

router.use(authenticateJWT);

router.post('/', sendMessageREST);

export default router;
