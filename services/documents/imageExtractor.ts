// MedOS — Phase 12.4: Standalone Image Document Extractor
// Provider-neutral extractor for PNG, JPEG, and WebP images.

import {
  type DocumentExtractor,
  type DocumentInput,
  type DocumentExtractionResult,
  MAX_DOCUMENT_FILE_SIZE_BYTES,
  MAX_DOCUMENT_TEXT_LENGTH,
} from './documentTypes';
import { HttpImageExtractionEngine } from './httpImageEngine';
import { getPdfExtractionEndpoint } from './pdfConfig';

let activeImageEngine: HttpImageExtractionEngine | null = null;

export function setImageExtractionEngine(engine: HttpImageExtractionEngine | null): void {
  activeImageEngine = engine;
}

export function getImageExtractionEngine(): HttpImageExtractionEngine | null {
  if (activeImageEngine !== null) {
    return activeImageEngine;
  }
  const endpoint = getPdfExtractionEndpoint();
  if (endpoint) {
    return new HttpImageExtractionEngine(endpoint);
  }
  return null;
}

export class ImageExtractor implements DocumentExtractor {
  isSupported(mimeType?: string, fileName?: string): boolean {
    const mime = (mimeType || '').toLowerCase();
    const name = (fileName || '').toLowerCase();

    const isImage =
      mime === 'image/png' ||
      mime === 'image/jpeg' ||
      mime === 'image/jpg' ||
      mime === 'image/webp' ||
      name.endsWith('.png') ||
      name.endsWith('.jpg') ||
      name.endsWith('.jpeg') ||
      name.endsWith('.webp');

    if (!isImage) return false;
    return getImageExtractionEngine() !== null;
  }

  async extract(input: DocumentInput): Promise<DocumentExtractionResult> {
    if (!input || !input.uri) {
      return {
        status: 'failed',
        text: '',
        errorMessage: 'Invalid image input',
      };
    }

    if (input.size !== undefined && input.size > MAX_DOCUMENT_FILE_SIZE_BYTES) {
      return {
        status: 'file_too_large',
        text: '',
        errorMessage: 'File size exceeds maximum allowed 5 MB limit',
      };
    }

    const engine = getImageExtractionEngine();
    if (engine) {
      try {
        const isReady = await engine.isAvailable();
        if (isReady) {
          const result = await engine.extract(input);
          if (result.text && result.text.length > MAX_DOCUMENT_TEXT_LENGTH) {
            return {
              ...result,
              status: 'text_too_long',
              errorMessage: `Extracted content exceeds the ${MAX_DOCUMENT_TEXT_LENGTH.toLocaleString()} character limit.`,
            };
          }
          return result;
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Image extraction failed';
        return {
          status: 'failed',
          text: '',
          errorMessage: `Image OCR error: ${message}`,
          warnings: ['engine_execution_failed'],
        };
      }
    }

    return {
      status: 'unavailable',
      text: '',
      canonicalType: 'image',
      metadata: {
        originalFileName: input.name,
        mimeType: input.mimeType || 'image/png',
        fileSizeBytes: input.size,
        origin: 'file_import',
        canonicalType: 'image',
        processingStatus: 'partial',
        lastProcessedAt: Date.now(),
        warnings: ['image_extraction_service_unconfigured'],
      },
      warnings: ['image_extraction_service_unconfigured'],
      errorMessage:
        'Image OCR extraction is unavailable. Please ensure the extraction service is configured.',
    };
  }
}

export const imageExtractor = new ImageExtractor();
