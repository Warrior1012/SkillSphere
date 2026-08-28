import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { requireDb } from '../middleware/requireDb.js';
import { validate } from '../middleware/validate.js';
import { startConversationSchema, sendMessageSchema } from '../validators/messageValidators.js';
import { startOrGetConversation, listMyConversations, getMessages, sendMessage } from '../controllers/messageController.js';

const router = Router();
router.use(requireDb, protect);

router.get('/', listMyConversations);
router.post('/', validate(startConversationSchema), startOrGetConversation);
router.get('/:conversationId/messages', getMessages);
router.post('/:conversationId/messages', validate(sendMessageSchema), sendMessage);

export default router;
