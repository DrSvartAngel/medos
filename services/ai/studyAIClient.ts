// MedOS — Phase 10 Step 11: Study AI Client Composition Root
// Provider-neutral composition root providing StudyAIService to UI without vendor leakage.
// Supports runtime activation of real Gemini while preserving deterministic Mock fallback.

import { createStudyAIService, type StudyAIService } from './studyAIService';
import { MockAIProvider } from './mockProvider';
import type {
  AIProvider,
  AIProviderHealth,
  AIProviderId,
} from '@/models/ai';
import { AIServiceError } from '@/models/ai';

export type { AIProviderId };

export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';

export interface AIProviderConfig {
  providerId: AIProviderId;
  model?: string;
}

export type AIProviderStatus =
  | 'mock'
  | 'configured'
  | 'missing_credential'
  | 'unavailable';

export interface AIProviderState {
  providerId: AIProviderId;
  status: AIProviderStatus;
  model: string;
  hasApiKey: boolean;
}

export interface GeminiConfig {
  apiKey: string;
  model?: string;
}

// Lazily resolved dependencies to preserve strict provider-neutrality in composition root
let geminiFactory: ((config: GeminiConfig) => AIProvider) | null = null;
let apiKeyGetter: (() => Promise<string | null>) | null = null;
let apiKeyChecker: (() => Promise<boolean>) | null = null;

function resolveDependencies() {
  if (!geminiFactory) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require('./geminiProvider');
      geminiFactory = mod.createGeminiProvider;
    } catch {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const mod = require('../../services/ai/geminiProvider');
        geminiFactory = mod.createGeminiProvider;
      } catch {
        // Safe fallback
      }
    }
  }
  if (!apiKeyGetter) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require('./credentialStore');
      apiKeyGetter = mod.getGeminiApiKey;
      apiKeyChecker = mod.hasGeminiApiKey;
    } catch {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const mod = require('../../services/ai/credentialStore');
        apiKeyGetter = mod.getGeminiApiKey;
        apiKeyChecker = mod.hasGeminiApiKey;
      } catch {
        // Safe fallback
      }
    }
  }
}

/**
 * Allows test suites to inject custom credential or provider factories.
 */
export function setAIProviderDependencies(deps: {
  createGeminiProvider?: (config: GeminiConfig) => AIProvider;
  getGeminiApiKey?: () => Promise<string | null>;
  hasGeminiApiKey?: () => Promise<boolean>;
}): void {
  if (deps.createGeminiProvider) geminiFactory = deps.createGeminiProvider;
  if (deps.getGeminiApiKey) apiKeyGetter = deps.getGeminiApiKey;
  if (deps.hasGeminiApiKey) apiKeyChecker = deps.hasGeminiApiKey;
}

let activeConfig: AIProviderConfig = {
  providerId: 'mock',
  model: DEFAULT_GEMINI_MODEL,
};

let currentProvider: AIProvider = new MockAIProvider('normal');
let currentService: StudyAIService = createStudyAIService(currentProvider);
let providerStatus: AIProviderStatus = 'mock';

/**
 * Returns the active StudyAIService instance.
 * UI components must consume this instead of concrete vendor adapters.
 */
export function getStudyAIService(): StudyAIService {
  return currentService;
}

/**
 * Injects an explicit AIProvider instance (for testing or overrides).
 */
export function setStudyAIProvider(provider: AIProvider): void {
  currentProvider = provider;
  currentService = createStudyAIService(provider);
  providerStatus = provider.id === 'mock' ? 'mock' : 'configured';
}

/**
 * Returns the currently active AIProvider instance.
 */
export function getStudyAIProvider(): AIProvider {
  return currentProvider;
}

/**
 * Returns the current provider state and configuration status without exposing sensitive credentials.
 */
export async function getActiveAIProviderState(): Promise<AIProviderState> {
  resolveDependencies();
  const hasKey = apiKeyChecker ? await apiKeyChecker() : false;
  let status: AIProviderStatus;
  if (activeConfig.providerId === 'mock') {
    status = 'mock';
  } else {
    status = hasKey ? 'configured' : 'missing_credential';
  }

  return {
    providerId: activeConfig.providerId,
    status,
    model: activeConfig.model ?? DEFAULT_GEMINI_MODEL,
    hasApiKey: hasKey,
  };
}

/**
 * Activates an AI provider by ID ('mock' | 'gemini') with an optional model.
 */
export async function setActiveAIProvider(
  providerId: AIProviderId,
  model = DEFAULT_GEMINI_MODEL
): Promise<void> {
  activeConfig = { providerId, model };
  await refreshStudyAIService();
}

/**
 * Re-reads credentials and reconstructs the active provider and service.
 */
export async function refreshStudyAIService(): Promise<void> {
  if (activeConfig.providerId === 'mock') {
    currentProvider = new MockAIProvider('normal');
    currentService = createStudyAIService(currentProvider);
    providerStatus = 'mock';
    return;
  }

  resolveDependencies();
  const apiKey = apiKeyGetter ? await apiKeyGetter() : null;
  if (!apiKey) {
    providerStatus = 'missing_credential';
    const unconfiguredProvider: AIProvider = {
      id: 'gemini',
      name: 'Google Gemini',
      async generateText() {
        throw new AIServiceError(
          'provider_unavailable',
          'Gemini API key is not configured. Please set it in AI Settings.'
        );
      },
      async generateStructured() {
        throw new AIServiceError(
          'provider_unavailable',
          'Gemini API key is not configured. Please set it in AI Settings.'
        );
      },
      async healthCheck(): Promise<AIProviderHealth> {
        return { ok: false, message: 'Gemini API key is missing.' };
      },
    };
    currentProvider = unconfiguredProvider;
    currentService = createStudyAIService(currentProvider);
    return;
  }

  // Key is available, construct real Gemini provider
  if (!geminiFactory) {
    throw new AIServiceError(
      'provider_unavailable',
      'Gemini provider factory could not be resolved.'
    );
  }

  const gemini = geminiFactory({
    apiKey,
    model: activeConfig.model ?? DEFAULT_GEMINI_MODEL,
  });
  currentProvider = gemini;
  currentService = createStudyAIService(gemini);
  providerStatus = 'configured';
}

/**
 * Explicit health check testing connectivity to the active AI provider.
 * Does not write or mutate any curriculum, Memory, or Q-Bank data.
 */
export async function testAIProviderConnection(): Promise<AIProviderHealth> {
  if (activeConfig.providerId === 'mock') {
    return currentProvider.healthCheck();
  }

  resolveDependencies();
  const apiKey = apiKeyGetter ? await apiKeyGetter() : null;
  if (!apiKey) {
    return { ok: false, message: 'Gemini API key is not configured.' };
  }

  if (!geminiFactory) {
    return { ok: false, message: 'Gemini provider factory could not be resolved.' };
  }

  const provider = geminiFactory({
    apiKey,
    model: activeConfig.model ?? DEFAULT_GEMINI_MODEL,
  });
  return provider.healthCheck();
}

/**
 * Resets the client to the deterministic MockAIProvider.
 */
export function resetStudyAIClient(): void {
  activeConfig = { providerId: 'mock', model: DEFAULT_GEMINI_MODEL };
  currentProvider = new MockAIProvider('normal');
  currentService = createStudyAIService(currentProvider);
  providerStatus = 'mock';
}

