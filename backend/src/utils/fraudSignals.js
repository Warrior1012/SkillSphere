const NEW_ACCOUNT_DAYS = 3;
const SUSPICIOUSLY_FAST_MINUTES = 2;

/**
 * Real, explainable heuristics — not a black box. Each one is a rule you can
 * say out loud in a review. Flags accumulate; they don't block submission
 * (an admin moderation queue to act on flags is Week 4's Admin Dashboard).
 */
export function evaluateReviewForFraudSignals({ reviewerCreatedAt, gigCompletedAt, rating }) {
  const reasons = [];
  const now = Date.now();

  const accountAgeDays = (now - new Date(reviewerCreatedAt).getTime()) / (1000 * 60 * 60 * 24);
  if (accountAgeDays < NEW_ACCOUNT_DAYS) {
    reasons.push(`Reviewer account is less than ${NEW_ACCOUNT_DAYS} days old`);
  }

  if (gigCompletedAt) {
    const minutesSinceCompletion = (now - new Date(gigCompletedAt).getTime()) / (1000 * 60);
    if (minutesSinceCompletion < SUSPICIOUSLY_FAST_MINUTES && rating === 5) {
      reasons.push('5-star review posted within minutes of gig completion');
    }
  }

  return { flagged: reasons.length > 0, reasons };
}
