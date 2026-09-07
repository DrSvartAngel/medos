// MedOS — Phase 10 Step 8: Document Extraction Architecture
// Provider-neutral contracts and limits for local document ingestion.

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

export interface DocumentExtractionResult {
  status: ExtractionStatus;
  text: string;
  pageCount?: number;
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

import { pdfExtractor } from './pdfExtractor';
import { textExtractor } from './textExtractor';

export class CompositeDocumentExtractor implements DocumentExtractor {
  isSupported(mimeType?: string, fileName?: string): boolean {
    return (
      textExtractor.isSupported(mimeType, fileName) ||
      (mimeType === 'application/pdf' || (fileName ? fileName.toLowerCase().endsWith('.pdf') : false))
    );
  }

  async extract(input: DocumentInput): Promise<DocumentExtractionResult> {
    if (!input || !input.uri) {
      return {
        status: 'failed',
        text: '',
        errorMessage: 'Invalid document input',
      };
    }

    if (input.size !== undefined && input.size > MAX_DOCUMENT_FILE_SIZE_BYTES) {
      return {
        status: 'file_too_large',
        text: '',
        errorMessage: 'File size exceeds 5 MB limit',
      };
    }

    const mime = input.mimeType?.toLowerCase();
    const name = input.name?.toLowerCase() ?? '';

    // Check if plain text / markdown
    if (textExtractor.isSupported(mime, name)) {
      return await textExtractor.extract(input);
    }

    // Check if PDF
    if (mime === 'application/pdf' || name.endsWith('.pdf')) {
      return await pdfExtractor.extract(input);
    }

    return {
      status: 'unsupported',
      text: '',
      errorMessage: 'Unsupported document format. Please select a PDF or plain text file.',
    };
  }
}

export const documentExtractor = new CompositeDocumentExtractor();

