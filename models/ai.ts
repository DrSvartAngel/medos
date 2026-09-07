// MedOS — Phase 10 Step 1: AI Study Engine Domain Models
// Provider-neutral, source-grounded contracts for medical study assistance.

export type AIProviderId = 'mock' | 'gemini' | 'openai';

/**
 * Context payload provided to the AI containing the specific source material
 * and topic provenance for strict grounding.
 */
export interface AISourceContext {
  sourceId: string;
  sourceTitle: string;
  topicId: string;
  topicName: string;
  content: string;
}

export interface AIGenerateOptions {
  temperature?: number;
  maxOutputTokens?: number;
}

export interface AIProviderHealth {
  ok: boolean;
  message?: string;
}

export interface AIGenerateTextRequest {
  systemPrompt: string;
  userPrompt: string;
  sources?: AISourceContext[];
  options?: AIGenerateOptions;
}

export interface AIGenerateTextResult {
  text: string;
  providerId: AIProviderId;
}

export interface AIGenerateStructuredRequest {
  systemPrompt: string;
  userPrompt: string;
  schemaDescription: string;
  sources?: AISourceContext[];
  options?: AIGenerateOptions;
}

/**
 * Vendor-neutral interface implemented by concrete AI providers (Mock, Gemini, OpenAI, etc.).
 * Domain code and UI components communicate strictly through this interface.
 */
export interface AIProvider {
  readonly id: AIProviderId;
  readonly name: string;

  generateText(request: AIGenerateTextRequest): Promise<AIGenerateTextResult>;

  generateStructured<T>(request: AIGenerateStructuredRequest): Promise<T>;

  healthCheck(): Promise<AIProviderHealth>;
}

/**
 * Candidate flashcard draft generated from study material.
 * Stored ephemerally or in draft review queue until human approval.
 * Contains no subjective AI confidence scores.
 */
export interface AIFlashcardDraft {
  id: string;
  front: string;
  back: string;
  sourceId: string;
  sourceTitle: string;
  sourceExcerpt: string;
  topicId: string;
  edited?: boolean;
}

export interface AIExplanationResult {
  text: string;
  sourceId: string;
  sourceTitle: string;
}

export interface AISummaryResult {
  text: string;
  sourceId: string;
  sourceTitle: string;
}

export type AIServiceErrorCode =
  | 'provider_unavailable'
  | 'invalid_response'
  | 'source_not_supported'
  | 'grounding_failed'
  | 'generation_limit_exceeded';

/**
 * Domain error class for AI Study Engine operations.
 * Exposes clean, stable error codes and safe messages without leaking vendor secrets or raw payloads.
 */
export class AIServiceError extends Error {
  readonly code: AIServiceErrorCode;

  constructor(code: AIServiceErrorCode, message: string) {
    super(message);
    this.name = 'AIServiceError';
    this.code = code;
    Object.setPrototypeOf(this, AIServiceError.prototype);
  }
}
