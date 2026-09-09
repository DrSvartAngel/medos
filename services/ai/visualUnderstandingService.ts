// MedOS — Phase 12.4.2: Server-Side Gemini Visual Understanding Client Service
// Provider-neutral client service for semantic visual understanding of diagrams, flowcharts, and figures.
// Communicates with MedOS dedicated Render extraction microservice (/analyze-visual).
// Enforces zero-secret exposure on mobile client (all Gemini API calls are server-side).

import type {
  VisualAnalysisRequest,
  VisualAnalysisResult,
  VisualUnderstandingProvider,
} from '@/models/visualUnderstanding';
import type { SourceProvenance } from '@/models/ingestion';
import { getPdfExtractionEndpoint } from '@/services/documents/pdfConfig';

export const VISUAL_UNDERSTANDING_SYSTEM_PROMPT = `
You are MedOS Visual Intelligence, an educational assistant for medical students.
Your role is to explain learning diagrams, anatomical figures, biochemical pathways, charts, and educational lecture illustrations.

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
7. Return your response STRICTLY as a single JSON object.
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

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  if (typeof btoa !== 'undefined') {
    return btoa(binary);
  }
  const globalBuf = (globalThis as any).Buffer;
  if (globalBuf && typeof globalBuf.from === 'function') {
    return globalBuf.from(bytes).toString('base64');
  }
  return '';
}

async function resolveImageBase64(request: VisualAnalysisRequest): Promise<string | null> {
  if (request.imageBase64 && request.imageBase64.trim().length > 0) {
    return request.imageBase64.trim();
  }

  if (!request.imageUri) return null;

  try {
    let FileClass: any = null;
    try {
      if (typeof require !== 'undefined') {
        const expoFs = require('expo-file-system');
        FileClass = expoFs?.File ?? null;
      }
    } catch {}

    if (!FileClass) {
      try {
        const esmFs = await import('expo-file-system');
        FileClass = esmFs?.File ?? null;
      } catch {}
    }

    if (FileClass && typeof FileClass === 'function') {
      try {
        const fileObj = new FileClass(request.imageUri);
        if (fileObj && typeof fileObj.bytes === 'function') {
          const bytes: Uint8Array = await fileObj.bytes();
          return uint8ArrayToBase64(bytes);
        }
      } catch {}
    }

    if (typeof require !== 'undefined') {
      try {
        const fs = require('fs');
        if (fs.existsSync(request.imageUri)) {
          return fs.readFileSync(request.imageUri).toString('base64');
        }
      } catch {}
    }

    const response = await fetch(request.imageUri);
    if (response.ok) {
      const buffer = await response.arrayBuffer();
      return uint8ArrayToBase64(new Uint8Array(buffer));
    }
  } catch {
    return null;
  }

  return null;
}

export class HttpVisualUnderstandingProvider implements VisualUnderstandingProvider {
  readonly id = 'render-visual-gemini';
  readonly name = 'MedOS Server-Side Gemini Visual Engine';

  private customEndpoint: string | null = null;

  constructor(config?: { baseUrl?: string; endpoint?: string }) {
    if (config?.endpoint) this.customEndpoint = config.endpoint;
    else if (config?.baseUrl) this.customEndpoint = config.baseUrl;
  }

  private resolveEndpoint(): string {
    if (this.customEndpoint && this.customEndpoint.trim().length > 0) {
      return this.customEndpoint.trim().replace(/\/+$/, '');
    }
    const envEndpoint = getPdfExtractionEndpoint();
    if (envEndpoint && envEndpoint.trim().length > 0) {
      return envEndpoint.trim().replace(/\/+$/, '');
    }
    return 'https://medos-pdf-extraction.onrender.com';
  }

  async isAvailable(): Promise<boolean> {
    try {
      const base = this.resolveEndpoint();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${base}/health`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!res.ok) return false;
      const data = await res.json();
      return Boolean(data.visualConfigured);
    } catch {
      return false;
    }
  }

  async analyzeVisual(request: VisualAnalysisRequest): Promise<VisualAnalysisResult> {
    const provenance: SourceProvenance = {
      sourceId: request.sourceMetadata.sourceId,
      sourceTitle: request.sourceMetadata.sourceTitle,
      topicId: '',
      pageNumber: request.sourceMetadata.pageNumber,
      slideNumber: request.sourceMetadata.slideNumber,
      mediaId: request.sourceMetadata.mediaId,
      imageIndex: request.sourceMetadata.imageIndex || 1,
      extractionMethod: 'visual',
    };

    const imageBase64 = await resolveImageBase64(request);
    if (!imageBase64) {
      return {
        status: 'failed',
        description: '',
        labels: [],
        visibleLabels: [],
        educationalExplanation: '',
        uncertaintyWarnings: ['missing_image_payload'],
        provenance,
      };
    }

    const base = this.resolveEndpoint();
    const targetUrl = `${base}/analyze-visual`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64,
          mimeType: request.mimeType || 'image/png',
          task: request.task,
          ocrText: request.ocrText,
          surroundingText: request.surroundingText,
          sourceMetadata: request.sourceMetadata,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          status: 'analysis_failed',
          description: '',
          labels: [],
          visibleLabels: [],
          educationalExplanation: '',
          uncertaintyWarnings: [`HTTP Error ${response.status}`],
          provenance,
        };
      }

      const data = await response.json();
      const rawStatus = data.status || 'success';
      const labels = Array.isArray(data.labels)
        ? data.labels
        : Array.isArray(data.visibleLabels)
        ? data.visibleLabels
        : [];

      let status: VisualAnalysisResult['status'] = 'success';
      if (rawStatus === 'visual_provider_not_configured' || rawStatus === 'blocked_by_provider_configuration') {
        status = 'visual_provider_not_configured';
      } else if (rawStatus === 'partial') {
        status = 'partial';
      } else if (rawStatus === 'uncertain') {
        status = 'uncertain';
      } else if (rawStatus === 'failed') {
        status = 'analysis_failed';
      }

      return {
        status,
        model: data.model,
        description: data.description || '',
        labels,
        visibleLabels: labels,
        relationships: data.relationships,
        educationalExplanation: data.educationalExplanation || '',
        uncertaintyWarnings: Array.isArray(data.uncertaintyWarnings) ? data.uncertaintyWarnings : undefined,
        provenance: {
          ...provenance,
          excerpt: (data.description || data.educationalExplanation || '').slice(0, 150),
        },
      };
    } catch (err: unknown) {
      const isTimeout = err && typeof err === 'object' && (err as any).name === 'AbortError';
      return {
        status: isTimeout ? 'analysis_failed' : 'network_unavailable',
        description: '',
        labels: [],
        visibleLabels: [],
        educationalExplanation: '',
        uncertaintyWarnings: [isTimeout ? 'provider_timeout' : (err instanceof Error ? err.message : 'network_unavailable')],
        provenance,
      };
    }
  }
}

