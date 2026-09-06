/** A review-attention cue, not an assessment of knowledge. Focus is not an input. */
export function topicReviewEvidenceState(evidence: { linkedReviews: number; dueCards: number }):
  'attention' | 'available' | 'insufficient' {
  if (![evidence.linkedReviews, evidence.dueCards].every(n => Number.isSafeInteger(n) && n >= 0)) {
    throw new Error('Invalid evidence');
  }
  if (evidence.linkedReviews === 0) return 'insufficient';
  return evidence.dueCards > 0 ? 'attention' : 'available';
}
