// MedOS — Phase 10 Step 4: Real Gemini AI Provider Adapter
// Provider-neutral HTTP REST adapter for Google Generative Language API.

import {
  AIGenerateStructuredRequest,
  AIGenerateTextRequest,
  AIGenerateTextResult,
  AIProvider,
  AIProviderHealth,
  AIProviderId,
  AIServiceError,
  AISourceContext,
} from '@/models/ai';

export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
export const DEFAULT_GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
export const DEFAULT_TIMEOUT_MS = 30000;

/**
 * Sanitizes any secret strings (like API keys) from text or error output.
 */
export function redactSecrets(text: string, secrets: (string | null | undefined)[]): string {
  let result = text;
  for (const s of secrets) {
    if (s && typeof s === 'string' && s.trim().length > 3) {
      result = result.split(s).join('[REDACTED]');
    }
  }
  return result;
}

export interface GeminiProviderConfig {
  apiKey: string;
  model?: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

interface GeminiContentPart {
  text: string;
}

interface GeminiContent {
  role?: string;
  parts: GeminiContentPart[];
}

interface GeminiRequestBody {
  contents: GeminiContent[];
  systemInstruction?: {
    parts: GeminiContentPart[];
  };
  generationConfig?: {
    temperature?: number;
    maxOutputTokens?: number;
    responseMimeType?: string;
  };
}

interface GeminiCandidate {
  content?: {
    parts?: GeminiContentPart[];
    role?: string;
  };
  finishReason?: string;
}

interface GeminiResponseBody {
  candidates?: GeminiCandidate[];
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
}

function formatPromptWithSources(
  userPrompt: string,
  sources?: AISourceContext[],
  schemaDescription?: string
): string {
  let text = userPrompt.trim();

  // If sources exist and are not already embedded in userPrompt
  if (sources && sources.length > 0) {
    const isAlreadyEmbedded = sources.every((s) => {
      const sample = s.content.trim().slice(0, 40);
      return sample.length > 0 && text.includes(sample);
    });

    if (!isAlreadyEmbedded) {
      const sourceBlocks = sources
        .map(
          (s) =>
            `SOURCE: "${s.sourceTitle}" (Topic: "${s.topicName}")\n---\n${s.content.trim()}\n---`
        )
        .join('\n\n');
      text = `${sourceBlocks}\n\n${text}`;
    }
  }

  if (schemaDescription && !text.includes(schemaDescription.slice(0, 30))) {
    text = `${text}\n\nREQUIRED JSON SCHEMA:\n${schemaDescription}`;
  }

  return text;
}

async function postGenerateContent(
  url: string,
  apiKey: string,
  body: GeminiRequestBody,
  fetchFn: typeof fetch,
  timeoutMs: number
): Promise<GeminiResponseBody> {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

  let response: Response;
  try {
    response = await fetchFn(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(body),
      signal: controller?.signal,
    });
  } catch (err: unknown) {
    if (controller?.signal?.aborted) {
      throw new AIServiceError(
        'provider_unavailable',
        'AI provider request timed out.'
      );
    }
    throw new AIServiceError(
      'provider_unavailable',
      'Network request to AI provider failed. Check internet connection.'
    );
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }

  if (!response.ok) {
    let sanitizedErrorDetail = '';
    try {
      const errJson = (await response.json()) as GeminiResponseBody;
      if (errJson?.error?.message) {
        // Redact any occurrence of API key in provider error strings
        sanitizedErrorDetail = errJson.error.message.replace(apiKey, '[REDACTED]');
      }
    } catch {
      // Ignore JSON parse error on non-200 responses
    }

    if (response.status === 401 || response.status === 403) {
      throw new AIServiceError(
        'provider_unavailable',
        'AI provider authentication failed. Check API key.'
      );
    }
    if (response.status === 429) {
      throw new AIServiceError(
        'provider_unavailable',
        'AI provider rate limit exceeded. Please try again later.'
      );
    }
    if (response.status >= 500) {
      throw new AIServiceError(
        'provider_unavailable',
        'AI provider service is temporarily unavailable. Please try again later.'
      );
    }

    throw new AIServiceError(
      'provider_unavailable',
      `AI provider request failed with status ${response.status}.${
        sanitizedErrorDetail ? ` (${sanitizedErrorDetail})` : ''
      }`
    );
  }

  try {
    return (await response.json()) as GeminiResponseBody;
  } catch {
    throw new AIServiceError(
      'invalid_response',
      'Failed to parse AI provider response as JSON.'
    );
  }
}

function extractCandidateText(json: GeminiResponseBody): string {
  if (!json || typeof json !== 'object') {
    throw new AIServiceError(
      'invalid_response',
      'AI provider response is empty or malformed.'
    );
  }

  const candidates = json.candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) {
    throw new AIServiceError(
      'invalid_response',
      'AI provider returned no candidates.'
    );
  }

  const first = candidates[0];
  const parts = first?.content?.parts;
  if (!Array.isArray(parts) || parts.length === 0) {
    throw new AIServiceError(
      'invalid_response',
      'AI candidate content contains no parts.'
    );
  }

  const text = parts[0]?.text;
  if (typeof text !== 'string' || !text.trim()) {
    throw new AIServiceError(
      'invalid_response',
      'AI provider returned an empty text response.'
    );
  }

  return text;
}

