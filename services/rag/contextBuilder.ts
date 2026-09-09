// MedOS — Phase 12.7: RAG Context Builder
// Converts ranked RetrievalResult[] into a bounded, injection-resistant grounding context
// string and a citation map for postprocessing.
//
// Responsibilities:
//  - Deduplicate chunks (by chunkId)
//  - Apply character budget (RAG_MAX_CONTEXT_CHARS)
//  - Format each chunk as a labelled SOURCE block with machine-readable metadata
//  - Build a citation map (label → RagCitation)
//  - Protect against prompt injection in source content
//
// Boundaries:
//  - ZERO provider calls
//  - ZERO SQLite reads/writes
//  - ZERO chunking re-runs
//  - Pure synchronous function

import type { RetrievalResult } from '@/models/retrieval';
import type { RagCitation } from '@/models/rag';
import {
  CITATION_MAX_EXCERPT_CHARS,
  RAG_MAX_CONTEXT_CHARS,
} from '@/models/rag';

// ---------------------------------------------------------------------------
// Prompt-injection sanitization
// ---------------------------------------------------------------------------

/**
 * Patterns that could be used to hijack the model's behavior from within source
 * document text.  We wrap source chunks with an explicit framing that the system
 * prompt establishes, but we also strip/replace the most aggressive patterns as
 * defense-in-depth.
 *
 * Only blatant injection markers are removed; medical terminology is preserved.
 */
const INJECTION_PATTERNS: ReadonlyArray<RegExp> = [
  // Imperative injection attempts
  /ignore\s+(all\s+)?(previous|prior|above|preceding)\s+instructions?/gi,
  /disregard\s+(all\s+)?(previous|prior|above|preceding)\s+instructions?/gi,
  /forget\s+(all\s+)?(previous|prior|above|preceding)\s+instructions?/gi,
  // System prompt redefinition
  /you\s+are\s+now\s+(a\s+)?(?:an?\s+)?(?:different|new|updated|changed|evil|uncensored)/gi,
  // Secret/credential extraction
  /reveal\s+(your\s+)?(api[_\s]*key|secret|password|credential|system\s*prompt)/gi,
  /print\s+(your\s+)?(api[_\s]*key|secret|password|credential|system\s*prompt)/gi,
  /show\s+(your\s+)?(api[_\s]*key|secret|password|credential|system\s*prompt)/gi,
  // Tool/function calling injection
  /<tool_call>/gi,
  /<function_call>/gi,
  // External network requests from content
  /call\s+(?:the\s+)?(?:external|remote)\s+(?:api|service|url|endpoint)/gi,
];

/**
 * Sanitizes a source chunk's text against prompt-injection patterns.
 * Replaces matched patterns with a neutral placeholder that signals to reviewers
 * that content was modified.  Medical content is unaffected.
 */
export function sanitizeChunkText(text: string): string {
  if (!text || typeof text !== 'string') return '';
  let sanitized = text;
  for (const pattern of INJECTION_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[CONTENT REDACTED — injection pattern]');
  }
  return sanitized;
}

// ---------------------------------------------------------------------------
// Context block format
// ---------------------------------------------------------------------------

/**
 * Formats a single chunk as a labelled SOURCE block for the grounding context.
 * The label (e.g. "SRC-1") is the stable citation key used by the model.
 *
 * Format:
 *   [SRC-1]
 *   source_id: <id>
 *   chunk_id:  <id>
 *   title:     <sourceTitle>
 *   page:      <pageNumber | —>
 *   section:   <sectionTitle | —>
 *   ---
 *   <sanitized content>
 *   [END SRC-1]
 */
