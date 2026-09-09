// MedOS — Phase 12.9: Deterministic Mock Embedding Provider
// Generates mathematically sound, deterministic unit-normalized vectors without network access.

import type { EmbeddingProvider, EmbeddingVector } from '@/models/embedding';
import { EmbeddingError } from '@/models/embedding';

export type MockProviderMode =
  | 'normal'
  | 'fail'
  | 'dimension_mismatch'
  | 'malformed'
  | 'timeout'
  | 'offline';

export class MockEmbeddingProvider implements EmbeddingProvider {
  public readonly id = 'mock-embedding';
  public readonly name = 'Mock Deterministic Embedding Provider';
  public readonly defaultModel = 'mock-text-embedding-v1';
  public dimensions: number;
  public mode: MockProviderMode = 'normal';

  constructor(dimensions: number = 64) {
    this.dimensions = dimensions;
  }

  setMode(mode: MockProviderMode): void {
    this.mode = mode;
  }

  /**
   * Deterministically maps any text string into a normalized floating point vector.
   */
  private generateVector(text: string, dims: number): number[] {
    const vector = new Array<number>(dims).fill(0);
    const cleaned = (text ?? '').toLowerCase().trim();
    if (!cleaned) {
      // Return zero vector or deterministic baseline
      return vector;
    }

    // Tokenize into words and character n-grams
    const tokens = cleaned.split(/[\s,.;:!?()[\]{}"'`/\\-]+/).filter(Boolean);

    // Seed accumulation with term hashes
    for (const token of tokens) {
      let hash = 0;
      for (let i = 0; i < token.length; i++) {
        hash = (hash << 5) - hash + token.charCodeAt(i);
        hash |= 0;
      }
      const absHash = Math.abs(hash);
      const bucket = absHash % dims;
      const sign = (absHash & 1) === 0 ? 1 : -1;
      vector[bucket] += sign * (1 + (token.length % 3));

      // Also hash character trigrams for subword robustness
      for (let j = 0; j <= token.length - 3; j++) {
        const tri = token.slice(j, j + 3);
        let triHash = 0;
        for (let k = 0; k < tri.length; k++) {
          triHash = (triHash << 3) - triHash + tri.charCodeAt(k);
          triHash |= 0;
        }
        const triBucket = Math.abs(triHash) % dims;
        vector[triBucket] += 0.5;
      }
    }

    // L2-normalize vector to unit length
    let normSq = 0;
    for (let i = 0; i < dims; i++) {
      normSq += vector[i] * vector[i];
    }

    if (normSq > 0) {
      const norm = Math.sqrt(normSq);
      for (let i = 0; i < dims; i++) {
        vector[i] = Number((vector[i] / norm).toFixed(6));
      }
    }

    return vector;
  }

  embedTextSync(text: string, model?: string): EmbeddingVector {
    if (typeof text !== 'string') {
      throw new EmbeddingError('invalid_input', 'Text must be a string');
    }

    if (this.mode === 'fail') {
      throw new EmbeddingError('provider_error', 'Simulated mock provider failure');
    }
    if (this.mode === 'offline') {
      throw new EmbeddingError('provider_unavailable', 'Mock provider offline');
    }
    if (this.mode === 'timeout') {
      throw new EmbeddingError('timeout', 'Mock provider timed out');
    }
    if (this.mode === 'dimension_mismatch') {
      return {
        vector: this.generateVector(text, this.dimensions + 16),
        dimensions: this.dimensions + 16,
        model: model ?? this.defaultModel,
        provider: this.id,
      };
    }
    if (this.mode === 'malformed') {
      return {
        vector: [NaN, Infinity, 0],
        dimensions: 3,
        model: model ?? this.defaultModel,
        provider: this.id,
      };
    }

    const vector = this.generateVector(text, this.dimensions);
    return {
      vector,
      dimensions: this.dimensions,
      model: model ?? this.defaultModel,
      provider: this.id,
    };
  }

  async embedText(text: string, model?: string): Promise<EmbeddingVector> {
    return this.embedTextSync(text, model);
  }

  async embedBatch(texts: string[], model?: string): Promise<EmbeddingVector[]> {
    return texts.map((t) => this.embedTextSync(t, model));
  }

  async healthCheck(): Promise<{ ok: boolean; message?: string }> {
    if (this.mode === 'offline' || this.mode === 'fail') {
      return { ok: false, message: `Mock provider in mode: ${this.mode}` };
    }
    return { ok: true, message: 'Mock provider healthy' };
  }
}

export const mockEmbeddingProvider = new MockEmbeddingProvider(64);
