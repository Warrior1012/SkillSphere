import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { requireDb } from '../middleware/requireDb.js';
import {
  listUsers,
  suspendUser,
  activateUser,
  verifyFreelancer,
  getFlaggedReviews,
  dismissFlag,
  deleteReview,
  getAnalytics,
} from '../controllers/adminController.js';
import { getAllDisputes, resolveDispute } from '../controllers/disputeController.js';
import { validate } from '../middleware/validate.js';
import { resolveDisputeSchema } from '../validators/disputeValidators.js';

const router = Router();
router.use(requireDb, protect, authorize('admin'));

router.get('/users', listUsers);
router.post('/users/:id/suspend', suspendUser);
router.post('/users/:id/activate', activateUser);
router.post('/freelancers/:id/verify', verifyFreelancer);

router.get('/flagged-reviews', getFlaggedReviews);
router.post('/flagged-reviews/:id/dismiss', dismissFlag);
router.delete('/reviews/:id', deleteReview);

router.get('/disputes', getAllDisputes);
router.post('/disputes/:id/resolve', validate(resolveDisputeSchema), resolveDispute);

router.get('/analytics', getAnalytics);

export default router;