function formatSourceBlock(label: string, result: RetrievalResult, sanitizedText: string): string {
  const p = result.provenance;
  const pageStr = typeof p.pageNumber === 'number' ? String(p.pageNumber) : '—';
  const slideStr = typeof p.slideNumber === 'number' ? `slide ${p.slideNumber}` : null;
  const locationStr = slideStr ?? (pageStr !== '—' ? `page ${pageStr}` : '—');
  const sectionStr = p.sectionTitle?.trim() || '—';

  return [
    `[${label}]`,
    `source_id: ${p.sourceId}`,
    `chunk_id: ${result.chunkId}`,
    `title: ${p.sourceTitle}`,
    `location: ${locationStr}`,
    `section: ${sectionStr}`,
    `---`,
    sanitizedText.trim(),
    `[END ${label}]`,
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface BuiltContext {
  /** The complete formatted grounding context string, ready for the prompt. */
  contextText: string;
  /**
   * Map from citation label (e.g. "SRC-1") → RagCitation.
   * Populated for every chunk included in contextText.
   */
  citationMap: Map<string, RagCitation>;
  /** Number of chunks that were included (may be less than input due to budget). */
  includedCount: number;
  /** Number of chunks that were skipped (deduplication + budget overflow). */
  skippedCount: number;
  /** Whether the context was truncated by the character budget. */
  budgetExceeded: boolean;
}

/**
 * Builds a bounded, injection-resistant grounding context from ranked retrieval results.
 *
 * @param results - Ranked RetrievalResult array (best first).  Must not be mutated.
 * @param maxChars - Character budget override. Defaults to RAG_MAX_CONTEXT_CHARS.
 */
export function buildGroundingContext(
  results: RetrievalResult[],
  maxChars: number = RAG_MAX_CONTEXT_CHARS
): BuiltContext {
  const citationMap = new Map<string, RagCitation>();
  const seenChunkIds = new Set<string>();
  const blocks: string[] = [];
  let totalChars = 0;
  let includedCount = 0;
  let skippedCount = 0;
  let budgetExceeded = false;

  for (const result of results) {
    // Deduplication guard
    if (seenChunkIds.has(result.chunkId)) {
      skippedCount++;
      continue;
    }

    // Skip chunks with no usable text
    const rawText = (result.text ?? '').trim();
    if (!rawText) {
      skippedCount++;
      continue;
    }

    const sanitizedText = sanitizeChunkText(rawText);
    const label = `SRC-${includedCount + 1}`;
    const block = formatSourceBlock(label, result, sanitizedText);

    // Budget check — include block only if it fits
    if (totalChars + block.length > maxChars) {
      budgetExceeded = true;
      skippedCount++;
      continue; // Do NOT break — smaller subsequent chunks might still fit
    }

    // Accept this chunk
    seenChunkIds.add(result.chunkId);
    blocks.push(block);
    totalChars += block.length;
    includedCount++;

    // Build citation
    const p = result.provenance;
    const citation: RagCitation = {
      chunkId: result.chunkId,
      sourceId: p.sourceId,
      sourceTitle: p.sourceTitle,
      pageNumber: p.pageNumber,
      slideNumber: p.slideNumber,
      sectionTitle: p.sectionTitle,
      chunkOrdinal: result.ordinal,
      excerpt: rawText.slice(0, CITATION_MAX_EXCERPT_CHARS),
    };
    citationMap.set(label, citation);
  }

  return {
    contextText: blocks.join('\n\n'),
    citationMap,
    includedCount,
    skippedCount,
    budgetExceeded,
  };
}

/**
 * Extracts the set of citation labels from a generated answer text.
 * Labels are of the form [SRC-N] where N is a positive integer.
 * Returns an empty array if no labels are found.
 */
export function extractCitationLabels(answerText: string): string[] {
  if (!answerText || typeof answerText !== 'string') return [];
  const matches = answerText.match(/\[SRC-\d+\]/g) ?? [];
  return [...new Set(matches.map(m => m.slice(1, -1)))]; // Deduplicated, brackets removed
}

/**
 * Resolves cited labels from the generated answer against the citation map,
 * returning only citations that correspond to chunks actually included in
 * the context.  Unsupported or fabricated labels are silently dropped.
 */
export function resolveCitations(
  answerText: string,
  citationMap: Map<string, RagCitation>
): RagCitation[] {
  const labels = extractCitationLabels(answerText);
  const citations: RagCitation[] = [];
  for (const label of labels) {
    const citation = citationMap.get(label);
    if (citation) {
      citations.push(citation);
    }
    // Unsupported labels are silently dropped — never fabricate citations
  }
  return citations;
}
