// MedOS — Phase 12.1: Source Ingestion Foundation Contracts
// Unified, canonical contracts for learning material ingestion, processing lifecycle, and provenance.

import type { StudySourceType } from './studySource';

/**
 * Canonical source formats supported across the intelligence pipeline.
 * - Current fully handled in 12.1: 'text', 'markdown', 'copied'
 * - Current partial / honest runtime boundary: 'pdf' (picker & manual fallback in 12.1; native extraction in 12.2)
 * - Planned future extensible formats: 'pptx', 'image'
 */
export type CanonicalSourceType =
  | 'text'
  | 'markdown'
  | 'copied'
  | 'pdf'
  | 'pptx'
  | 'image';

/**
 * Lifecycle stages for source ingestion and extraction.
 * In Phase 12.1, sources are either 'ready', 'partial' (e.g. PDF manual fallback), or 'failed'.
 * Future sub-phases (12.2 PDF, 12.3 chunking/normalization, 12.4 indexing) utilize the intermediate pipeline states.
 */
export type IngestionProcessingStatus =
  | 'queued'
  | 'extracting'
  | 'indexing'
  | 'analyzing'
  | 'generating'
  | 'ready'
  | 'partial'
  | 'failed'
  | 'canceled';

/**
 * Origin of how the source content entered MedOS.
 */
export type SourceOrigin =
  | 'manual_entry'
  | 'clipboard_paste'
  | 'file_import'
  | 'external_sync';

export type ExtractionMethod = 'native' | 'ocr' | 'visual';

/**
 * Detailed provenance information linking generated learning items (cards, questions, summaries)
 * or chunks back to their exact location in the original study material.
 */
export interface SourceProvenance {
  sourceId: string;
  sourceTitle: string;
  topicId: string;
  pageNumber?: number;
  slideNumber?: number;
  mediaId?: string;
  imageIndex?: number;
  sectionTitle?: string;
  excerpt?: string;
  charStart?: number;
  charEnd?: number;
  extractionMethod?: ExtractionMethod;
  confidence?: number;
}

/**
 * Canonical visual asset reference captured from documents (PDF figures, PPTX media, or standalone images).
 */
export interface VisualAsset {
  id: string;
  sourceId: string;
  sourceTitle: string;
  topicId: string;
  pageNumber?: number;
  slideNumber?: number;
  mediaId?: string;
  imageIndex?: number;
  mimeType: string;
  width?: number;
  height?: number;
  altText?: string;
  ocrText?: string;
  ocrConfidence?: number;
  visualDescription?: string;
  provenance: SourceProvenance;
}

/**
 * Structural metadata describing file properties, extraction details, and processing status.
 * Stored compatibly within the canonical study source entity.
 */
export interface SourceIngestionMetadata {
  originalFileName?: string;
  mimeType?: string;
  fileSizeBytes?: number;
  origin: SourceOrigin;
  canonicalType: CanonicalSourceType;
  processingStatus: IngestionProcessingStatus;
  pageCount?: number;
  slideCount?: number;
  imageCount?: number;
  visualAssets?: VisualAsset[];
  errorMessage?: string;
  warnings?: string[];
  lastProcessedAt?: number;
}

/**
 * Capability descriptor for determining what extraction/processing is currently possible
 * in the local environment without making false claims.
 */
export interface SourceTypeCapability {
  type: CanonicalSourceType;
  labelKey: string;
  fileExtensions: readonly string[];
  mimeTypes: readonly string[];
  isExtractionSupported: boolean;
  requiresManualFallback: boolean;
  notesKey?: string;
}

export const SOURCE_TYPE_CAPABILITIES: Record<CanonicalSourceType, SourceTypeCapability> = {
  text: {
    type: 'text',
    labelKey: 'studySources.text',
    fileExtensions: ['.txt'],
    mimeTypes: ['text/plain'],
    isExtractionSupported: true,
    requiresManualFallback: false,
  },
  markdown: {
    type: 'markdown',
    labelKey: 'studySources.text',
    fileExtensions: ['.md', '.markdown'],
    mimeTypes: ['text/markdown', 'text/x-markdown', 'text/plain'],
    isExtractionSupported: true,
    requiresManualFallback: false,
  },
  copied: {
    type: 'copied',
    labelKey: 'studySources.note',
    fileExtensions: [],
    mimeTypes: ['text/plain'],
    isExtractionSupported: true,
    requiresManualFallback: false,
  },
  pdf: {
    type: 'pdf',
    labelKey: 'studySources.document',
    fileExtensions: ['.pdf'],
    mimeTypes: ['application/pdf'],
    isExtractionSupported: false, // Phase 12.1 honest boundary: native automated parser deferred to 12.2
    requiresManualFallback: true,
    notesKey: 'documentImport.extractionUnavailableDesc',
  },
  pptx: {
    type: 'pptx',
    labelKey: 'studySources.document',
    fileExtensions: ['.pptx', '.ppt'],
    mimeTypes: [
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-powerpoint',
    ],
    isExtractionSupported: false,
    requiresManualFallback: true,
  },
  image: {
    type: 'image',
    labelKey: 'studySources.document',
    fileExtensions: ['.png', '.jpg', '.jpeg', '.webp'],
    mimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
    isExtractionSupported: false,
    requiresManualFallback: true,
  },
};

/**
 * Maps a canonical source format to the underlying persistence StudySourceType ('text' | 'note' | 'document').
 * Preserves 100% database schema v12 compatibility.
 */
export function canonicalToDbSourceType(canonical: CanonicalSourceType): StudySourceType {
  switch (canonical) {
    case 'text':
    case 'markdown':
      return 'text';
    case 'copied':
      return 'note';
    case 'pdf':
    case 'pptx':
    case 'image':
      return 'document';
    default:
      return 'text';
  }
}
