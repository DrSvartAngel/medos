// MedOS — Phase 12.5: Semantic Chunker
// Content-aware structural chunking engine respecting document boundaries,
// headings, pages, slides, tables, speaker notes, nested bullets, OCR, and visual descriptions.

import type { ChunkType, SourceChunk } from '@/models/chunk';
import type { StudySource } from '@/models/studySource';
import type { ExtractionMethod } from '@/models/ingestion';
import { countWords, estimateTokens, CHUNK_SIZE_CONFIG } from './tokenEstimator';
import { buildChunkFingerprint } from './fingerprint';

interface RawBlock {
  text: string;
  chunkType: ChunkType;
  pageNumber?: number;
  slideNumber?: number;
  sectionTitle?: string;
  mediaId?: string;
  imageIndex?: number;
  extractionMethod: ExtractionMethod;
  charStart?: number;
  charEnd?: number;
}

/**
 * Checks if a line or block represents a markdown table.
 */
function isTableBlock(text: string): boolean {
  const lines = text.trim().split('\n').filter(Boolean);
  if (lines.length < 2) return false;
  return lines.every((line) => line.trim().startsWith('|') && line.trim().endsWith('|'));
}

/**
 * Splits text into prose paragraphs, tables, headings, and lists.
 */
function splitStructuralParagraphs(text: string): { text: string; isTable: boolean }[] {
  const blocks: { text: string; isTable: boolean }[] = [];
  const rawParagraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

  for (const para of rawParagraphs) {
    if (isTableBlock(para)) {
      blocks.push({ text: para, isTable: true });
    } else {
      blocks.push({ text: para, isTable: false });
    }
  }

  return blocks;
}

/**
 * Splits continuous prose into bounded segments respecting sentence/paragraph boundaries
 * with small selective overlap (~50 tokens) when exceeding soft max.
 */
function splitLongProse(
  text: string,
  targetMaxTokens = CHUNK_SIZE_CONFIG.TARGET_MAX_TOKENS,
  softMaxTokens = CHUNK_SIZE_CONFIG.SOFT_MAX_TOKENS
): string[] {
  const tokens = estimateTokens(text);
  if (tokens <= softMaxTokens) {
    return [text];
  }

  // Split into sentences
  const sentenceMatches = text.match(/[^.!?\n]+[.!?\n]+(\s+|$)|[^.!?\n]+$/g) || [text];
  const chunks: string[] = [];
  let current = '';
  let currentTokens = 0;
  let overlapBuffer: string[] = [];

  for (const sent of sentenceMatches) {
    const sTokens = estimateTokens(sent);
    if (currentTokens + sTokens > targetMaxTokens && current.length > 0) {
      chunks.push(current.trim());

      // Overlap: take trailing sentences totaling ~50-80 tokens
      let overlap = '';
      let overlapTokens = 0;
      for (let i = overlapBuffer.length - 1; i >= 0; i--) {
        const itemTokens = estimateTokens(overlapBuffer[i]);
        if (overlapTokens + itemTokens > 80) break;
        overlap = overlapBuffer[i] + overlap;
        overlapTokens += itemTokens;
      }

      current = overlap + sent;
      currentTokens = estimateTokens(current);
      overlapBuffer = [sent];
    } else {
      current += sent;
      currentTokens += sTokens;
      overlapBuffer.push(sent);
    }
  }

  if (current.trim().length > 0) {
    chunks.push(current.trim());
  }

  return chunks.length > 0 ? chunks : [text];
}

/**
 * Extracts raw blocks from PPTX slide formatted text.
 * Pattern: `--- [Slide {N}: {title}] ---`
 */
