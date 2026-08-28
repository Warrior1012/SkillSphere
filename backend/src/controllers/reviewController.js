import Review from '../models/Review.js';
import Gig from '../models/Gig.js';
import FreelancerProfile from '../models/FreelancerProfile.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { evaluateReviewForFraudSignals } from '../utils/fraudSignals.js';
import { computeWeightedReputation } from '../utils/reputationScoring.js';
import { notify } from '../utils/notify.js';

export const createReview = asyncHandler(async (req, res) => {
  const { gigId, revieweeId, rating, comment } = req.body;

  const gig = await Gig.findById(gigId);
  if (!gig) throw new ApiError(404, 'Gig not found');
  if (gig.status !== 'completed') throw new ApiError(400, 'You can only review a completed gig');

  const participants = [String(gig.client), String(gig.selectedFreelancer)];
  if (!participants.includes(String(req.user._id))) throw new ApiError(403, 'You were not part of this gig');
  if (!participants.includes(String(revieweeId)) || String(revieweeId) === String(req.user._id)) {
    throw new ApiError(400, 'Invalid reviewee for this gig');
  }

  const existing = await Review.findOne({ gig: gigId, reviewer: req.user._id });
  if (existing) throw new ApiError(409, 'You already reviewed this gig');

  const { flagged, reasons } = evaluateReviewForFraudSignals({
    reviewerCreatedAt: req.user.createdAt,
    gigCompletedAt: gig.updatedAt, // proxy for completion time — gig.save() on status change updates this
    rating,
  });

  const review = await Review.create({
    gig: gigId,
    reviewer: req.user._id,
    reviewee: revieweeId,
    rating,
    comment: comment || '',
    flaggedForReview: flagged,
    flagReasons: reasons,
  });

  // If the reviewee is a freelancer, recompute their weighted reputation.
  const freelancerProfile = await FreelancerProfile.findOne({ user: revieweeId });
  if (freelancerProfile) {
    const allReviews = await Review.find({ reviewee: revieweeId });
    const { score, totalReviews } = computeWeightedReputation(allReviews);
    freelancerProfile.reputationScore = score;
    freelancerProfile.totalReviews = totalReviews;
    await freelancerProfile.save();
  }

  await notify({
    user: revieweeId,
    type: 'review_received',
    title: `New review from ${req.user.name}`,
    body: `${rating}/5 — ${(comment || '').slice(0, 100)}`,
    link: `/profile/${revieweeId}`,
  });

  res.status(201).json(new ApiResponse(201, { review }, 'Review submitted'));
});

export const getReviewsForUser = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ reviewee: req.params.userId })
    .sort({ createdAt: -1 })
    .populate('reviewer', 'name avatarUrl')
    .populate('gig', 'title');

  res.json(new ApiResponse(200, { reviews }));
});

export const getReviewsForGig = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ gig: req.params.gigId }).populate('reviewer', 'name avatarUrl');
  res.json(new ApiResponse(200, { reviews }));
});
