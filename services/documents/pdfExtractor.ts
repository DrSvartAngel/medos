// MedOS — Phase 10 Step 8: PDF Extractor Boundary
// Handles PDF documents with truthful capability reporting for Expo/Hermes.

import {
  type DocumentExtractor,
  type DocumentInput,
  type DocumentExtractionResult,
  MAX_DOCUMENT_FILE_SIZE_BYTES,
} from './documentExtractor';

export class PdfExtractor implements DocumentExtractor {
  /**
   * Checks whether on-device PDF extraction is supported in the current environment.
   * Standard Expo Go / Hermes does not bundle native PDFBox/PDFKit bindings.
   */
  isSupported(mimeType?: string, fileName?: string): boolean {
    const isPdf =
      mimeType === 'application/pdf' ||
      (fileName ? fileName.toLowerCase().endsWith('.pdf') : false);
    if (!isPdf) return false;

    // Truthful runtime boundary: on-device PDF text extraction requires custom native builds
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

    // Truthful capability boundary:
    // Without custom native modules or server-side offloading (both forbidden in Step 8),
    // report unavailable so the UI can activate the manual text import fallback.
    return {
      status: 'unavailable',
      text: '',
      warnings: ['on_device_pdf_extraction_unavailable_in_expo_go'],
      errorMessage:
        'On-device PDF text extraction is unavailable in the current Expo/Hermes runtime. Please use manual text import or paste the content below.',
    };
  }
}

export const pdfExtractor = new PdfExtractor();
