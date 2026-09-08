// MedOS — Phase 10 Step 8: Document Extraction Types, Constants, and Helpers
// Dependency-neutral contracts, limits, and utilities for local document ingestion.

export const MAX_DOCUMENT_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_DOCUMENT_TEXT_LENGTH = 100_000; // 100,000 characters

export type ExtractionStatus =
  | 'success'
  | 'unavailable'
  | 'empty'
  | 'unsupported'
  | 'failed'
  | 'file_too_large'
  | 'text_too_long';

export interface DocumentInput {
  uri: string;
  name: string;
  mimeType?: string;
  size?: number;
}

import type { CanonicalSourceType, SourceIngestionMetadata } from '@/models/ingestion';

export interface DocumentExtractionResult {
  status: ExtractionStatus;
  text: string;
  pageCount?: number;
  canonicalType?: CanonicalSourceType;
  metadata?: SourceIngestionMetadata;
  warnings?: string[];
  errorMessage?: string;
}


export interface DocumentExtractor {
  extract(input: DocumentInput): Promise<DocumentExtractionResult>;
  isSupported(mimeType?: string, fileName?: string): boolean;
}

/**
 * Normalizes extracted text:
 * - Converts CRLF to LF
 * - Strips null bytes and unusual control characters (preserving tab and newline)
 * - Collapses excessive (3+) blank lines down to 2
 * - Trims leading and trailing whitespace
 */
export function normalizeExtractedText(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Strips file extension for default source title generation.
 */
export function cleanDocumentTitle(fileName: string): string {
  if (!fileName) return '';
  return fileName.replace(/\.[a-zA-Z0-9]+$/, '').trim();
}

/**
 * Formats byte counts into human-readable strings (KB, MB).
 */
export function formatDocumentFileSize(bytes?: number): string {
  if (bytes === undefined || bytes === null || isNaN(bytes)) {
    return '—';
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
