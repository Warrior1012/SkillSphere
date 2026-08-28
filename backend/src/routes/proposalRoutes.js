import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { requireDb } from '../middleware/requireDb.js';
import { validate } from '../middleware/validate.js';
import { createProposalSchema } from '../validators/gigValidators.js';
import {
  submitProposal,
  getProposalsForGig,
  getMyProposals,
  withdrawProposal,
  acceptProposal,
  rejectProposal,
} from '../controllers/proposalController.js';

// Nested under /api/gigs/:gigId/proposals
const nested = Router({ mergeParams: true });
nested.post('/', protect, authorize('freelancer'), validate(createProposalSchema), submitProposal);
nested.get('/', protect, authorize('client'), getProposalsForGig);

// Standalone at /api/proposals
const standalone = Router();
standalone.use(requireDb);
standalone.get('/mine', protect, authorize('freelancer'), getMyProposals);
standalone.post('/:id/withdraw', protect, authorize('freelancer'), withdrawProposal);
standalone.post('/:id/accept', protect, authorize('client'), acceptProposal);
standalone.post('/:id/reject', protect, authorize('client'), rejectProposal);

export default { nested, standalone };