function parsePptxBlocks(content: string): RawBlock[] {
  const slideRegex = /---\s*\[Slide\s*(\d+)(?::\s*([^\]]*))?\]\s*---/g;
  const blocks: RawBlock[] = [];
  let match: RegExpExecArray | null;
  const indices: { slideNumber: number; title?: string; index: number; headerLen: number }[] = [];

  while ((match = slideRegex.exec(content)) !== null) {
    indices.push({
      slideNumber: parseInt(match[1], 10),
      title: match[2]?.trim() || undefined,
      index: match.index,
      headerLen: match[0].length,
    });
  }

  if (indices.length === 0) return [];

  for (let i = 0; i < indices.length; i++) {
    const current = indices[i];
    const nextIndex = i + 1 < indices.length ? indices[i + 1].index : content.length;
    const bodyStart = current.index + current.headerLen;
    const rawSlideText = content.slice(bodyStart, nextIndex).trim();

    // Check for [Speaker Notes] section
    const notesMarker = '\n\n[Speaker Notes]\n';
    let slideBody = rawSlideText;
    let notesText: string | undefined;

    const notesIdx = rawSlideText.indexOf(notesMarker);
    if (notesIdx !== -1) {
      slideBody = rawSlideText.slice(0, notesIdx).trim();
      notesText = rawSlideText.slice(notesIdx + notesMarker.length).trim();
    } else if (rawSlideText.startsWith('[Speaker Notes]\n')) {
      slideBody = '';
      notesText = rawSlideText.slice('[Speaker Notes]\n'.length).trim();
    }

    // Process slide body: separate tables and normal slide text
    if (slideBody.length > 0) {
      const parts = splitStructuralParagraphs(slideBody);
      for (const part of parts) {
        if (part.isTable) {
          blocks.push({
            text: current.title ? `### Table: ${current.title}\n\n${part.text}` : part.text,
            chunkType: 'table',
            slideNumber: current.slideNumber,
            sectionTitle: current.title,
            extractionMethod: 'native',
            charStart: current.index,
            charEnd: nextIndex,
          });
        } else {
          // Check if bullet hierarchy is present
          const hasBullets = part.text.split('\n').some((line) => /^\s*[-*•]\s+/.test(line));
          const subChunks = splitLongProse(part.text);
          for (const sub of subChunks) {
            blocks.push({
              text: current.title ? `## ${current.title}\n\n${sub}` : sub,
              chunkType: hasBullets ? 'slide' : 'section',
              slideNumber: current.slideNumber,
              sectionTitle: current.title,
              extractionMethod: 'native',
              charStart: current.index,
              charEnd: nextIndex,
            });
          }
        }
      }
    }

    // Process speaker notes separately
    if (notesText && notesText.length > 0) {
      const noteChunks = splitLongProse(notesText);
      for (const noteChunk of noteChunks) {
        blocks.push({
          text: current.title
            ? `[Speaker Notes — Slide ${current.slideNumber}: ${current.title}]\n${noteChunk}`
            : `[Speaker Notes — Slide ${current.slideNumber}]\n${noteChunk}`,
          chunkType: 'speaker_note',
          slideNumber: current.slideNumber,
          sectionTitle: current.title,
          extractionMethod: 'native',
          charStart: current.index,
          charEnd: nextIndex,
        });
      }
    }
  }

  return blocks;
}

/**
 * Extracts raw blocks from PDF page formatted text.
 * Pattern: `--- [Page {N}] ---`
 */
