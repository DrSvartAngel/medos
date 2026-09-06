import { topicReviewEvidenceState } from './topicEvidenceRules';

export interface SubjectTopicEvidence {
  id: string; name: string; studyRecorded: number; linkedCards: number;
  linkedReviews: number; dueCards: number; nextReviewAt: number | null;
}

export function summarizeSubjectEvidence(rows: SubjectTopicEvidence[]) {
  return rows.reduce((sum, row) => ({
    topics: sum.topics + 1,
    studiedTopics: sum.studiedTopics + (row.studyRecorded === 1 ? 1 : 0),
    linkedCards: sum.linkedCards + row.linkedCards,
    linkedReviews: sum.linkedReviews + row.linkedReviews,
    dueCards: sum.dueCards + row.dueCards,
    attentionTopics: sum.attentionTopics + (topicReviewEvidenceState(row) === 'attention' ? 1 : 0),
    nextReviewAt: row.nextReviewAt === null ? sum.nextReviewAt
      : sum.nextReviewAt === null ? row.nextReviewAt : Math.min(sum.nextReviewAt, row.nextReviewAt),
  }), { topics: 0, studiedTopics: 0, linkedCards: 0, linkedReviews: 0, dueCards: 0,
    attentionTopics: 0, nextReviewAt: null as number | null });
}

export function filterSubjectEvidence(rows: SubjectTopicEvidence[], attentionOnly: boolean) {
  return attentionOnly ? rows.filter(row => topicReviewEvidenceState(row) === 'attention') : rows;
}
