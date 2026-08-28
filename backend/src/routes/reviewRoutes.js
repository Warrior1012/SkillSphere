import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { requireDb } from '../middleware/requireDb.js';
import { validate } from '../middleware/validate.js';
import { createReviewSchema } from '../validators/messageValidators.js';
import { createReview, getReviewsForUser, getReviewsForGig } from '../controllers/reviewController.js';

const router = Router();
router.use(requireDb);

router.post('/', protect, validate(createReviewSchema), createReview);
router.get('/user/:userId', getReviewsForUser);
router.get('/gig/:gigId', getReviewsForGig);

export default router;
