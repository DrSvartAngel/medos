// MedOS — Phase 10 Step 2: Study Source Domain Models
// Topic-linked study material entities for offline persistence.

export type StudySourceType = 'text' | 'note' | 'document';

export interface StudySource {
  id: string;
  topicId: string;
  title: string;
  content: string;
  sourceType: StudySourceType;
  createdAt: number;
  updatedAt: number;
}

export interface CreateStudySourceInput {
  topicId: string;
  title: string;
  content: string;
  sourceType?: StudySourceType;
}

export interface UpdateStudySourceInput {
  title?: string;
  content?: string;
  sourceType?: StudySourceType;
}
