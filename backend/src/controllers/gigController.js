import Gig from '../models/Gig.js';
import FreelancerProfile from '../models/FreelancerProfile.js';
import User from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { gigQuerySchema } from '../validators/gigValidators.js';
import { rankFreelancersForGig } from '../utils/matching.js';
import { notify } from '../utils/notify.js';

export const createGig = asyncHandler(async (req, res) => {
  const { city, coordinates, ...rest } = req.body;

  const gig = await Gig.create({
    ...rest,
    client: req.user._id,
    location: { city: city || '', coordinates: coordinates || [0, 0] },
  });

  res.status(201).json(new ApiResponse(201, { gig }, 'Gig posted'));
});

export const listGigs = asyncHandler(async (req, res) => {
  const parsed = gigQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(422).json({ success: false, message: 'Invalid query', errors: parsed.error.issues });
  }
  const { q, skill, minBudget, maxBudget, isRemote, status, page, limit } = parsed.data;

  const filter = {};
  if (status) filter.status = status;
  else filter.status = 'open'; // default: browsing shows only open gigs
  if (skill) filter.skillsRequired = { $regex: skill, $options: 'i' };
  if (isRemote !== undefined) filter.isRemote = isRemote;
  if (minBudget !== undefined || maxBudget !== undefined) {
    filter.budgetMax = {};
    if (minBudget !== undefined) filter.budgetMax.$gte = minBudget;
    if (maxBudget !== undefined) filter.budgetMin = { $lte: maxBudget };
  }
  if (q) filter.$text = { $search: q };

  const [gigs, total] = await Promise.all([
    Gig.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('client', 'name avatarUrl'),
    Gig.countDocuments(filter),
  ]);

  res.json(new ApiResponse(200, { gigs, total, page, limit, pages: Math.ceil(total / limit) }));
});

export const getMyGigs = asyncHandler(async (req, res) => {
  const gigs = await Gig.find({ client: req.user._id }).sort({ createdAt: -1 });
  res.json(new ApiResponse(200, { gigs }));
});

export const getGigById = asyncHandler(async (req, res) => {
  const gig = await Gig.findById(req.params.id).populate('client', 'name avatarUrl location');
  if (!gig) throw new ApiError(404, 'Gig not found');
  res.json(new ApiResponse(200, { gig, progress: gig.computeProgress() }));
});

function assertGigOwner(gig, user) {
  if (String(gig.client) !== String(user._id)) {
    throw new ApiError(403, 'Only the client who posted this gig can do that');
  }
}

export const updateGig = asyncHandler(async (req, res) => {
  const gig = await Gig.findById(req.params.id);
  if (!gig) throw new ApiError(404, 'Gig not found');
  assertGigOwner(gig, req.user);
  if (gig.status !== 'open') throw new ApiError(400, `Cannot edit a gig that is ${gig.status}`);

  const { city, coordinates, ...rest } = req.body;
  Object.assign(gig, rest);
  if (city !== undefined) gig.location.city = city;
  if (coordinates !== undefined) gig.location.coordinates = coordinates;

  await gig.save();
  res.json(new ApiResponse(200, { gig }, 'Gig updated'));
});

export const cancelGig = asyncHandler(async (req, res) => {
  const gig = await Gig.findById(req.params.id);
  if (!gig) throw new ApiError(404, 'Gig not found');
  assertGigOwner(gig, req.user);

  gig.status = 'cancelled';
  await gig.save();
  res.json(new ApiResponse(200, { gig }, 'Gig cancelled'));
});

export const completeGig = asyncHandler(async (req, res) => {
  const gig = await Gig.findById(req.params.id);
  if (!gig) throw new ApiError(404, 'Gig not found');
  assertGigOwner(gig, req.user);
  if (gig.status !== 'in_progress') throw new ApiError(400, `Cannot complete a gig that is ${gig.status}`);

  gig.status = 'completed';
  await gig.save();

  await notify({
    user: gig.selectedFreelancer,
    type: 'gig_completed',
    title: `"${gig.title}" marked complete`,
    body: 'The client marked this gig complete. You can now leave a review.',
    link: `/gigs/${gig._id}`,
  });

  res.json(new ApiResponse(200, { gig }, 'Gig marked complete'));
});

