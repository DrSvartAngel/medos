// MedOS — Phase 12.3: PPTX Presentation Document Extractor
// Provider-neutral facade for extracting slide structure, tables, notes, and provenance.

import {
  type DocumentExtractor,
  type DocumentInput,
  MAX_DOCUMENT_FILE_SIZE_BYTES,
  MAX_DOCUMENT_TEXT_LENGTH,
} from './documentTypes';
import type { PptxExtractionEngine, PptxExtractionResult } from './pptxTypes';
import { getPptxExtractionEndpoint } from './pptxConfig';
import { HttpPptxExtractionEngine } from './httpPptxEngine';

export * from './pptxTypes';
export * from './pptxConfig';
export * from './httpPptxEngine';

let activePptxEngine: PptxExtractionEngine | null = null;

export function setPptxExtractionEngine(engine: PptxExtractionEngine | null): void {
  activePptxEngine = engine;
}

export function getPptxExtractionEngine(): PptxExtractionEngine | null {
  if (activePptxEngine !== null) {
    return activePptxEngine;
  }
  const endpoint = getPptxExtractionEndpoint();
  if (endpoint) {
    return new HttpPptxExtractionEngine(endpoint);
  }
  return null;
}

export class PptxExtractor implements DocumentExtractor {
  isSupported(mimeType?: string, fileName?: string): boolean {
    const isPptx =
      mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
      mimeType === 'application/vnd.ms-powerpoint' ||
      (fileName ? fileName.toLowerCase().endsWith('.pptx') || fileName.toLowerCase().endsWith('.ppt') : false);

    if (!isPptx) return false;
    return getPptxExtractionEngine() !== null;
  }

  async extract(input: DocumentInput): Promise<PptxExtractionResult> {
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

    const engine = getPptxExtractionEngine();
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
        const message = err instanceof Error ? err.message : 'PPTX extraction engine failed';
        return {
          status: 'failed',
          text: '',
          errorMessage: `PPTX extraction error: ${message}`,
          warnings: ['engine_execution_failed'],
        };
      }
    }

    // Truthful capability boundary when offline or unconfigured
    return {
      status: 'unavailable',
      text: '',
      canonicalType: 'pptx',
      metadata: {
        originalFileName: input.name,
        mimeType: input.mimeType ?? 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        fileSizeBytes: input.size,
        origin: 'file_import',
        canonicalType: 'pptx',
        processingStatus: 'partial',
        lastProcessedAt: Date.now(),
        warnings: ['pptx_extraction_service_unconfigured'],
      },
      warnings: ['pptx_extraction_service_unconfigured'],
      errorMessage:
        'Slide extraction is unavailable in the current offline runtime. Please use manual text import or paste the content below.',
    };
  }
}

export const pptxExtractor = new PptxExtractor();
