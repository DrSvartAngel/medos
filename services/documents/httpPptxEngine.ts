// MedOS — Phase 12.3: HTTP PPTX Extraction Engine
// Concrete PptxExtractionEngine communicating with the dedicated extraction boundary.

import {
  type DocumentInput,
  MAX_DOCUMENT_FILE_SIZE_BYTES,
  MAX_DOCUMENT_TEXT_LENGTH,
} from './documentTypes';
import {
  type ExtractedSlide,
  type PptxExtractionEngine,
  type PptxExtractionResult,
  buildSlideStructuredText,
} from './pptxTypes';
import { getPptxExtractionEndpoint } from './pptxConfig';

export class HttpPptxExtractionEngine implements PptxExtractionEngine {
  readonly id = 'http-pptx-extraction-engine';
  readonly name = 'MedOS Dedicated PPTX Slide Service';

  private customEndpoint: string | null = null;

  constructor(endpoint?: string) {
    if (endpoint) {
      this.customEndpoint = endpoint.replace(/\/+$/, '');
    }
  }

  private getEndpoint(): string | null {
    return this.customEndpoint ?? getPptxExtractionEndpoint();
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

  async extract(input: DocumentInput): Promise<PptxExtractionResult> {
    const endpoint = this.getEndpoint();
    if (!endpoint) {
      return {
        status: 'unavailable',
        text: '',
        canonicalType: 'pptx',
        warnings: ['endpoint_not_configured'],
        errorMessage: 'PPTX extraction service endpoint is not configured.',
      };
    }

    if (!input || !input.uri) {
      return {
        status: 'failed',
        text: '',
        errorMessage: 'Invalid presentation document input',
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
      // 1. Read binary bytes of the presentation file
      let bodyData: Uint8Array | ArrayBuffer | string | null = null;
      const contentType =
        input.mimeType ?? 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

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

      if (FileClass) {
        const file = new FileClass(input.uri);
        bodyData = await file.bytes();
      } else {
        try {
          const res = await fetch(input.uri);
          bodyData = await res.arrayBuffer();
        } catch {
          // Ignore
        }
      }

      if (!bodyData) {
        return {
          status: 'failed',
          text: '',
          errorMessage: 'Could not read presentation file content.',
        };
      }

      // 2. Post to /extract or /extract-pptx with bounded 30s timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(`${endpoint}/extract`, {
        method: 'POST',
        headers: {
          'Content-Type': contentType,
        },
        body: bodyData as unknown as BodyInit,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errJson = await response.json().catch(() => null);
        const errMsg =
          errJson?.errorMessage ?? `PPTX extraction service failed with HTTP ${response.status}`;
        const status = response.status === 413 ? 'file_too_large' : 'failed';
        return {
          status,
          text: '',
          errorMessage: errMsg,
          warnings: ['http_error_' + response.status],
        };
      }

      const data = await response.json();

      if (!data || !Array.isArray(data.slides)) {
        return {
          status: 'failed',
          text: '',
          errorMessage: 'Malformed response received from slide extraction service.',
          warnings: ['malformed_response'],
        };
      }

      const slides: ExtractedSlide[] = data.slides.map((s: any, idx: number) => ({
        slideNumber: typeof s.slideNumber === 'number' ? s.slideNumber : idx + 1,
        title: typeof s.title === 'string' ? s.title.trim() : undefined,
        text: typeof s.text === 'string' ? s.text.trim() : '',
        notes: typeof s.notes === 'string' ? s.notes.trim() : undefined,
        tables: Array.isArray(s.tables) ? s.tables : undefined,
        images: Array.isArray(s.images) ? s.images : undefined,
      }));

      const hasText = slides.some(
        (s) => s.text.length > 0 || (s.notes && s.notes.length > 0)
      );

      // 3. Build slide-structured text and character-level provenance
      const { formattedText, provenanceList } = buildSlideStructuredText(
        slides,
        input.name,
        input.name,
        ''
      );

      if (formattedText.length > MAX_DOCUMENT_TEXT_LENGTH) {
        return {
          status: 'text_too_long',
          text: formattedText,
          slideCount: slides.length,
          slides,
          provenance: provenanceList,
          errorMessage: `Extracted content exceeds the ${MAX_DOCUMENT_TEXT_LENGTH.toLocaleString()} character limit.`,
        };
      }

      const processingStatus = hasText ? 'ready' : (slides.length > 0 ? 'partial' : 'failed');
      const extractionStatus = hasText ? 'success' : (slides.length > 0 ? 'partial' : 'empty');

      return {
        status: extractionStatus,
        text: formattedText,
        slideCount: slides.length,
        canonicalType: 'pptx',
        slides,
        provenance: provenanceList,
        metadata: {
          originalFileName: input.name,
          mimeType: contentType,
          fileSizeBytes: input.size,
          origin: 'file_import',
          canonicalType: 'pptx',
          processingStatus,
          slideCount: slides.length,
          lastProcessedAt: Date.now(),
          warnings: data.warnings,
        },
        warnings: data.warnings,
      };
    } catch (err: unknown) {
      const isAbort = err instanceof Error && err.name === 'AbortError';
      const msg = isAbort
        ? 'PPTX extraction timed out after 30 seconds.'
        : (err instanceof Error ? err.message : 'Network error during slide extraction');

      return {
        status: 'failed',
        text: '',
        errorMessage: msg,
        warnings: ['network_or_timeout_failure'],
      };
    }
  }
}
