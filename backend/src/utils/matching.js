/**
 * Matching engine for "recommend freelancers for this gig."
 *
 * The PDF spec names HuggingFace for this. Two reasons that's not what's
 * wired in today: (1) this build environment cannot reach huggingface.co to
 * test against it, and (2) a live demo depending on an untested third-party
 * inference call is a worse bet than a working deterministic algorithm.
 *
 * This scores on skill overlap (Jaccard similarity over lowercased skill
 * names), reputation, and geo distance for non-remote gigs — real signal,
 * real math, fully offline. `scoreSkillOverlap` is the one function you'd
 * replace with an embeddings-based similarity score later; everything else
 * (weighting, distance, ranking) stays the same.
 */

const WEIGHTS = { skill: 0.55, rating: 0.25, distance: 0.2 };
const EARTH_RADIUS_KM = 6371;

export function scoreSkillOverlap(gigSkills = [], freelancerSkills = []) {
  const gigSet = new Set(gigSkills.map((s) => s.toLowerCase().trim()));
  const freelancerSet = new Set(freelancerSkills.map((s) => s.toLowerCase().trim()));
  if (gigSet.size === 0) return 0.5; // no requirement stated — don't penalize

  let intersection = 0;
  for (const skill of gigSet) {
    if (freelancerSet.has(skill)) intersection += 1;
  }
  const union = new Set([...gigSet, ...freelancerSet]).size;
  return union === 0 ? 0 : intersection / union; // Jaccard similarity, 0..1
}

function haversineKm([lng1, lat1], [lng2, lat2]) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function scoreDistance(gig, freelancerUser) {
  if (gig.isRemote) return 1; // distance irrelevant for remote work
  const gigCoords = gig.location?.coordinates;
  const freelancerCoords = freelancerUser.location?.coordinates;
  if (!gigCoords || !freelancerCoords || (gigCoords[0] === 0 && gigCoords[1] === 0)) return 0.5;

  const km = haversineKm(gigCoords, freelancerCoords);
  // Full score within 5km, linear falloff to 0 at 100km+ — reasonable for "hyperlocal"
  if (km <= 5) return 1;
  if (km >= 100) return 0;
  return 1 - (km - 5) / 95;
}

/**
 * @param {object} gig - Gig document (needs skillsRequired, isRemote, location)
 * @param {Array<{ user: object, profile: object }>} candidates - freelancer User + FreelancerProfile pairs
 * @returns candidates sorted by score desc, each annotated with `matchScore` (0-100) and `matchReasons`
 */
export function rankFreelancersForGig(gig, candidates) {
  return candidates
    .map(({ user, profile }) => {
      const skillScore = scoreSkillOverlap(gig.skillsRequired, (profile.skills || []).map((s) => s.name));
      const ratingScore = (profile.reputationScore || 0) / 5;
      const distanceScore = scoreDistance(gig, user);

      const total = skillScore * WEIGHTS.skill + ratingScore * WEIGHTS.rating + distanceScore * WEIGHTS.distance;

      const reasons = [];
      if (skillScore > 0.5) reasons.push('Strong skill match');
      else if (skillScore > 0) reasons.push('Partial skill match');
      if (ratingScore >= 0.8) reasons.push('Highly rated');
      if (!gig.isRemote && distanceScore >= 0.8) reasons.push('Nearby');

      return { user, profile, matchScore: Math.round(total * 100), matchReasons: reasons };
    })
    .sort((a, b) => b.matchScore - a.matchScore);
}
