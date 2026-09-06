export interface CommitteeSubjectEvidence {
  id: string; name: string; topics: number; studiedTopics: number; linkedCards: number;
  linkedReviews: number; dueCards: number; attentionTopics: number; nextReviewAt: number | null;
}

export function summarizeCommitteeEvidence(rows: CommitteeSubjectEvidence[]) {
  return rows.reduce((sum, row) => ({
    subjects: sum.subjects + 1, topics: sum.topics + row.topics,
    studiedTopics: sum.studiedTopics + row.studiedTopics,
    linkedCards: sum.linkedCards + row.linkedCards, linkedReviews: sum.linkedReviews + row.linkedReviews,
    dueCards: sum.dueCards + row.dueCards, attentionTopics: sum.attentionTopics + row.attentionTopics,
    attentionSubjects: sum.attentionSubjects + (row.attentionTopics > 0 ? 1 : 0),
    nextReviewAt: row.nextReviewAt === null ? sum.nextReviewAt
      : sum.nextReviewAt === null ? row.nextReviewAt : Math.min(sum.nextReviewAt,row.nextReviewAt),
  }), { subjects:0,topics:0,studiedTopics:0,linkedCards:0,linkedReviews:0,dueCards:0,
    attentionTopics:0,attentionSubjects:0,nextReviewAt:null as number | null });
}

export function filterCommitteeEvidence(rows: CommitteeSubjectEvidence[], attentionOnly: boolean) {
  return attentionOnly ? rows.filter(row => row.attentionTopics > 0) : rows;
}
