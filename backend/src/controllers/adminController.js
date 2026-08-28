import User from '../models/User.js';
import FreelancerProfile from '../models/FreelancerProfile.js';
import Gig from '../models/Gig.js';
import Payment from '../models/Payment.js';
import Review from '../models/Review.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';

// ---------------------------------------------------------------------------
// User management
// ---------------------------------------------------------------------------
export const listUsers = asyncHandler(async (req, res) => {
  const { role, q, page = 1, limit = 30 } = req.query;
  const filter = {};
  if (role) filter.role = role;
  if (q) filter.$or = [{ name: { $regex: q, $options: 'i' } }, { email: { $regex: q, $options: 'i' } }];

  const [users, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit)),
    User.countDocuments(filter),
  ]);

  res.json(new ApiResponse(200, { users, total, page: Number(page), pages: Math.ceil(total / Number(limit)) }));
});

export const suspendUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');
  if (user.role === 'admin') throw new ApiError(400, "Can't suspend another admin");

  user.isSuspended = true;
  user.suspensionReason = req.body.reason || '';
  user.refreshTokenHash = undefined; // kill their active sessions
  await user.save();

  res.json(new ApiResponse(200, { user: user.toSafeJSON() }, 'User suspended'));
});

export const activateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');

  user.isSuspended = false;
  user.suspensionReason = '';
  await user.save();

  res.json(new ApiResponse(200, { user: user.toSafeJSON() }, 'User reactivated'));
});

export const verifyFreelancer = asyncHandler(async (req, res) => {
  const profile = await FreelancerProfile.findOneAndUpdate(
    { user: req.params.id },
    { $set: { verificationBadge: true } },
    { new: true }
  );
  if (!profile) throw new ApiError(404, 'Freelancer profile not found');
  res.json(new ApiResponse(200, { profile }, 'Freelancer verified'));
});

// ---------------------------------------------------------------------------
// Fraud queue — acts on the flags Review creation already sets (Week 3)
// ---------------------------------------------------------------------------
export const getFlaggedReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ flaggedForReview: true })
    .sort({ createdAt: -1 })
    .populate('reviewer', 'name email')
    .populate('reviewee', 'name email')
    .populate('gig', 'title');
  res.json(new ApiResponse(200, { reviews }));
});

export const dismissFlag = asyncHandler(async (req, res) => {
  const review = await Review.findByIdAndUpdate(req.params.id, { $set: { flaggedForReview: false } }, { new: true });
  if (!review) throw new ApiError(404, 'Review not found');
  res.json(new ApiResponse(200, { review }, 'Flag dismissed'));
});

export const deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findByIdAndDelete(req.params.id);
  if (!review) throw new ApiError(404, 'Review not found');
  res.json(new ApiResponse(200, null, 'Review removed'));
});

// ---------------------------------------------------------------------------
// Analytics — real aggregations, not placeholder numbers
// ---------------------------------------------------------------------------
export const getAnalytics = asyncHandler(async (req, res) => {
  const [platformRevenue, activeFreelancers, totalGigs, completedGigs, topCategories, gigStatusBreakdown] =
    await Promise.all([
      Payment.aggregate([{ $match: { status: 'released' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      User.countDocuments({ role: 'freelancer', isActive: true, isSuspended: false }),
      Gig.countDocuments({}),
      Gig.countDocuments({ status: 'completed' }),
      Gig.aggregate([
        { $match: { category: { $ne: '' } } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
      Gig.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    ]);

  res.json(
    new ApiResponse(200, {
      platformRevenue: platformRevenue[0]?.total || 0,
      activeFreelancers,
      totalGigs,
      completedGigs,
      jobSuccessRate: totalGigs > 0 ? Math.round((completedGigs / totalGigs) * 1000) / 10 : 0,
      topCategories: topCategories.map((c) => ({ category: c._id, count: c.count })),
      gigStatusBreakdown: gigStatusBreakdown.map((s) => ({ status: s._id, count: s.count })),
    })
  );
});
