// MedOS — Phase 12.9: Embedding Client Registry
// Provides the runtime embedding provider instance.
// Defaults safely to UnconfiguredEmbeddingProvider to prevent silent mock usage in production.
// Mock provider is restricted to testing and development validation.

import type { EmbeddingProvider, EmbeddingVector } from '@/models/embedding';
import { EmbeddingError } from '@/models/embedding';
import { mockEmbeddingProvider } from './mockEmbeddingProvider';
import { geminiEmbeddingAdapter } from './geminiEmbeddingAdapter';

export class UnconfiguredEmbeddingProvider implements EmbeddingProvider {
  public readonly id = 'unconfigured';
  public readonly name = 'No Embedding Provider Configured';
  public readonly defaultModel = 'none';
  public readonly dimensions = 0;

  async embedText(): Promise<EmbeddingVector> {
    throw new EmbeddingError(
      'provider_unavailable',
      'No real embedding provider is configured. Lexical retrieval will be used.'
    );
  }

  async embedBatch(): Promise<EmbeddingVector[]> {
    throw new EmbeddingError(
      'provider_unavailable',
      'No real embedding provider is configured. Lexical retrieval will be used.'
    );
  }
}

export const unconfiguredEmbeddingProvider = new UnconfiguredEmbeddingProvider();

let _activeProvider: EmbeddingProvider | null = null;

export function getActiveEmbeddingProvider(): EmbeddingProvider {
  if (_activeProvider) {
    return _activeProvider;
  }
  return unconfiguredEmbeddingProvider;
}

export function setActiveEmbeddingProvider(provider: EmbeddingProvider | null): void {
  _activeProvider = provider;
}

export function resetActiveEmbeddingProvider(): void {
  _activeProvider = null;
}

export { mockEmbeddingProvider, geminiEmbeddingAdapter };

