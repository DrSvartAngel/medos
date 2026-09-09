// MedOS — Phase 12.5: Lightweight Token & Word Estimator
// Fast, deterministic offline metrics for chunk size planning without external vendor tokenizer dependencies.

/**
 * Estimates the token count of a given string.
 * Uses an empirical blend of character density and word counts:
 * typical medical English/Turkish averages ~4 characters per token or ~1.3 tokens per word.
 */
export function estimateTokens(text: string): number {
  if (!text || text.trim().length === 0) return 0;
  const trimmed = text.trim();
  const words = trimmed.split(/\s+/).filter(Boolean).length;
  const byChars = Math.ceil(trimmed.length / 4);
  const byWords = Math.ceil(words * 1.3);
  return Math.max(byChars, byWords, 1);
}

/**
 * Counts words in a string using whitespace boundaries.
 */
export function countWords(text: string): number {
  if (!text || text.trim().length === 0) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export const CHUNK_SIZE_CONFIG = {
  TARGET_MIN_TOKENS: 300,
  TARGET_MAX_TOKENS: 700,
  SOFT_MAX_TOKENS: 900,
  OVERLAP_MIN_TOKENS: 50,
  OVERLAP_MAX_TOKENS: 100,
} as const;
