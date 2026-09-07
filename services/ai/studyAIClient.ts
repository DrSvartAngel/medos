// MedOS — Phase 10 Step 5: Study AI Client
// Provider-neutral access layer providing StudyAIService to UI without exposing provider-specific details.

import { createStudyAIService, type StudyAIService } from './studyAIService';
import { MockAIProvider } from './mockProvider';
import type { AIProvider } from '@/models/ai';

// Step 5 uses deterministic MockAIProvider by default for zero-cost offline development and tests.
let currentProvider: AIProvider = new MockAIProvider('normal');
let currentService: StudyAIService = createStudyAIService(currentProvider);

/**
 * Provides the active StudyAIService instance to UI components.
 * UI components must consume this instead of concrete vendor adapters.
 */
export function getStudyAIService(): StudyAIService {
  return currentService;
}

/**
 * Injects a new AIProvider implementation (e.g. for testing or future provider activation).
 */
export function setStudyAIProvider(provider: AIProvider): void {
  currentProvider = provider;
  currentService = createStudyAIService(provider);
}

/**
 * Returns the currently active provider instance (useful for test assertions / inspections).
 */
export function getStudyAIProvider(): AIProvider {
  return currentProvider;
}

/**
 * Resets the client to the default MockAIProvider.
 */
export function resetStudyAIClient(): void {
  currentProvider = new MockAIProvider('normal');
  currentService = createStudyAIService(currentProvider);
}
