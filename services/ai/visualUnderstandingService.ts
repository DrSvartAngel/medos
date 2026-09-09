// MedOS — Phase 12.4: Visual Understanding Service & Provider Adapter
// Provider-neutral semantic interpretation of educational diagrams, flowcharts, and figures.
// Enforces strict medical educational boundaries, contextual grounding, and truthful provider status.

import type {
  VisualAnalysisRequest,
  VisualAnalysisResult,
  VisualTaskType,
  VisualUnderstandingProvider,
} from '@/models/visualUnderstanding';
import type { SourceProvenance } from '@/models/ingestion';
import { getGeminiApiKey } from './credentialStore';
import { DEFAULT_GEMINI_BASE_URL, DEFAULT_GEMINI_MODEL, redactSecrets } from './geminiProvider';

/**
 * System prompt enforcing educational grounding and prohibiting fabricated patient diagnoses.
 */
export const VISUAL_UNDERSTANDING_SYSTEM_PROMPT = `
You are MedOS Visual Intelligence, an educational assistant for medical students.
Your role is to explain learning diagrams, anatomical figures, biochemical pathways, and graphs.

CRITICAL MEDICAL EDUCATIONAL BOUNDARIES:
1. This is strictly a MEDICAL EDUCATION application.
2. DO NOT formulate or fabricate clinical diagnoses for patient images.
3. For educational diagrams/figures, describe what is visibly labeled and explain the physiological or anatomical concept.
4. Ground your explanation in the provided surrounding text and visible OCR labels.
5. If an image is ambiguous, unlabeled, or unclear, explicitly state uncertainty using phrasing like:
   - "The image appears to illustrate..."
   - "The visible labeled structures indicate..."
   - "Based on the educational context..."
6. Never invent clinical disease labels not present in the visible content or surrounding context.
`.trim();

export function buildVisualPrompt(request: VisualAnalysisRequest): string {
  const parts = [`TASK: ${request.task}`];

  if (request.sourceMetadata) {
    parts.push(`SOURCE: "${request.sourceMetadata.sourceTitle}" (Topic: "${request.sourceMetadata.topicName}")`);
    if (request.sourceMetadata.pageNumber) {
      parts.push(`PAGE: ${request.sourceMetadata.pageNumber}`);
    }
    if (request.sourceMetadata.slideNumber) {
      parts.push(`SLIDE: ${request.sourceMetadata.slideNumber}`);
    }
  }

  if (request.surroundingText) {
    parts.push(`SURROUNDING CONTEXT:\n${request.surroundingText.trim()}`);
  }

  if (request.ocrText) {
    parts.push(`VISIBLE OCR LABELS:\n${request.ocrText.trim()}`);
  }

  parts.push(
    `Provide a structured educational explanation:
1. What is visibly shown
2. Key visible labels
3. Functional relationships or processes depicted
4. Educational summary for medical study
5. Any ambiguities or uncertainties`
  );

  return parts.join('\n\n');
}

export class GeminiVisualUnderstandingProvider implements VisualUnderstandingProvider {
  readonly id = 'gemini-visual';
  readonly name = 'Google Gemini Multimodal';

  private customApiKey: string | null = null;
  private model: string;
  private baseUrl: string;

  constructor(config?: { apiKey?: string; model?: string; baseUrl?: string }) {
    if (config?.apiKey) this.customApiKey = config.apiKey;
    this.model = config?.model || DEFAULT_GEMINI_MODEL;
    this.baseUrl = config?.baseUrl || DEFAULT_GEMINI_BASE_URL;
  }

  private async resolveApiKey(): Promise<string | null> {
    if (this.customApiKey && this.customApiKey.trim().length > 0) {
      return this.customApiKey.trim();
    }
    return await getGeminiApiKey();
  }

  async isAvailable(): Promise<boolean> {
    const key = await this.resolveApiKey();
    return Boolean(key && key.trim().length > 0 && !key.includes('your_'));
  }

