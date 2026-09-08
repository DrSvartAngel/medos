import {
  type DocumentExtractor,
  type DocumentInput,
  type DocumentExtractionResult,
  MAX_DOCUMENT_FILE_SIZE_BYTES,
  MAX_DOCUMENT_TEXT_LENGTH,
  normalizeExtractedText,
} from './documentTypes';
import type { PdfExtractionEngine, PdfExtractionResult } from './pdfTypes';
import { getPdfExtractionEndpoint } from './pdfConfig';
import { HttpPdfExtractionEngine } from './httpPdfEngine';
export * from './pdfTypes';
export * from './pdfConfig';
export * from './httpPdfEngine';

let activePdfEngine: PdfExtractionEngine | null = null;

/**
 * Allows injecting or configuring an external PDF extraction engine (cloud worker, serverless function, or mock engine).
 */
export function setPdfExtractionEngine(engine: PdfExtractionEngine | null): void {
  activePdfEngine = engine;
}

export function getPdfExtractionEngine(): PdfExtractionEngine | null {
  if (activePdfEngine !== null) {
    return activePdfEngine;
  }
  const endpoint = getPdfExtractionEndpoint();
  if (endpoint) {
    return new HttpPdfExtractionEngine(endpoint);
  }
  return null;
}

export class PdfExtractor implements DocumentExtractor {
  /**
   * Checks whether PDF extraction is supported in the current environment.
   * If a PDF extraction engine has been registered and is configured, returns true.
   * In standard Expo Go / Hermes without custom native modules or configured engine, returns false.
   */
  isSupported(mimeType?: string, fileName?: string): boolean {
    const isPdf =
      mimeType === 'application/pdf' ||
      (fileName ? fileName.toLowerCase().endsWith('.pdf') : false);
    if (!isPdf) return false;

    // Truthful runtime boundary: supported if an active engine is registered or configured
    return getPdfExtractionEngine() !== null;
  }

  async extract(input: DocumentInput): Promise<PdfExtractionResult> {
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

    // If an engine is registered or configured and ready, delegate to it
    const engine = getPdfExtractionEngine();
    if (engine) {
      try {
        const isReady = await engine.isAvailable();
        if (isReady) {
          const result = await engine.extract(input);
          // Post-process normalized text bounds
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
        const message = err instanceof Error ? err.message : 'PDF extraction engine failed';
        return {
          status: 'failed',
          text: '',
          errorMessage: `PDF extraction error: ${message}`,
          warnings: ['engine_execution_failed'],
        };
      }
    }

    // Truthful capability boundary when no extraction engine is configured:
    // Report unavailable so the UI can activate the manual text import fallback.
    return {
      status: 'unavailable',
      text: '',
      canonicalType: 'pdf',
      metadata: {
        originalFileName: input.name,
        mimeType: input.mimeType ?? 'application/pdf',
        fileSizeBytes: input.size,
        origin: 'file_import',
        canonicalType: 'pdf',
        processingStatus: 'partial',
        lastProcessedAt: Date.now(),
        warnings: ['pdf_extraction_service_unconfigured'],
      },
      warnings: ['pdf_extraction_service_unconfigured'],
      errorMessage:
        'On-device PDF text extraction is unavailable in the current Expo/Hermes runtime. Please use manual text import or paste the content below.',
    };
  }
}

export const pdfExtractor = new PdfExtractor();

