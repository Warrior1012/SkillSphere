import { Router } from 'express';
import { isDbConnected } from '../config/db.js';
import authRoutes from './authRoutes.js';
import profileRoutes from './profileRoutes.js';
import gigRoutes from './gigRoutes.js';
import proposalRoutes from './proposalRoutes.js';
import conversationRoutes from './conversationRoutes.js';
import reviewRoutes from './reviewRoutes.js';
import notificationRoutes from './notificationRoutes.js';
import paymentRoutes from './paymentRoutes.js';
import adminRoutes from './adminRoutes.js';
import uploadRoutes from './uploadRoutes.js';
import disputeRoutes from './disputeRoutes.js';

const router = Router();

router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'ok',
    db: isDbConnected() ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

router.use('/auth', authRoutes);
router.use('/profile', profileRoutes);
router.use('/gigs', gigRoutes);
router.use('/proposals', proposalRoutes.standalone);
router.use('/conversations', conversationRoutes);
router.use('/reviews', reviewRoutes);
router.use('/notifications', notificationRoutes);
router.use('/payments', paymentRoutes);
router.use('/admin', adminRoutes);
router.use('/uploads', uploadRoutes);
router.use('/disputes', disputeRoutes);

export default router;
