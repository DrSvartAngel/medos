// MedOS — Phase 10 Step 8: Document Extraction Architecture
// Provider-neutral contracts and limits for local document ingestion.

export * from './documentTypes';

import {
  type DocumentExtractor,
  type DocumentInput,
  type DocumentExtractionResult,
  MAX_DOCUMENT_FILE_SIZE_BYTES,
} from './documentTypes';
import { pdfExtractor } from './pdfExtractor';
import { pptxExtractor } from './pptxExtractor';
import { textExtractor } from './textExtractor';
import { imageExtractor } from './imageExtractor';

export * from './pptxExtractor';
export * from './imageExtractor';

export class CompositeDocumentExtractor implements DocumentExtractor {
  isSupported(mimeType?: string, fileName?: string): boolean {
    return (
      textExtractor.isSupported(mimeType, fileName) ||
      (mimeType === 'application/pdf' || (fileName ? fileName.toLowerCase().endsWith('.pdf') : false)) ||
      pptxExtractor.isSupported(mimeType, fileName) ||
      imageExtractor.isSupported(mimeType, fileName)
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

    // Check if PPTX
    if (
      mime === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
      mime === 'application/vnd.ms-powerpoint' ||
      name.endsWith('.pptx') ||
      name.endsWith('.ppt')
    ) {
      return await pptxExtractor.extract(input);
    }

    // Check if Image
    if (imageExtractor.isSupported(mime, name)) {
      return await imageExtractor.extract(input);
    }

    return {
      status: 'unsupported',
      text: '',
      errorMessage: 'Unsupported document format. Please select a PDF, presentation, image, or plain text file.',
    };
  }
}

export const documentExtractor = new CompositeDocumentExtractor();