export class GeminiAIProvider implements AIProvider {
  readonly id: AIProviderId = 'gemini';
  readonly name = 'Google Gemini';

  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;

  constructor(config: GeminiProviderConfig) {
    if (!config || typeof config !== 'object') {
      throw new AIServiceError('provider_unavailable', 'Gemini config object is required.');
    }

    this.apiKey = typeof config.apiKey === 'string' ? config.apiKey.trim() : '';
    this.model = config.model?.trim() || DEFAULT_GEMINI_MODEL;
    this.baseUrl = config.baseUrl?.trim() || DEFAULT_GEMINI_BASE_URL;
    this.fetchImpl = config.fetchImpl || globalThis.fetch;
    this.timeoutMs = config.timeoutMs || DEFAULT_TIMEOUT_MS;
  }

  private validateApiKey(): void {
    if (!this.apiKey) {
      throw new AIServiceError(
        'provider_unavailable',
        'Gemini API key is missing. Configure an API key before generating.'
      );
    }
  }

  async generateText(request: AIGenerateTextRequest): Promise<AIGenerateTextResult> {
    this.validateApiKey();
    const userText = formatPromptWithSources(request.userPrompt, request.sources);
    const url = `${this.baseUrl}/models/${encodeURIComponent(this.model)}:generateContent`;

    const body: GeminiRequestBody = {
      contents: [
        {
          role: 'user',
          parts: [{ text: userText }],
        },
      ],
    };

    if (request.systemPrompt && request.systemPrompt.trim()) {
      body.systemInstruction = {
        parts: [{ text: request.systemPrompt.trim() }],
      };
    }

    if (request.options) {
      body.generationConfig = {};
      if (typeof request.options.temperature === 'number') {
        body.generationConfig.temperature = request.options.temperature;
      }
      if (typeof request.options.maxOutputTokens === 'number') {
        body.generationConfig.maxOutputTokens = request.options.maxOutputTokens;
      }
    }

    const resJson = await postGenerateContent(
      url,
      this.apiKey,
      body,
      this.fetchImpl,
      this.timeoutMs
    );

    const text = extractCandidateText(resJson);

    return {
      text,
      providerId: 'gemini',
    };
  }

  async generateStructured<T>(request: AIGenerateStructuredRequest): Promise<T> {
    this.validateApiKey();
    const userText = formatPromptWithSources(
      request.userPrompt,
      request.sources,
      request.schemaDescription
    );
    const url = `${this.baseUrl}/models/${encodeURIComponent(this.model)}:generateContent`;

    const body: GeminiRequestBody = {
      contents: [
        {
          role: 'user',
          parts: [{ text: userText }],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
      },
    };

    if (request.systemPrompt && request.systemPrompt.trim()) {
      body.systemInstruction = {
        parts: [{ text: request.systemPrompt.trim() }],
      };
    }

    if (request.options) {
      if (typeof request.options.temperature === 'number') {
        body.generationConfig!.temperature = request.options.temperature;
      }
      if (typeof request.options.maxOutputTokens === 'number') {
        body.generationConfig!.maxOutputTokens = request.options.maxOutputTokens;
      }
    }

    const resJson = await postGenerateContent(
      url,
      this.apiKey,
      body,
      this.fetchImpl,
      this.timeoutMs
    );

    const rawText = extractCandidateText(resJson);

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawText.trim());
    } catch {
      // Strip markdown code fences if model enclosed JSON in ```json ... ```
      const stripped = rawText
        .trim()
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
      try {
        parsed = JSON.parse(stripped);
      } catch {
        throw new AIServiceError(
          'invalid_response',
          'Failed to parse Gemini structured response as valid JSON.'
        );
      }
    }

    if (parsed === null || parsed === undefined) {
      throw new AIServiceError(
        'invalid_response',
        'Parsed JSON response from AI provider is empty.'
      );
    }

    return parsed as T;
  }

  async healthCheck(): Promise<AIProviderHealth> {
    if (!this.apiKey) {
      return { ok: false, message: 'Gemini API key is missing.' };
    }

    try {
      const res = await this.generateText({
        systemPrompt: 'Respond with OK.',
        userPrompt: 'Ping.',
        options: { maxOutputTokens: 10 },
      });
      return {
        ok: Boolean(res.text),
        message: 'Gemini provider is online and responsive.',
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gemini health check failed.';
      return { ok: false, message: msg };
    }
  }
}

export function createGeminiProvider(config: GeminiProviderConfig): AIProvider {
  return new GeminiAIProvider(config);
}

export { GeminiAIProvider as GeminiProvider };
