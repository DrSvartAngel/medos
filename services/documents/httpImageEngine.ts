// MedOS — Phase 12.4: HTTP Image Extraction Engine
// Concrete image extraction engine for standalone PNG, JPEG, and WebP files.

import {
  type DocumentInput,
  type DocumentExtractionResult,
  MAX_DOCUMENT_FILE_SIZE_BYTES,
  MAX_DOCUMENT_TEXT_LENGTH,
  normalizeExtractedText,
} from './documentTypes';
import { getPdfExtractionEndpoint } from './pdfConfig';
import type { SourceProvenance } from '@/models/ingestion';

export interface ImageExtractionResult extends DocumentExtractionResult {
  confidence?: number;
  provenance?: SourceProvenance[];
  warnings?: string[];
}

export class HttpImageExtractionEngine {
  readonly id = 'http-image-extraction-engine';
  readonly name = 'MedOS Dedicated Image Extraction Service';

  private customEndpoint: string | null = null;

  constructor(endpoint?: string) {
    if (endpoint) {
      this.customEndpoint = endpoint.replace(/\/+$/, '');
    }
  }

  private getEndpoint(): string | null {
    return this.customEndpoint ?? getPdfExtractionEndpoint();
  }

  async isAvailable(): Promise<boolean> {
    const endpoint = this.getEndpoint();
    if (!endpoint) return false;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${endpoint}/health`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return res.ok;
    } catch {
      return false;
    }
  }

  async extract(input: DocumentInput): Promise<ImageExtractionResult> {
    const endpoint = this.getEndpoint();
    if (!endpoint) {
      return {
        status: 'unavailable',
        text: '',
        canonicalType: 'image',
        warnings: ['endpoint_not_configured'],
        errorMessage: 'Image extraction service endpoint is not configured.',
      };
    }

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
      let bodyData: Uint8Array | ArrayBuffer | string | null = null;
      let contentType = input.mimeType || 'image/png';

      let FileClass: any = null;
      try {
        if (typeof require !== 'undefined') {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const expoFs = require('expo-file-system');
          FileClass = expoFs?.File ?? null;
        }
      } catch {
        // Ignore
      }

      if (!FileClass) {
        try {
          const esmFs = await import('expo-file-system');
          FileClass = esmFs?.File ?? null;
        } catch {
          // Ignore
        }
      }

      if (FileClass && typeof FileClass === 'function') {
        try {
          const fileObj = new FileClass(input.uri);
          if (fileObj && typeof fileObj.bytes === 'function') {
            bodyData = await fileObj.bytes();
          }
        } catch {
          bodyData = null;
        }
      }

      if (!bodyData && typeof require !== 'undefined') {
        try {
          const fs = require('fs');
          if (fs.existsSync(input.uri)) {
            bodyData = fs.readFileSync(input.uri);
          }
        } catch {
          // Ignore
        }
      }

      if (!bodyData) {
        try {
          const response = await fetch(input.uri);
          if (response.ok) {
            bodyData = await response.arrayBuffer();
          }
        } catch {
          // Ignore
        }
      }

      if (!bodyData) {
        return {
          status: 'failed',
          text: '',
          errorMessage: 'Unable to read local image bytes from filesystem.',
        };
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 35000);

      const response = await fetch(`${endpoint}/extract-image`, {
        method: 'POST',
        headers: {
          'Content-Type': contentType,
        },
        body: bodyData as any,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMsg = `Server error HTTP ${response.status}`;
        try {
          const errorJson = await response.json();
          if (errorJson.errorMessage) errorMsg = errorJson.errorMessage;
        } catch {
          // Ignore
        }
        return {
          status: response.status === 413 ? 'file_too_large' : 'failed',
          text: '',
          errorMessage: errorMsg,
        };
      }

      const parsed = await response.json();
      const rawText = parsed.text || '';
      const normalized = normalizeExtractedText(rawText);

      const provenance: SourceProvenance[] = [
        {
          sourceId: '',
          sourceTitle: input.name,
          topicId: '',
          imageIndex: 1,
          excerpt: normalized.slice(0, 150),
          extractionMethod: 'ocr',
          confidence: parsed.confidence,
        },
      ];

      return {
        status: normalized.length > 0 ? 'success' : 'empty',
        text: normalized,
        canonicalType: 'image',
        confidence: parsed.confidence,
        provenance,
        warnings: parsed.warnings,
        metadata: {
          originalFileName: input.name,
          mimeType: input.mimeType || 'image/png',
          fileSizeBytes: input.size,
          origin: 'file_import',
          canonicalType: 'image',
          processingStatus: normalized.length > 0 ? 'ready' : 'partial',
          imageCount: 1,
          lastProcessedAt: Date.now(),
          warnings: parsed.warnings,
        },
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Network error';
      return {
        status: 'failed',
        text: '',
        errorMessage: `Image OCR extraction error: ${message}`,
      };
    }
  }
}
