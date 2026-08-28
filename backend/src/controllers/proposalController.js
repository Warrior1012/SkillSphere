import mongoose from 'mongoose';
import Proposal from '../models/Proposal.js';
import Gig from '../models/Gig.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { notify } from '../utils/notify.js';

export const submitProposal = asyncHandler(async (req, res) => {
  const gig = await Gig.findById(req.params.gigId);
  if (!gig) throw new ApiError(404, 'Gig not found');
  if (gig.status !== 'open') throw new ApiError(400, 'This gig is no longer accepting proposals');
  if (String(gig.client) === String(req.user._id)) throw new ApiError(400, "You can't propose on your own gig");

  const existing = await Proposal.findOne({ gig: gig._id, freelancer: req.user._id });
  if (existing && existing.status !== 'withdrawn') {
    throw new ApiError(409, 'You already have a proposal on this gig — edit it instead of resubmitting');
  }

  let proposal;
  if (existing) {
    Object.assign(existing, req.body, { status: 'pending' });
    proposal = await existing.save();
  } else {
    proposal = await Proposal.create({ ...req.body, gig: gig._id, freelancer: req.user._id });
    gig.proposalsCount += 1;
    await gig.save();
  }

  await notify({
    user: gig.client,
    type: 'proposal_received',
    title: `New proposal on "${gig.title}"`,
    body: `${req.user.name} bid $${proposal.bidAmount}`,
    link: `/gigs/${gig._id}`,
  });

  res.status(201).json(new ApiResponse(201, { proposal }, 'Proposal submitted'));
});

export const getProposalsForGig = asyncHandler(async (req, res) => {
  const gig = await Gig.findById(req.params.gigId);
  if (!gig) throw new ApiError(404, 'Gig not found');
  if (String(gig.client) !== String(req.user._id)) {
    throw new ApiError(403, 'Only the client who posted this gig can view its proposals');
  }

  const proposals = await Proposal.find({ gig: gig._id, status: { $ne: 'withdrawn' } })
    .sort({ createdAt: -1 })
    .populate('freelancer', 'name avatarUrl location');

  res.json(new ApiResponse(200, { proposals }));
});

export const getMyProposals = asyncHandler(async (req, res) => {
  const proposals = await Proposal.find({ freelancer: req.user._id, status: { $ne: 'withdrawn' } })
    .sort({ createdAt: -1 })
    .populate('gig', 'title status budgetMin budgetMax client');

  res.json(new ApiResponse(200, { proposals }));
});

export const withdrawProposal = asyncHandler(async (req, res) => {
  const proposal = await Proposal.findById(req.params.id);
  if (!proposal) throw new ApiError(404, 'Proposal not found');
  if (String(proposal.freelancer) !== String(req.user._id)) throw new ApiError(403, 'Not your proposal');
  if (proposal.status !== 'pending') throw new ApiError(400, `Cannot withdraw a proposal that is ${proposal.status}`);

  proposal.status = 'withdrawn';
  await proposal.save();
  res.json(new ApiResponse(200, { proposal }, 'Proposal withdrawn'));
});

export const acceptProposal = asyncHandler(async (req, res) => {
  const proposal = await Proposal.findById(req.params.id);
  if (!proposal) throw new ApiError(404, 'Proposal not found');

  const gig = await Gig.findById(proposal.gig);
  if (!gig) throw new ApiError(404, 'Gig not found');
  if (String(gig.client) !== String(req.user._id)) throw new ApiError(403, 'Only the gig owner can accept a proposal');
  if (gig.status !== 'open') throw new ApiError(400, `Gig is already ${gig.status}`);
  if (proposal.status !== 'pending') throw new ApiError(400, 'Proposal is no longer pending');

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      proposal.status = 'accepted';
      await proposal.save({ session });

      gig.selectedFreelancer = proposal.freelancer;
      gig.status = 'in_progress';
      await gig.save({ session });

      // Every other pending proposal on this gig is now moot.
      await Proposal.updateMany(
        { gig: gig._id, _id: { $ne: proposal._id }, status: 'pending' },
        { $set: { status: 'rejected' } },
        { session }
      );
    });
  } finally {
    await session.endSession();
  }

  await notify({
    user: proposal.freelancer,
    type: 'proposal_accepted',
    title: `Your proposal on "${gig.title}" was accepted`,
    body: 'The client accepted your proposal — the gig is now in progress.',
    link: `/gigs/${gig._id}`,
  });

  res.json(new ApiResponse(200, { proposal, gig }, 'Proposal accepted — gig is now in progress'));
});

export const rejectProposal = asyncHandler(async (req, res) => {
  const proposal = await Proposal.findById(req.params.id);
  if (!proposal) throw new ApiError(404, 'Proposal not found');

  const gig = await Gig.findById(proposal.gig);
  if (!gig || String(gig.client) !== String(req.user._id)) {
    throw new ApiError(403, 'Only the gig owner can reject a proposal');
  }
  if (proposal.status !== 'pending') throw new ApiError(400, 'Proposal is no longer pending');

  proposal.status = 'rejected';
  await proposal.save();

  await notify({
    user: proposal.freelancer,
    type: 'proposal_rejected',
    title: `Your proposal on "${gig.title}" was declined`,
    link: `/proposals/mine`,
  });

  res.json(new ApiResponse(200, { proposal }, 'Proposal rejected'));
});
