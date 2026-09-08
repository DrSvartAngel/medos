// MedOS — Phase 10 Step 8: Plain Text Extractor
// Reads and normalizes text/plain and markdown documents.

import {
  type DocumentExtractor,
  type DocumentInput,
  type DocumentExtractionResult,
  MAX_DOCUMENT_FILE_SIZE_BYTES,
  MAX_DOCUMENT_TEXT_LENGTH,
  normalizeExtractedText,
} from './documentTypes';

export class TextExtractor implements DocumentExtractor {
  isSupported(mimeType?: string, fileName?: string): boolean {
    if (mimeType && (mimeType.startsWith('text/') || mimeType === 'application/json')) {
      return true;
    }
    if (fileName) {
      const lower = fileName.toLowerCase();
      return (
        lower.endsWith('.txt') ||
        lower.endsWith('.md') ||
        lower.endsWith('.text') ||
        lower.endsWith('.markdown') ||
        lower.endsWith('.json')
      );
    }
    return false;
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
        errorMessage: 'File size exceeds maximum allowed 5 MB limit',
      };
    }

    try {
      let rawText = '';
      try {
        const { File } = await import('expo-file-system');
        if (File) {
          const file = new File(input.uri);
          rawText = await file.text();
        }
      } catch {
        // Fallback for web or environments where expo-file-system native binding is mocked
        const response = await fetch(input.uri);
        rawText = await response.text();
      }

      const normalized = normalizeExtractedText(rawText);

      if (!normalized) {
        return {
          status: 'empty',
          text: '',
          errorMessage: 'Document contains no readable text.',
        };
      }

      if (normalized.length > MAX_DOCUMENT_TEXT_LENGTH) {
        return {
          status: 'text_too_long',
          text: normalized,
          errorMessage: `Extracted content exceeds the ${MAX_DOCUMENT_TEXT_LENGTH.toLocaleString()} character limit.`,
        };
      }

      return {
        status: 'success',
        text: normalized,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown extraction error';
      return {
        status: 'failed',
        text: '',
        errorMessage: `Failed to read document: ${message}`,
      };
    }
  }
}

export const textExtractor = new TextExtractor();
