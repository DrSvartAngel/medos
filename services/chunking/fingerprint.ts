// MedOS — Phase 12.5: Deterministic Chunk Fingerprinting
// Pure JavaScript deterministic hashing for reproducible chunk IDs and stable fingerprints
// Zero native or crypto module dependencies (operates universally in Node, Hermes, and Expo).

/**
 * High-quality 64-bit FNV-1a inspired deterministic hash returning a 16-character hexadecimal string.
 */
export function computeDeterministicHash(input: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;

  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ code, 0x01000193);
    h2 = Math.imul(h2 ^ ((code << 5) | (code >>> 11)), 0x5bd1e995);
  }

  const hex1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const hex2 = (h2 >>> 0).toString(16).padStart(8, '0');
  return `${hex1}${hex2}`;
}

export interface FingerprintParams {
  sourceId: string;
  ordinal: number;
  chunkType: string;
  extractionMethod: string;
  pageNumber?: number;
  slideNumber?: number;
  mediaId?: string;
  normalizedText: string;
}

/**
 * Builds a stable, collision-resistant fingerprint for a source chunk.
 */
export function buildChunkFingerprint(params: FingerprintParams): string {
  const normalized = params.normalizedText.trim().replace(/\r\n/g, '\n');
  const canonicalKey = [
    params.sourceId,
    params.ordinal,
    params.chunkType,
    params.extractionMethod,
    params.pageNumber ?? '',
    params.slideNumber ?? '',
    params.mediaId ?? '',
    normalized,
  ].join('::');

  return computeDeterministicHash(canonicalKey);
}
