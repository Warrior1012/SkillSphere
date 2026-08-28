import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { requireDb } from '../middleware/requireDb.js';
import { validate } from '../middleware/validate.js';
import { fundPaymentSchema, confirmPaymentSchema } from '../validators/paymentValidators.js';
import {
  fundPayment,
  confirmPayment,
  releasePayment,
  refundPayment,
  getMyPayments,
  getGigPayments,
} from '../controllers/paymentController.js';

const router = Router();
router.use(requireDb, protect);

router.get('/mine', getMyPayments);
router.get('/gig/:gigId', getGigPayments);
router.post('/fund', authorize('client'), validate(fundPaymentSchema), fundPayment);
router.post('/:id/confirm', authorize('client'), validate(confirmPaymentSchema), confirmPayment);
router.post('/:id/release', authorize('client'), releasePayment);
router.post('/:id/refund', refundPayment); // client or admin — checked in controller

export default router;
