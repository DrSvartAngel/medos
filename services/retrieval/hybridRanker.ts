// MedOS — Phase 12.9: Deterministic Hybrid Ranker
// Merges and ranks candidate chunks from lexical and vector retrieval into unified RetrievalResult[].
// Zero network calls, zero SQLite writes, 100% deterministic ranking and tie-breaking.

import type { RetrievalMode, RetrievalResult } from '@/models/retrieval';
import type { VectorSearchResult } from '@/models/embedding';

export interface HybridRankerOptions {
  lexicalWeight?: number;
  semanticWeight?: number;
  topK?: number;
  mode?: RetrievalMode;
}

/**
 * Normalizes an array of raw lexical scores into the range [0, 1].
 */
export function normalizeLexicalScores(scores: number[]): number[] {
  if (scores.length === 0) return [];
  let min = Infinity;
  let max = -Infinity;
  for (const s of scores) {
    if (s < min) min = s;
    if (s > max) max = s;
  }
  if (max === min) {
    return scores.map(() => 1.0);
  }
  const range = max - min;
  return scores.map((s) => (s - min) / range);
}

/**
 * Normalizes cosine similarity scores into [0, 1].
 * Negative cosine similarities represent orthogonal/opposite semantics and are clamped to 0.
 */
export function normalizeSemanticScore(similarity: number): number {
  if (Number.isNaN(similarity) || !Number.isFinite(similarity)) return 0;
  if (similarity < 0) return 0;
  if (similarity > 1) return 1;
  return similarity;
}

export function rankHybrid(
  lexicalResults: RetrievalResult[],
  vectorResults: VectorSearchResult[],
  options?: HybridRankerOptions
): RetrievalResult[] {
  const mode = options?.mode ?? 'hybrid';
  const topK = options?.topK ?? 10;
  const rawLexWeight = options?.lexicalWeight ?? 0.5;
  const rawSemWeight = options?.semanticWeight ?? 0.5;

  // If pure lexical mode requested
  if (mode === 'lexical') {
    return lexicalResults.slice(0, topK).map((r) => ({
      ...r,
      lexicalScore: r.score,
      retrievalMode: 'lexical',
    }));
  }

  // If pure semantic mode requested
  if (mode === 'semantic') {
    return vectorResults.slice(0, topK).map((v) => ({
      chunkId: v.chunkId,
      text: v.text,
      chunkType: v.chunkType,
      score: v.similarity,
      matchTerms: [],
      provenance: v.provenance,
      ordinal: v.ordinal,
      semanticScore: v.similarity,
      retrievalMode: 'semantic',
    }));
  }

  // Hybrid mode
  // If either candidate list is empty, smoothly fallback to the other
  if (vectorResults.length === 0) {
    return lexicalResults.slice(0, topK).map((r) => ({
      ...r,
      lexicalScore: r.score,
      retrievalMode: 'lexical',
    }));
  }
  if (lexicalResults.length === 0) {
    return vectorResults.slice(0, topK).map((v) => ({
      chunkId: v.chunkId,
      text: v.text,
      chunkType: v.chunkType,
      score: v.similarity,
      matchTerms: [],
      provenance: v.provenance,
      ordinal: v.ordinal,
      semanticScore: v.similarity,
      retrievalMode: 'semantic',
    }));
  }

  // Normalize weights so they sum to 1
  const totalWeight = rawLexWeight + rawSemWeight;
  const lexWeight = totalWeight > 0 ? rawLexWeight / totalWeight : 0.5;
  const semWeight = totalWeight > 0 ? rawSemWeight / totalWeight : 0.5;

  // Normalize lexical scores
  const rawLexScores = lexicalResults.map((r) => r.score);
  const normLexScores = normalizeLexicalScores(rawLexScores);
  const lexNormMap = new Map<string, { norm: number; raw: RetrievalResult }>();
  for (let i = 0; i < lexicalResults.length; i++) {
    lexNormMap.set(lexicalResults[i].chunkId, {
      norm: normLexScores[i],
      raw: lexicalResults[i],
    });
  }

  // Map vector results
  const vecMap = new Map<string, VectorSearchResult>();
  for (const v of vectorResults) {
    vecMap.set(v.chunkId, v);
  }

  // Gather all unique chunk IDs
  const allChunkIds = new Set<string>([
    ...lexNormMap.keys(),
    ...vecMap.keys(),
  ]);

  const mergedResults: RetrievalResult[] = [];

  for (const chunkId of allChunkIds) {
    const lexEntry = lexNormMap.get(chunkId);
    const vecEntry = vecMap.get(chunkId);

    const normL = lexEntry ? lexEntry.norm : 0;
    const rawL = lexEntry ? lexEntry.raw.score : undefined;

    const rawV = vecEntry ? vecEntry.similarity : undefined;
    const normV = vecEntry ? normalizeSemanticScore(vecEntry.similarity) : 0;

    let hybridScore = 0;
    let contribMode: RetrievalMode = 'hybrid';

    if (lexEntry && vecEntry) {
      hybridScore = lexWeight * normL + semWeight * normV;
      contribMode = 'hybrid';
    } else if (lexEntry) {
      hybridScore = lexWeight * normL;
      contribMode = 'lexical';
    } else if (vecEntry) {
      hybridScore = semWeight * normV;
      contribMode = 'semantic';
    }

    let baseProvenance = lexEntry ? lexEntry.raw.provenance : vecEntry!.provenance;
    if (lexEntry && vecEntry) {
      baseProvenance = {
        ...lexEntry.raw.provenance,
        pageNumber: lexEntry.raw.provenance.pageNumber ?? vecEntry.provenance.pageNumber,
        slideNumber: lexEntry.raw.provenance.slideNumber ?? vecEntry.provenance.slideNumber,
        sectionTitle: lexEntry.raw.provenance.sectionTitle ?? vecEntry.provenance.sectionTitle,
        mediaId: lexEntry.raw.provenance.mediaId ?? vecEntry.provenance.mediaId,
        imageIndex: lexEntry.raw.provenance.imageIndex ?? vecEntry.provenance.imageIndex,
      };
    }
    const baseText = lexEntry ? lexEntry.raw.text : vecEntry!.text;
    const baseType = lexEntry ? lexEntry.raw.chunkType : vecEntry!.chunkType;
    const baseOrdinal = lexEntry ? lexEntry.raw.ordinal : vecEntry!.ordinal;
    const matchTerms = lexEntry ? lexEntry.raw.matchTerms : [];

    mergedResults.push({
      chunkId,
      text: baseText,
      chunkType: baseType,
      score: Number(hybridScore.toFixed(6)),
      matchTerms,
      provenance: baseProvenance,
      ordinal: baseOrdinal,
      lexicalScore: rawL,
      semanticScore: rawV,
      retrievalMode: contribMode,
    });
  }

  // Deterministic sorting: score DESC, then sourceId ASC, ordinal ASC, chunkId ASC
  mergedResults.sort((a, b) => {
    const scoreDiff = b.score - a.score;
    if (Math.abs(scoreDiff) > 1e-6) return scoreDiff;

    const srcComp = a.provenance.sourceId.localeCompare(b.provenance.sourceId);
    if (srcComp !== 0) return srcComp;

    const ordDiff = a.ordinal - b.ordinal;
    if (ordDiff !== 0) return ordDiff;

    return a.chunkId.localeCompare(b.chunkId);
  });

  return mergedResults.slice(0, topK);
}
