import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { requireDb } from '../middleware/requireDb.js';
import { getMyNotifications, markRead, markAllRead } from '../controllers/notificationController.js';

const router = Router();
router.use(requireDb, protect);

router.get('/', getMyNotifications);
router.post('/:id/read', markRead);
router.post('/read-all', markAllRead);

export default router;
