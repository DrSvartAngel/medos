// MedOS — Phase 10 Step 2: Study Source Domain Models
// Topic-linked study material entities for offline persistence.

export type StudySourceType = 'text' | 'note' | 'document';

export * from './ingestion';
import type { SourceIngestionMetadata, SourceProvenance } from './ingestion';

export interface StudySource {
  id: string;
  topicId: string;
  title: string;
  content: string;
  sourceType: StudySourceType;
  createdAt: number;
  updatedAt: number;
  /**
   * Phase 12.1 Ingestion Foundation: optional metadata describing provenance,
   * original file details, and processing status.
   */
  metadata?: SourceIngestionMetadata;
  provenance?: SourceProvenance;
}

export interface CreateStudySourceInput {
  topicId: string;
  title: string;
  content: string;
  sourceType?: StudySourceType;
  metadata?: SourceIngestionMetadata;
  provenance?: SourceProvenance;
}

export interface UpdateStudySourceInput {
  title?: string;
  content?: string;
  sourceType?: StudySourceType;
  metadata?: SourceIngestionMetadata;
  provenance?: SourceProvenance;
}

