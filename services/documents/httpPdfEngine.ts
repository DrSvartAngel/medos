// MedOS — Phase 12.2: HTTP PDF Extraction Engine
// Concrete, production-grade PdfExtractionEngine that communicates with the extraction boundary.

import {
  type DocumentInput,
  MAX_DOCUMENT_FILE_SIZE_BYTES,
  MAX_DOCUMENT_TEXT_LENGTH,
} from './documentTypes';
import {
  type ExtractedPdfPage,
  type PdfExtractionEngine,
  type PdfExtractionResult,
  buildPageStructuredText,
} from './pdfTypes';
import { getPdfExtractionEndpoint } from './pdfConfig';

export class HttpPdfExtractionEngine implements PdfExtractionEngine {
  readonly id = 'http-pdf-extraction-engine';
  readonly name = 'MedOS Dedicated PDF Service';

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

  async extract(input: DocumentInput): Promise<PdfExtractionResult> {
    const endpoint = this.getEndpoint();
    if (!endpoint) {
      return {
        status: 'unavailable',
        text: '',
        canonicalType: 'pdf',
        warnings: ['endpoint_not_configured'],
        errorMessage: 'PDF extraction service endpoint is not configured.',
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
      // 1. Read binary bytes of the explicitly selected PDF
      let bodyData: Uint8Array | ArrayBuffer | string | null = null;
      let contentType = 'application/pdf';

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
          errorMessage: 'Could not read document file content.',
        };
      }

      // 2. Call extraction endpoint with bounded timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

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
        const errMsg = errJson?.errorMessage ?? `Extraction service failed with HTTP ${response.status}`;
        const status = response.status === 413 ? 'file_too_large' : 'failed';
        return {
          status,
          text: '',
          errorMessage: errMsg,
          warnings: ['http_error_' + response.status],
        };
      }

      const data = await response.json();

      if (!data || !Array.isArray(data.pages)) {
        return {
          status: 'failed',
          text: '',
          errorMessage: 'Malformed response received from extraction service.',
          warnings: ['malformed_response'],
        };
      }

      const pages: ExtractedPdfPage[] = data.pages.map((p: any, idx: number) => ({
        pageNumber: typeof p.pageNumber === 'number' ? p.pageNumber : idx + 1,
        text: typeof p.text === 'string' ? p.text.trim() : '',
        headings: Array.isArray(p.headings) ? p.headings : undefined,
      }));

      const hasText = pages.some((p) => p.text.length > 0);
      const isScannedOnly = data.warnings?.includes('scanned_or_image_only_pdf_requires_ocr') || (!hasText && pages.length > 0);

      // 3. Build page-structured text and calculate precise provenance
      const { formattedText, provenanceList } = buildPageStructuredText(
        pages,
        input.name,
        input.name,
        ''
      );

      if (formattedText.length > MAX_DOCUMENT_TEXT_LENGTH) {
        return {
          status: 'text_too_long',
          text: formattedText,
          pageCount: pages.length,
          pages,
          provenance: provenanceList,
          errorMessage: `Extracted content exceeds the ${MAX_DOCUMENT_TEXT_LENGTH.toLocaleString()} character limit.`,
        };
      }

      const processingStatus = hasText ? 'ready' : (isScannedOnly ? 'partial' : 'failed');
      const extractionStatus = hasText ? 'success' : (isScannedOnly ? 'partial' : 'empty');

      const warnings = data.warnings ?? [];
      if (isScannedOnly && !warnings.includes('scanned_or_image_only_pdf_requires_ocr')) {
        warnings.push('scanned_or_image_only_pdf_requires_ocr');
      }

      return {
        status: extractionStatus,
        text: formattedText,
        pageCount: pages.length,
        canonicalType: 'pdf',
        pages,
        provenance: provenanceList,
        metadata: {
          originalFileName: input.name,
          mimeType: input.mimeType ?? 'application/pdf',
          fileSizeBytes: input.size,
          origin: 'file_import',
          canonicalType: 'pdf',
          processingStatus,
          pageCount: pages.length,
          lastProcessedAt: Date.now(),
          warnings: warnings.length > 0 ? warnings : undefined,
        },
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    } catch (err: unknown) {
      const isAbort = err instanceof Error && err.name === 'AbortError';
      const msg = isAbort
        ? 'PDF extraction timed out after 30 seconds.'
        : (err instanceof Error ? err.message : 'Network error during PDF extraction');

      return {
        status: 'failed',
        text: '',
        errorMessage: msg,
        warnings: ['network_or_timeout_failure'],
      };
    }
  }
}
