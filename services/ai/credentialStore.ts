// Isolated, encrypted credential storage for AI provider keys via expo-secure-store.
// NEVER stores API keys in database, plaintext device storage, logs, URL params, or source code.

import * as SecureStore from 'expo-secure-store';

export const GEMINI_API_KEY_STORAGE_KEY = 'medos.ai.gemini.apiKey';

export class CredentialStoreError extends Error {
  constructor(
    public readonly code: 'empty_key' | 'storage_unavailable' | 'storage_error',
    message: string
  ) {
    super(message);
    this.name = 'CredentialStoreError';
  }
}

/**
 * Optional override storage interface for testing / deterministic mocks.
 */
export interface SecureStorageAdapter {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
}

let storageOverride: SecureStorageAdapter | null = null;

/**
 * Sets an adapter override for testing environments where native SecureStore is unavailable.
 */
export function setSecureStorageAdapter(adapter: SecureStorageAdapter | null): void {
  storageOverride = adapter;
}

function getStorage(): SecureStorageAdapter {
  if (storageOverride) return storageOverride;
  return SecureStore;
}

/**
 * Retrieves the stored Gemini API key, or null if not set.
 * Catches any underlying SecureStore exceptions and returns null without throwing or logging secrets.
 */
export async function getGeminiApiKey(): Promise<string | null> {
  try {
    const storage = getStorage();
    const key = await storage.getItemAsync(GEMINI_API_KEY_STORAGE_KEY);
    if (!key || typeof key !== 'string') return null;
    const trimmed = key.trim();
    return trimmed.length > 0 ? trimmed : null;
  } catch {
    // Fail closed safely: never leak error detail or log key
    return null;
  }
}

/**
 * Persists the Gemini API key into secure encrypted storage.
 * Enforces trimming and rejects empty keys. Never logs the key value.
 */
export async function setGeminiApiKey(apiKey: string): Promise<void> {
  if (typeof apiKey !== 'string') {
    throw new CredentialStoreError('empty_key', 'API key must be a valid string.');
  }

  const trimmed = apiKey.trim();
  if (!trimmed) {
    throw new CredentialStoreError('empty_key', 'API key cannot be empty.');
  }

  try {
    const storage = getStorage();
    await storage.setItemAsync(GEMINI_API_KEY_STORAGE_KEY, trimmed);
  } catch {
    throw new CredentialStoreError(
      'storage_error',
      'Failed to securely store the API key on this device.'
    );
  }
}

/**
 * Deletes the stored Gemini API key from secure storage.
 */
export async function deleteGeminiApiKey(): Promise<void> {
  try {
    const storage = getStorage();
    await storage.deleteItemAsync(GEMINI_API_KEY_STORAGE_KEY);
  } catch {
    throw new CredentialStoreError(
      'storage_error',
      'Failed to remove the API key from secure storage.'
    );
  }
}

/**
 * Checks whether an API key exists without exposing the key value.
 */
export async function hasGeminiApiKey(): Promise<boolean> {
  const key = await getGeminiApiKey();
  return key !== null && key.length > 0;
}