export const inviteFreelancer = asyncHandler(async (req, res) => {
  const gig = await Gig.findById(req.params.id);
  if (!gig) throw new ApiError(404, 'Gig not found');
  assertGigOwner(gig, req.user);

  const { freelancerId } = req.body;
  const freelancer = await User.findOne({ _id: freelancerId, role: 'freelancer' });
  if (!freelancer) throw new ApiError(404, 'Freelancer not found');

  if (!gig.invitedFreelancers.some((id) => String(id) === String(freelancerId))) {
    gig.invitedFreelancers.push(freelancerId);
    await gig.save();
  }
  res.json(new ApiResponse(200, { gig }, 'Freelancer invited'));
});

// ---------------------------------------------------------------------------
// Progress tracking — milestone status + log (Module 14)
// ---------------------------------------------------------------------------
const FREELANCER_TRANSITIONS = { pending: 'in_progress', in_progress: 'submitted' };
const CLIENT_TRANSITIONS = { submitted: 'approved' };

export const updateMilestoneStatus = asyncHandler(async (req, res) => {
  const gig = await Gig.findById(req.params.id);
  if (!gig) throw new ApiError(404, 'Gig not found');

  const isOwner = String(gig.client) === String(req.user._id);
  const isFreelancer = String(gig.selectedFreelancer) === String(req.user._id);
  if (!isOwner && !isFreelancer) throw new ApiError(403, 'Not part of this gig');

  const milestone = gig.milestones.id(req.params.milestoneId);
  if (!milestone) throw new ApiError(404, 'Milestone not found');

  const { note } = req.body;
  const allowedNext = isFreelancer ? FREELANCER_TRANSITIONS[milestone.status] : CLIENT_TRANSITIONS[milestone.status];
  if (!allowedNext) {
    throw new ApiError(
      400,
      `${isFreelancer ? 'Freelancer' : 'Client'} cannot move a milestone from "${milestone.status}"`
    );
  }

  milestone.status = allowedNext;
  if (note) milestone.progressLog.push({ note, author: req.user._id });
  await gig.save();

  await notify({
    user: isFreelancer ? gig.client : gig.selectedFreelancer,
    type: 'gig_completed',
    title: `Milestone "${milestone.title}" is now ${allowedNext.replace('_', ' ')}`,
    link: `/gigs/${gig._id}`,
  });

  res.json(new ApiResponse(200, { gig, progress: gig.computeProgress() }, 'Milestone updated'));
});


export const getRecommendedFreelancers = asyncHandler(async (req, res) => {
  const gig = await Gig.findById(req.params.id);
  if (!gig) throw new ApiError(404, 'Gig not found');
  assertGigOwner(gig, req.user);

  const profiles = await FreelancerProfile.find({}).limit(200); // v1: score everyone; add pre-filtering once volume matters
  const userIds = profiles.map((p) => p.user);
  const users = await User.find({ _id: { $in: userIds }, isActive: true });
  const userById = new Map(users.map((u) => [String(u._id), u]));

  const candidates = profiles
    .filter((p) => userById.has(String(p.user)))
    .map((profile) => ({ profile, user: userById.get(String(profile.user)) }));

  const ranked = rankFreelancersForGig(gig, candidates).slice(0, 20);

  res.json(
    new ApiResponse(
      200,
      {
        matches: ranked.map(({ user, profile, matchScore, matchReasons }) => ({
          user: { _id: user._id, name: user.name, avatarUrl: user.avatarUrl, city: user.location?.city },
          profile: {
            headline: profile.headline,
            skills: profile.skills,
            reputationScore: profile.reputationScore,
            hourlyRate: profile.hourlyRate,
            verificationBadge: profile.verificationBadge,
          },
          matchScore,
          matchReasons,
        })),
      },
      'Ranked by skill overlap, reputation, and distance'
    )
  );
});
