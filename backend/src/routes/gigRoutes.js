import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { requireDb } from '../middleware/requireDb.js';
import { validate } from '../middleware/validate.js';
import { createGigSchema, updateGigSchema, updateMilestoneStatusSchema } from '../validators/gigValidators.js';
import {
  createGig,
  listGigs,
  getMyGigs,
  getGigById,
  updateGig,
  cancelGig,
  completeGig,
  inviteFreelancer,
  getRecommendedFreelancers,
  updateMilestoneStatus,
} from '../controllers/gigController.js';
import proposalRoutes from './proposalRoutes.js';

const router = Router();

router.use(requireDb);

router.get('/', listGigs);
router.get('/mine', protect, authorize('client'), getMyGigs);
router.post('/', protect, authorize('client'), validate(createGigSchema), createGig);

router.get('/:id', getGigById);
router.patch('/:id', protect, authorize('client'), validate(updateGigSchema), updateGig);
router.post('/:id/cancel', protect, authorize('client'), cancelGig);
router.post('/:id/complete', protect, authorize('client'), completeGig);
router.post('/:id/invite', protect, authorize('client'), inviteFreelancer);
router.get('/:id/recommended-freelancers', protect, authorize('client'), getRecommendedFreelancers);
router.patch('/:id/milestones/:milestoneId', protect, validate(updateMilestoneStatusSchema), updateMilestoneStatus);

// Proposals are nested under a gig for submit/list; standalone actions
// (accept/reject/withdraw/mine) live in proposalRoutes mounted separately.
router.use('/:gigId/proposals', proposalRoutes.nested);

export default router;
