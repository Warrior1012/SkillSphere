import User from '../models/User.js';
import FreelancerProfile from '../models/FreelancerProfile.js';
import ClientProfile from '../models/ClientProfile.js';
import Payment from '../models/Payment.js';
import Proposal from '../models/Proposal.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';

function profileModelFor(role) {
  if (role === 'freelancer') return FreelancerProfile;
  if (role === 'client') return ClientProfile;
  return null; // admins don't have a FreelancerProfile/ClientProfile
}

// ---------------------------------------------------------------------------
// Own profile
// ---------------------------------------------------------------------------
export const getMyProfile = asyncHandler(async (req, res) => {
  const Model = profileModelFor(req.user.role);
  const profile = Model ? await Model.findOne({ user: req.user._id }) : null;

  res.json(new ApiResponse(200, { user: req.user.toSafeJSON(), profile }));
});

export const updateMyBasics = asyncHandler(async (req, res) => {
  const { name, phone, avatarUrl, city, address, coordinates } = req.body;

  if (name !== undefined) req.user.name = name;
  if (phone !== undefined) req.user.phone = phone;
  if (avatarUrl !== undefined) req.user.avatarUrl = avatarUrl;
  if (city !== undefined) req.user.location.city = city;
  if (address !== undefined) req.user.location.address = address;
  if (coordinates !== undefined) req.user.location.coordinates = coordinates;

  await req.user.save();
  res.json(new ApiResponse(200, { user: req.user.toSafeJSON() }, 'Profile updated'));
});

export const updateMyRoleProfile = asyncHandler(async (req, res) => {
  const Model = profileModelFor(req.user.role);
  if (!Model) throw new ApiError(400, 'This account type has no role profile to update');

  const profile = await Model.findOneAndUpdate(
    { user: req.user._id },
    { $set: req.body },
    { new: true, runValidators: true, upsert: true }
  );

  res.json(new ApiResponse(200, { profile }, 'Profile updated'));
});

// ---------------------------------------------------------------------------
// Public view of another user's profile
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Freelancer analytics — real aggregation, not a placeholder series
// ---------------------------------------------------------------------------
export const getMyEarningsTimeline = asyncHandler(async (req, res) => {
  if (req.user.role !== 'freelancer') throw new ApiError(400, 'Earnings timeline is only available for freelancer accounts');

  const [earningsByMonth, proposalsSubmitted] = await Promise.all([
    Payment.aggregate([
      { $match: { freelancer: req.user._id, status: 'released' } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$updatedAt' } }, total: { $sum: '$amount' } } },
      { $sort: { _id: 1 } },
    ]),
    Proposal.countDocuments({ freelancer: req.user._id }),
  ]);

  res.json(
    new ApiResponse(200, {
      earningsByMonth: earningsByMonth.map((e) => ({ month: e._id, total: e.total })),
      proposalsSubmitted,
    })
  );
});

export const getPublicProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.userId);
  if (!user || !user.isActive) throw new ApiError(404, 'Profile not found');

  const Model = profileModelFor(user.role);
  const profile = Model ? await Model.findOne({ user: user._id }) : null;

  if (profile && user.role === 'freelancer') {
    profile.profileViews += 1;
    await profile.save();
  }

  // Public view — only expose what's meant to be public.
  const publicUser = {
    _id: user._id,
    name: user.name,
    role: user.role,
    avatarUrl: user.avatarUrl,
    city: user.location?.city || '',
    createdAt: user.createdAt,
  };

  res.json(new ApiResponse(200, { user: publicUser, profile }));
});