  async analyzeVisual(request: VisualAnalysisRequest): Promise<VisualAnalysisResult> {
    const apiKey = await this.resolveApiKey();
    const provenance: SourceProvenance = {
      sourceId: request.sourceMetadata.sourceId,
      sourceTitle: request.sourceMetadata.sourceTitle,
      topicId: '',
      pageNumber: request.sourceMetadata.pageNumber,
      slideNumber: request.sourceMetadata.slideNumber,
      mediaId: request.sourceMetadata.mediaId,
      imageIndex: request.sourceMetadata.imageIndex,
      extractionMethod: 'visual',
    };

    if (!apiKey || apiKey.trim().length === 0 || apiKey.includes('your_')) {
      return {
        status: 'blocked_by_provider_configuration',
        description: '',
        labels: [],
        educationalExplanation: '',
        uncertaintyWarnings: ['multimodal_provider_not_configured'],
        provenance,
      };
    }

    try {
      const promptText = buildVisualPrompt(request);
      const parts: any[] = [{ text: promptText }];

      if (request.imageBase64) {
        parts.unshift({
          inlineData: {
            mimeType: request.mimeType || 'image/png',
            data: request.imageBase64,
          },
        });
      }

      const url = `${this.baseUrl}/models/${encodeURIComponent(this.model)}:generateContent`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts }],
          systemInstruction: { parts: [{ text: VISUAL_UNDERSTANDING_SYSTEM_PROMPT }] },
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 1024,
            responseMimeType: 'application/json',
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        const cleanMsg = redactSecrets(errorText, [apiKey]);
        return {
          status: 'failed',
          description: '',
          labels: [],
          educationalExplanation: '',
          uncertaintyWarnings: [`API Error ${response.status}: ${cleanMsg}`],
          provenance,
        };
      }

      const data = await response.json();
      const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!candidate) {
        return {
          status: 'uncertain',
          description: '',
          labels: [],
          educationalExplanation: '',
          uncertaintyWarnings: ['empty_model_response'],
          provenance,
        };
      }

      let parsed: any;
      try {
        parsed = JSON.parse(candidate);
      } catch {
        parsed = { description: candidate, educationalExplanation: candidate, labels: [] };
      }

      return {
        status: 'success',
        description: parsed.description || parsed.whatIsVisiblyShown || '',
        labels: Array.isArray(parsed.labels) ? parsed.labels : [],
        relationships: parsed.relationships || parsed.process || undefined,
        educationalExplanation: parsed.educationalExplanation || parsed.summary || candidate,
        uncertaintyWarnings: Array.isArray(parsed.uncertaintyWarnings) ? parsed.uncertaintyWarnings : undefined,
        provenance: {
          ...provenance,
          excerpt: (parsed.description || candidate).slice(0, 150),
        },
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown visual analysis failure';
      const cleanMsg = redactSecrets(message, [apiKey]);
      return {
        status: 'failed',
        description: '',
        labels: [],
        educationalExplanation: '',
        uncertaintyWarnings: [cleanMsg],
        provenance,
      };
    }
  }
}

export class VisualUnderstandingService {
  private activeProvider: VisualUnderstandingProvider | null = null;

  constructor() {
    this.activeProvider = new GeminiVisualUnderstandingProvider();
  }

  setProvider(provider: VisualUnderstandingProvider | null): void {
    this.activeProvider = provider;
  }

  getProvider(): VisualUnderstandingProvider | null {
    return this.activeProvider;
  }

  async isAvailable(): Promise<boolean> {
    if (!this.activeProvider) return false;
    return await this.activeProvider.isAvailable();
  }

  async analyzeVisual(request: VisualAnalysisRequest): Promise<VisualAnalysisResult> {
    const provenance: SourceProvenance = {
      sourceId: request.sourceMetadata.sourceId,
      sourceTitle: request.sourceMetadata.sourceTitle,
      topicId: '',
      pageNumber: request.sourceMetadata.pageNumber,
      slideNumber: request.sourceMetadata.slideNumber,
      mediaId: request.sourceMetadata.mediaId,
      imageIndex: request.sourceMetadata.imageIndex,
      extractionMethod: 'visual',
    };

    if (!this.activeProvider) {
      return {
        status: 'blocked_by_provider_configuration',
        description: '',
        labels: [],
        educationalExplanation: '',
        uncertaintyWarnings: ['no_visual_provider_configured'],
        provenance,
      };
    }

    const available = await this.activeProvider.isAvailable();
    if (!available) {
      return {
        status: 'blocked_by_provider_configuration',
        description: '',
        labels: [],
        educationalExplanation: '',
        uncertaintyWarnings: ['multimodal_provider_not_configured'],
        provenance,
      };
    }

    return await this.activeProvider.analyzeVisual(request);
  }
}

export const visualUnderstandingService = new VisualUnderstandingService();
