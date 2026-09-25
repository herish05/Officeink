import { Router } from 'express';
import { getConversations, createConversation } from '../controllers/conversation.controller';
import { getMessages } from '../controllers/message.controller';
import { authenticateJWT } from '../middlewares/auth';

const router = Router();

router.use(authenticateJWT);

router.get('/', getConversations);
router.post('/', createConversation);
router.get('/:conversationId/messages', getMessages);

export default router;
