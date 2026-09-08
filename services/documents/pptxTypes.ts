// MedOS — Phase 12.3: PPTX Presentation Ingestion Types & Provenance Builder
// Structured slide representations, bullet hierarchy, tables, notes, and character-level provenance.

import type { DocumentInput, DocumentExtractionResult } from './documentTypes';
import type { SourceProvenance } from '@/models/ingestion';

export interface ExtractedSlideTable {
  rows: string[][];
}

export interface ExtractedSlideImage {
  relId: string;
  target?: string;
  altText?: string;
}

export interface ExtractedSlide {
  slideNumber: number;
  title?: string;
  text: string;
  notes?: string;
  tables?: ExtractedSlideTable[];
  images?: ExtractedSlideImage[];
  charStart?: number;
  charEnd?: number;
}

export interface PptxExtractionResult extends DocumentExtractionResult {
  slideCount?: number;
  slides?: ExtractedSlide[];
  provenance?: SourceProvenance[];
}

/**
 * Provider-neutral interface for PPTX extraction engines.
 */
export interface PptxExtractionEngine {
  readonly id: string;
  readonly name: string;

  /**
   * Checks whether this extraction engine is currently available and reachable.
   */
  isAvailable(): Promise<boolean>;

  /**
   * Extracts slides, structured hierarchy, speaker notes, tables, and slide provenance.
   */
  extract(input: DocumentInput): Promise<PptxExtractionResult>;
}

/**
 * Formats structured slide content into unified canonical document text,
 * computing exact character offsets (charStart, charEnd) and SourceProvenance per slide.
 */
export function buildSlideStructuredText(
  slides: ExtractedSlide[],
  sourceId: string,
  sourceTitle: string,
  topicId: string
): { formattedText: string; provenanceList: SourceProvenance[] } {
  let combined = '';
  const provenanceList: SourceProvenance[] = [];

  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];
    const headerTitle = slide.title ? `: ${slide.title}` : '';
    const slideHeader = `--- [Slide ${slide.slideNumber}${headerTitle}] ---\n\n`;

    const startIdx = combined.length + slideHeader.length;

    let slideBody = slide.text.trim();
    if (slide.notes && slide.notes.trim().length > 0) {
      slideBody += `\n\n[Speaker Notes]\n${slide.notes.trim()}`;
    }

    combined += `${slideHeader}${slideBody}\n\n`;
    const endIdx = combined.length;

    slide.charStart = startIdx;
    slide.charEnd = endIdx;

    provenanceList.push({
      sourceId,
      sourceTitle,
      topicId,
      slideNumber: slide.slideNumber,
      sectionTitle: slide.title,
      charStart: startIdx,
      charEnd: endIdx,
      excerpt: slide.text.slice(0, 160).trim() || (slide.notes ? slide.notes.slice(0, 160).trim() : ''),
    });
  }

  return {
    formattedText: combined.trim(),
    provenanceList,
  };
}
