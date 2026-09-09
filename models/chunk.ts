// MedOS — Phase 12.5: Canonical Source Chunk Domain Models
// Discrete, provenance-preserving knowledge units for local source indexing and retrieval.

import type { ExtractionMethod, SourceProvenance } from './ingestion';

export type ChunkType =
  | 'paragraph'
  | 'section'
  | 'slide'
  | 'speaker_note'
  | 'table'
  | 'ocr'
  | 'visual_description'
  | 'mixed';

export interface SourceChunk {
  id: string;
  sourceId: string;
  topicId: string;
  sourceTitle: string;

  ordinal: number;
  chunkType: ChunkType;
  text: string;

  pageNumber?: number;
  slideNumber?: number;
  sectionTitle?: string;
  mediaId?: string;
  imageIndex?: number;

  extractionMethod: ExtractionMethod;

  charStart?: number;
  charEnd?: number;

  tokenEstimate: number;
  wordCount: number;

  fingerprint: string;

  createdAt: number;
  updatedAt: number;
}

export interface CreateSourceChunkInput {
  id?: string;
  sourceId: string;
  topicId: string;
  sourceTitle: string;
  ordinal: number;
  chunkType: ChunkType;
  text: string;
  pageNumber?: number;
  slideNumber?: number;
  sectionTitle?: string;
  mediaId?: string;
  imageIndex?: number;
  extractionMethod?: ExtractionMethod;
  charStart?: number;
  charEnd?: number;
  tokenEstimate?: number;
  wordCount?: number;
  fingerprint?: string;
  createdAt?: number;
  updatedAt?: number;
}

export interface ChunkSearchOptions {
  query: string;
  topicId?: string;
  sourceId?: string;
  extractionMethod?: ExtractionMethod;
  chunkType?: ChunkType;
  limit?: number;
}

export interface ChunkSearchResult {
  chunk: SourceChunk;
  score?: number;
  matchTerms?: string[];
  provenance: SourceProvenance;
}
