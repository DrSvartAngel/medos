export interface QBankSession {
  id: string;
  topicId: string | null;
  totalQuestions: number;
  correctCount: number;
  durationSec: number | null;
  sourceName: string | null;
  createdAt: number;
}

export interface CreateQBankSessionInput {
  topicId?: string | null;
  totalQuestions: number;
  correctCount: number;
  durationSec?: number | null;
  sourceName?: string | null;
}

export interface QBankEvidenceSummary {
  totalQuestions: number;
  correctCount: number;
  accuracyPercent: number | null;
}