// Backward compatibility alias for any existing imports
export const GeminiVisualUnderstandingProvider = HttpVisualUnderstandingProvider;

export class VisualUnderstandingService {
  private activeProvider: VisualUnderstandingProvider | null = null;
  private cache = new Map<string, VisualAnalysisResult>();

  constructor() {
    this.activeProvider = new HttpVisualUnderstandingProvider();
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
      imageIndex: request.sourceMetadata.imageIndex || 1,
      extractionMethod: 'visual',
    };

    if (!this.activeProvider) {
      return {
        status: 'visual_provider_not_configured',
        description: '',
        labels: [],
        visibleLabels: [],
        educationalExplanation: '',
        uncertaintyWarnings: ['no_visual_provider_configured'],
        provenance,
      };
    }

    // Check client in-memory cache for duplicate requests
    const cacheKey = `${request.sourceMetadata.sourceId}_${request.sourceMetadata.pageNumber || request.sourceMetadata.slideNumber || 0}_${request.sourceMetadata.imageIndex || 1}_${request.task}`;
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      if (cached.status === 'success') {
        return cached;
      }
    }

    const result = await this.activeProvider.analyzeVisual(request);
    if (result.status === 'success') {
      this.cache.set(cacheKey, result);
    }
    return result;
  }
}

export const visualUnderstandingService = new VisualUnderstandingService();