function parsePdfBlocks(content: string): RawBlock[] {
  const pageRegex = /---\s*\[Page\s*(\d+)\]\s*---/g;
  const blocks: RawBlock[] = [];
  let match: RegExpExecArray | null;
  const indices: { pageNumber: number; index: number; headerLen: number }[] = [];

  while ((match = pageRegex.exec(content)) !== null) {
    indices.push({
      pageNumber: parseInt(match[1], 10),
      index: match.index,
      headerLen: match[0].length,
    });
  }

  if (indices.length === 0) return [];

  for (let i = 0; i < indices.length; i++) {
    const current = indices[i];
    const nextIndex = i + 1 < indices.length ? indices[i + 1].index : content.length;
    const bodyStart = current.index + current.headerLen;
    const pageText = content.slice(bodyStart, nextIndex).trim();

    if (!pageText) continue;

    const isOcrPage = pageText.includes('[OCR Page') || pageText.includes('extractionMethod: ocr');
    const extractionMethod: ExtractionMethod = isOcrPage ? 'ocr' : 'native';

    const parts = splitStructuralParagraphs(pageText);
    for (const part of parts) {
      if (part.isTable) {
        blocks.push({
          text: part.text,
          chunkType: 'table',
          pageNumber: current.pageNumber,
          extractionMethod,
          charStart: current.index,
          charEnd: nextIndex,
        });
      } else {
        const subChunks = splitLongProse(part.text);
        for (const sub of subChunks) {
          // Detect headings in PDF text
          const firstLine = sub.split('\n')[0].trim();
          const isHeading = /^#{1,4}\s+/.test(firstLine) || (/^[A-Z0-9\s]{4,40}$/.test(firstLine) && firstLine.length < 50);
          blocks.push({
            text: sub,
            chunkType: isOcrPage ? 'ocr' : isHeading ? 'section' : 'paragraph',
            pageNumber: current.pageNumber,
            sectionTitle: isHeading ? firstLine.replace(/^#+\s*/, '') : undefined,
            extractionMethod,
            charStart: current.index,
            charEnd: nextIndex,
          });
        }
      }
    }
  }

  return blocks;
}

/**
 * Extracts raw blocks from Markdown or general plain text.
 */
function parseGenericStructuredBlocks(content: string): RawBlock[] {
  const blocks: RawBlock[] = [];
  const parts = splitStructuralParagraphs(content);
  let currentHeading: string | undefined;

  for (const part of parts) {
    if (part.isTable) {
      blocks.push({
        text: currentHeading ? `### ${currentHeading}\n\n${part.text}` : part.text,
        chunkType: 'table',
        sectionTitle: currentHeading,
        extractionMethod: 'native',
      });
      continue;
    }

    const firstLine = part.text.split('\n')[0].trim();
    if (/^#{1,4}\s+/.test(firstLine)) {
      currentHeading = firstLine.replace(/^#+\s*/, '');
    }

    const subChunks = splitLongProse(part.text);
    for (const sub of subChunks) {
      const hasBullets = sub.split('\n').some((l) => /^\s*[-*•]\s+/.test(l));
      blocks.push({
        text: sub,
        chunkType: currentHeading ? 'section' : hasBullets ? 'mixed' : 'paragraph',
        sectionTitle: currentHeading,
        extractionMethod: 'native',
      });
    }
  }

  return blocks;
}

/**
 * Primary semantic chunker for StudySource entities.
 * Converts document content + visual assets into discrete, provenance-preserving SourceChunk items.
 */
export function chunkStudySource(source: StudySource): SourceChunk[] {
  if (!source || !source.content || source.content.trim().length === 0) {
    return [];
  }

  const content = source.content.trim();
  let rawBlocks: RawBlock[] = [];

  // 1. Check for PPTX presentation structure
  if (content.includes('--- [Slide ') || source.metadata?.canonicalType === 'pptx') {
    rawBlocks = parsePptxBlocks(content);
  }

  // 2. Check for PDF document structure
  if (rawBlocks.length === 0 && (content.includes('--- [Page ') || source.metadata?.canonicalType === 'pdf')) {
    rawBlocks = parsePdfBlocks(content);
  }

  // 3. Fall back to generic structured Markdown/Prose parsing
  if (rawBlocks.length === 0) {
    rawBlocks = parseGenericStructuredBlocks(content);
  }

  // 4. Attach OCR and Visual Assets from metadata if available
  const visualAssets = source.metadata?.visualAssets || [];
  for (const asset of visualAssets) {
    if (asset.ocrText && asset.ocrText.trim().length > 0) {
      rawBlocks.push({
        text: `[Image OCR — ${asset.sourceTitle || 'Figure'}]\n${asset.ocrText.trim()}`,
        chunkType: 'ocr',
        pageNumber: asset.pageNumber,
        slideNumber: asset.slideNumber,
        mediaId: asset.mediaId,
        imageIndex: asset.imageIndex,
        extractionMethod: 'ocr',
      });
    }

    if (asset.visualDescription && asset.visualDescription.trim().length > 0) {
      rawBlocks.push({
        text: `[Visual Description — ${asset.sourceTitle || 'Figure'}]\n${asset.visualDescription.trim()}`,
        chunkType: 'visual_description',
        pageNumber: asset.pageNumber,
        slideNumber: asset.slideNumber,
        mediaId: asset.mediaId,
        imageIndex: asset.imageIndex,
        extractionMethod: 'visual',
      });
    }
  }

  // 5. Convert RawBlocks into canonical SourceChunk instances
  const chunks: SourceChunk[] = [];
  const now = Date.now();

  for (let i = 0; i < rawBlocks.length; i++) {
    const b = rawBlocks[i];
    const text = b.text.trim();
    if (text.length === 0) continue;

    const ordinal = i + 1;
    const tokenEstimate = estimateTokens(text);
    const wordCount = countWords(text);

    const fingerprint = buildChunkFingerprint({
      sourceId: source.id,
      ordinal,
      chunkType: b.chunkType,
      extractionMethod: b.extractionMethod,
      pageNumber: b.pageNumber,
      slideNumber: b.slideNumber,
      mediaId: b.mediaId,
      normalizedText: text,
    });

    const id = `${source.id}_chk_${ordinal}_${fingerprint.slice(0, 8)}`;

    chunks.push({
      id,
      sourceId: source.id,
      topicId: source.topicId,
      sourceTitle: source.title,
      ordinal,
      chunkType: b.chunkType,
      text,
      pageNumber: b.pageNumber,
      slideNumber: b.slideNumber,
      sectionTitle: b.sectionTitle,
      mediaId: b.mediaId,
      imageIndex: b.imageIndex,
      extractionMethod: b.extractionMethod,
      charStart: b.charStart,
      charEnd: b.charEnd,
      tokenEstimate,
      wordCount,
      fingerprint,
      createdAt: now,
      updatedAt: now,
    });
  }

  return chunks;
}
