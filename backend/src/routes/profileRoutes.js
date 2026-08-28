import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { requireDb } from '../middleware/requireDb.js';
import { validate } from '../middleware/validate.js';
import {
  updateFreelancerProfileSchema,
  updateClientProfileSchema,
  updateUserBasicsSchema,
} from '../validators/profileValidators.js';
import {
  getMyProfile,
  updateMyBasics,
  updateMyRoleProfile,
  getPublicProfile,
  getMyEarningsTimeline,
} from '../controllers/profileController.js';

const router = Router();

router.get('/me', requireDb, protect, getMyProfile);
router.get('/me/earnings-timeline', requireDb, protect, getMyEarningsTimeline);
router.patch('/me/basics', requireDb, protect, validate(updateUserBasicsSchema), updateMyBasics);

// Same endpoint path for both roles — the controller picks the right model
// off req.user.role, and the two schemas share no field names that would
// cross-contaminate, so this stays simple instead of needing two routes.
router.patch(
  '/me/role-profile',
  requireDb,
  protect,
  (req, res, next) => {
    const schema = req.user.role === 'freelancer' ? updateFreelancerProfileSchema : updateClientProfileSchema;
    return validate(schema)(req, res, next);
  },
  updateMyRoleProfile
);

router.get('/:userId', requireDb, getPublicProfile);

export default router;
