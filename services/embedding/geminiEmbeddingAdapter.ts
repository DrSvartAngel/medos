// MedOS — Phase 12.9: Google Gemini Embedding Provider Adapter
// Secure REST integration for text-embedding-004 via credentialStore.
// Zero hardcoded API keys; fails safely if unconfigured or offline.

import type { EmbeddingProvider, EmbeddingVector } from '@/models/embedding';
import { EmbeddingError } from '@/models/embedding';
import { getGeminiApiKey } from '@/services/ai/credentialStore';

const GEMINI_EMBED_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_GEMINI_EMBED_MODEL = 'text-embedding-004';
const DEFAULT_DIMENSIONS = 768;

export class GeminiEmbeddingAdapter implements EmbeddingProvider {
  public readonly id = 'gemini-embedding';
  public readonly name = 'Google Gemini Embedding Adapter';
  public readonly defaultModel = DEFAULT_GEMINI_EMBED_MODEL;
  public readonly dimensions = DEFAULT_DIMENSIONS;

  async embedText(text: string, model?: string): Promise<EmbeddingVector> {
    if (typeof text !== 'string') {
      throw new EmbeddingError('invalid_input', 'Text must be a string');
    }

    const apiKey = await getGeminiApiKey();
    if (!apiKey) {
      throw new EmbeddingError(
        'provider_unavailable',
        'Gemini API key is not configured in SecureStore'
      );
    }

    const activeModel = model ?? this.defaultModel;
    const url = `${GEMINI_EMBED_BASE_URL}/${activeModel}:embedContent?key=${encodeURIComponent(apiKey)}`;

    let response: Response;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: `models/${activeModel}`,
          content: {
            parts: [{ text }],
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new EmbeddingError('timeout', 'Gemini embedding request timed out');
      }
      throw new EmbeddingError(
        'provider_unavailable',
        `Network error calling Gemini embedding: ${err instanceof Error ? err.message : 'unknown'}`
      );
    }

    if (!response.ok) {
      if (response.status === 429) {
        throw new EmbeddingError('rate_limited', 'Gemini embedding rate limit reached');
      }
      throw new EmbeddingError(
        'provider_error',
        `Gemini embedding API returned HTTP ${response.status}`
      );
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new EmbeddingError('malformed_vector', 'Failed to parse Gemini embedding JSON response');
    }

    const rawValues = (data as { embedding?: { values?: unknown } })?.embedding?.values;
    if (!Array.isArray(rawValues) || rawValues.length === 0) {
      throw new EmbeddingError('malformed_vector', 'Invalid or empty embedding values in Gemini response');
    }

    const vector: number[] = rawValues.map((v) => Number(v));
    for (const val of vector) {
      if (Number.isNaN(val) || !Number.isFinite(val)) {
        throw new EmbeddingError('malformed_vector', 'Embedding contains NaN or Infinity values');
      }
    }

    return {
      vector,
      dimensions: vector.length,
      model: activeModel,
      provider: this.id,
    };
  }

  async embedBatch(texts: string[], model?: string): Promise<EmbeddingVector[]> {
    const results: EmbeddingVector[] = [];
    for (const text of texts) {
      results.push(await this.embedText(text, model));
    }
    return results;
  }

  async healthCheck(): Promise<{ ok: boolean; message?: string }> {
    const apiKey = await getGeminiApiKey();
    if (!apiKey) {
      return { ok: false, message: 'Gemini API key is not configured' };
    }
    return { ok: true, message: 'Gemini embedding adapter configured' };
  }
}

export const geminiEmbeddingAdapter = new GeminiEmbeddingAdapter();
