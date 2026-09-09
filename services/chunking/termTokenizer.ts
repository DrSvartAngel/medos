// MedOS — Deterministic Term Tokenizer for SQLite Inverted Index
// Normalizes and extracts searchable tokens with Turkish Unicode awareness.

const TURKISH_UPPER_TO_LOWER: Record<string, string> = {
  'İ': 'i',
  'I': 'ı',
  'Ğ': 'ğ',
  'Ü': 'ü',
  'Ş': 'ş',
  'Ö': 'ö',
  'Ç': 'ç',
};

export function normalizeTerm(text: string): string {
  if (!text) return '';
  let normalized = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    normalized += TURKISH_UPPER_TO_LOWER[ch] ?? ch.toLowerCase();
  }
  return normalized.trim();
}

/**
 * Tokenizes arbitrary content into a frequency map of normalized terms.
 * Ignores single-character tokens to optimize index size.
 */
export function tokenizeText(text: string): Map<string, number> {
  const termCounts = new Map<string, number>();
  if (!text || typeof text !== 'string') return termCounts;

  const normalized = normalizeTerm(text);
  const matches = normalized.match(/[\p{L}\p{N}]+/gu);
  if (!matches) return termCounts;

  for (const token of matches) {
    if (token.length < 2) continue;
    termCounts.set(token, (termCounts.get(token) ?? 0) + 1);
  }

  return termCounts;
}

/**
 * Tokenizes a search query into an array of unique normalized query terms.
 */
export function tokenizeQuery(query: string): string[] {
  if (!query || typeof query !== 'string') return [];
  const normalized = normalizeTerm(query);
  const matches = normalized.match(/[\p{L}\p{N}]+/gu);
  if (!matches) return [];

  const seen = new Set<string>();
  const terms: string[] = [];
  for (const token of matches) {
    if (token.length >= 2 && !seen.has(token)) {
      seen.add(token);
      terms.push(token);
    }
  }
  return terms;
}
