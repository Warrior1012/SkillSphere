/**
 * "Weighted reputation score" (PDF Module 8) — weighted by recency using
 * exponential decay, so a bad review from two years ago matters less than
 * one from last week. Half-life of 180 days: a review's weight halves every
 * ~6 months.
 */
const HALF_LIFE_DAYS = 180;

export function computeWeightedReputation(reviews) {
  if (!reviews.length) return { score: 0, totalReviews: 0 };

  const now = Date.now();
  let weightedSum = 0;
  let weightTotal = 0;

  for (const review of reviews) {
    const ageDays = (now - new Date(review.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    const weight = Math.pow(0.5, ageDays / HALF_LIFE_DAYS);
    weightedSum += review.rating * weight;
    weightTotal += weight;
  }

  return {
    score: weightTotal > 0 ? Math.round((weightedSum / weightTotal) * 100) / 100 : 0,
    totalReviews: reviews.length,
  };
}
