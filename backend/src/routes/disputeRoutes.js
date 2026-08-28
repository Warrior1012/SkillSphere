import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { requireDb } from '../middleware/requireDb.js';
import { validate } from '../middleware/validate.js';
import { raiseDisputeSchema } from '../validators/disputeValidators.js';
import { raiseDispute, getMyDisputes } from '../controllers/disputeController.js';

const router = Router();
router.use(requireDb, protect);

router.post('/', validate(raiseDisputeSchema), raiseDispute);
router.get('/mine', getMyDisputes);

export default router;
