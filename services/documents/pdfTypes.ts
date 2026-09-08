// MedOS — Phase 12.2: PDF Extraction Provider & Types
// Provider-neutral contracts, page structures, and provenance builders for PDF documents.

import type { DocumentInput, DocumentExtractionResult, ExtractionStatus } from './documentTypes';
import type { SourceProvenance } from '@/models/ingestion';

export interface ExtractedPdfPage {
  pageNumber: number;
  text: string;
  charStart?: number;
  charEnd?: number;
  hasTables?: boolean;
  headings?: string[];
}

export interface PdfExtractionResult extends DocumentExtractionResult {
  pages?: ExtractedPdfPage[];
  provenance?: SourceProvenance[];
}

/**
 * Provider-neutral interface for PDF extraction engines.
 * Implementations can be local workers, cloud functions, or client-configured endpoints.
 */
export interface PdfExtractionEngine {
  readonly id: string;
  readonly name: string;

  /**
   * Checks whether this extraction engine is currently available and configured.
   */
  isAvailable(): Promise<boolean>;

  /**
   * Extracts text, structure, and page provenance from a PDF document.
   */
  extract(input: DocumentInput): Promise<PdfExtractionResult>;
}

/**
 * Constructs structured page-separated document text and associated SourceProvenance entries.
 */
export function buildPageStructuredText(
  pages: ExtractedPdfPage[],
  sourceId: string,
  sourceTitle: string,
  topicId: string
): { formattedText: string; provenanceList: SourceProvenance[] } {
  let combined = '';
  const provenanceList: SourceProvenance[] = [];

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const pageHeader = i === 0 && pages.length === 1 ? '' : `--- [Page ${page.pageNumber}] ---\n\n`;
    const startIdx = combined.length + pageHeader.length;
    combined += `${pageHeader}${page.text.trim()}\n\n`;
    const endIdx = combined.length;

    provenanceList.push({
      sourceId,
      sourceTitle,
      topicId,
      pageNumber: page.pageNumber,
      charStart: startIdx,
      charEnd: endIdx,
      excerpt: page.text.slice(0, 160).trim(),
    });
  }

  return {
    formattedText: combined.trim(),
    provenanceList,
  };
}
