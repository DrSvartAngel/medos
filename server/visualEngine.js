// MedOS — Server-Side Gemini Multimodal Visual Understanding Engine
// Interprets anatomical diagrams, flowcharts, histology figures, and educational graphics.
// Enforces strict medical educational boundaries and provider-neutral contracts.
// Secrets are strictly contained server-side (process.env.GEMINI_API_KEY).

const DEFAULT_GEMINI_VISUAL_MODEL = 'gemini-3.8-flash';
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

const VISUAL_UNDERSTANDING_SYSTEM_PROMPT = `
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
7. Return your response STRICTLY as a single JSON object with the following schema:
{
  "description": "Concise factual description of what is visibly shown",
  "visibleLabels": ["List of key visible text labels and anatomical/pathway callouts"],
  "relationships": "Explanation of functional relationships, pathways, or directional flow depicted",
  "educationalExplanation": "Core medical educational interpretation for student review",
  "uncertaintyWarnings": ["Any ambiguities, missing labels, or educational caveats"]
}
`.trim();

function redactSecret(str, secret) {
  if (!str || !secret) return str || '';
  return str.split(secret).join('[REDACTED]');
}

function buildVisualPrompt(params) {
  const parts = [`TASK: ${params.task || 'explain_diagram'}`];

  if (params.sourceMetadata) {
    const meta = params.sourceMetadata;
    parts.push(`SOURCE: "${meta.sourceTitle || 'Untitled'}" (Topic: "${meta.topicName || 'Medical Topic'}")`);
    if (meta.pageNumber) parts.push(`PAGE: ${meta.pageNumber}`);
    if (meta.slideNumber) parts.push(`SLIDE: ${meta.slideNumber}`);
  }

  if (params.surroundingText && params.surroundingText.trim().length > 0) {
    parts.push(`SURROUNDING CONTEXT:\n${params.surroundingText.trim().slice(0, 1500)}`);
  }

  if (params.ocrText && params.ocrText.trim().length > 0) {
    parts.push(`VISIBLE OCR LABELS:\n${params.ocrText.trim().slice(0, 1000)}`);
  }

  return parts.join('\n\n');
}

const crypto = require('crypto');

const visualCache = new Map();
const MAX_CACHE_ENTRIES = 200;

/**
 * Executes a multimodal visual analysis using Gemini 3.8 Flash.
 * @param {object} params
 * @param {string|Buffer} [params.imageBuffer] - Binary image buffer
 * @param {string} [params.imageBase64] - Base64 encoded image
 * @param {string} [params.mimeType] - image/png, image/jpeg, or image/webp
 * @param {string} params.task - describe_visual | extract_labels | explain_diagram | explain_chart | summarize_figure
 * @param {string} [params.ocrText]
 * @param {string} [params.surroundingText]
 * @param {object} [params.sourceMetadata]
 */
async function analyzeVisual(params) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_VISUAL_MODEL || DEFAULT_GEMINI_VISUAL_MODEL;

  const provenance = {
    sourceId: params.sourceMetadata?.sourceId || '',
    sourceTitle: params.sourceMetadata?.sourceTitle || '',
    topicId: params.sourceMetadata?.topicId || '',
    pageNumber: params.sourceMetadata?.pageNumber,
    slideNumber: params.sourceMetadata?.slideNumber,
    mediaId: params.sourceMetadata?.mediaId,
    imageIndex: params.sourceMetadata?.imageIndex || 1,
    extractionMethod: 'visual',
  };

  let base64Data = params.imageBase64;
  if (!base64Data && params.imageBuffer) {
    base64Data = Buffer.isBuffer(params.imageBuffer)
      ? params.imageBuffer.toString('base64')
      : Buffer.from(params.imageBuffer).toString('base64');
  }

  if (!base64Data) {
    return {
      status: 'failed',
      model,
      description: '',
      labels: [],
      visibleLabels: [],
      educationalExplanation: '',
      uncertaintyWarnings: ['missing_image_payload'],
      provenance,
    };
  }

  const rawMime = (params.mimeType || 'image/png').toLowerCase();
  const validMimes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
  if (!validMimes.includes(rawMime)) {
    return {
      status: 'failed',
      model,
      description: '',
      labels: [],
      visibleLabels: [],
      educationalExplanation: '',
      uncertaintyWarnings: ['unsupported_image_format'],
      provenance,
    };
  }
  const mimeType = rawMime === 'image/jpg' ? 'image/jpeg' : rawMime;

  // Truthful check: If server has no GEMINI_API_KEY configured
  if (!apiKey || apiKey.trim().length === 0 || apiKey.includes('your_')) {
    return {
      status: 'visual_provider_not_configured',
      model,
      description: '',
      labels: [],
      visibleLabels: [],
      educationalExplanation: '',
      uncertaintyWarnings: ['visual_provider_not_configured'],
      provenance,
    };
  }

  const task = params.task || 'explain_diagram';
  const fingerprint = crypto
    .createHash('sha256')
    .update(`${base64Data.slice(0, 1024)}_${base64Data.length}_${task}_${model}`)
    .digest('hex');

  if (visualCache.has(fingerprint)) {
    const cached = visualCache.get(fingerprint);
    return {
      ...cached,
      provenance: {
        ...cached.provenance,
        ...provenance,
      },
    };
  }

  const promptText = buildVisualPrompt(params);

  const requestBody = {
    contents: [
      {
        role: 'user',
        parts: [
          {
            inlineData: {
              mimeType,
              data: base64Data,
            },
          },
          {
            text: promptText,
          },
        ],
      },
    ],
    systemInstruction: {
      parts: [{ text: VISUAL_UNDERSTANDING_SYSTEM_PROMPT }],
    },
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 1024,
      responseMimeType: 'application/json',
    },
  };

  const endpointUrl = `${GEMINI_API_BASE}/models/${encodeURIComponent(model)}:generateContent`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      const sanitized = redactSecret(errText, apiKey);
      const isRateLimit = response.status === 429;
      return {
        status: 'failed',
        model,
        description: '',
        labels: [],
        educationalExplanation: '',
        uncertaintyWarnings: [
          isRateLimit ? 'rate_limit_exceeded' : `provider_error_${response.status}: ${sanitized.slice(0, 200)}`,
        ],
        provenance,
      };
    }

    const data = await response.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidateText || candidateText.trim().length === 0) {
      return {
        status: 'uncertain',
        model,
        description: '',
        labels: [],
        educationalExplanation: '',
        uncertaintyWarnings: ['empty_model_response'],
        provenance,
      };
    }

    let parsed;
    try {
      parsed = JSON.parse(candidateText);
    } catch {
      // Fallback if model wraps in backticks or partial JSON
      const jsonMatch = candidateText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch {
          parsed = null;
        }
      }
    }

    if (!parsed || typeof parsed !== 'object') {
      return {
        status: 'partial',
        model,
        description: candidateText.slice(0, 300),
        labels: [],
        educationalExplanation: candidateText,
        uncertaintyWarnings: ['malformed_structured_response'],
        provenance: {
          ...provenance,
          excerpt: candidateText.slice(0, 150),
        },
      };
    }

    const description = String(parsed.description || parsed.whatIsVisiblyShown || '').trim();
    const labels = Array.isArray(parsed.visibleLabels)
      ? parsed.visibleLabels.map(String)
      : Array.isArray(parsed.labels)
      ? parsed.labels.map(String)
      : [];
    const relationships = parsed.relationships || parsed.process || undefined;
    const educationalExplanation = String(parsed.educationalExplanation || parsed.summary || description).trim();
    const uncertaintyWarnings = Array.isArray(parsed.uncertaintyWarnings)
      ? parsed.uncertaintyWarnings.map(String)
      : undefined;

    const result = {
      status: 'success',
      model,
      description,
      labels,
      visibleLabels: labels,
      relationships: relationships ? String(relationships).trim() : undefined,
      educationalExplanation,
      uncertaintyWarnings,
      provenance: {
        ...provenance,
        excerpt: (description || educationalExplanation).slice(0, 150),
      },
    };

    visualCache.set(fingerprint, result);
    if (visualCache.size > MAX_CACHE_ENTRIES) {
      const firstKey = visualCache.keys().next().value;
      visualCache.delete(firstKey);
    }

    return result;
  } catch (err) {
    const isTimeout = err && (err.name === 'AbortError' || err.code === 'ETIMEDOUT');
    const msg = isTimeout ? 'provider_timeout' : (err instanceof Error ? err.message : 'unknown_error');
    const sanitized = redactSecret(msg, apiKey);

    return {
      status: 'failed',
      model,
      description: '',
      labels: [],
      educationalExplanation: '',
      uncertaintyWarnings: [sanitized],
      provenance,
    };
  }
}

module.exports = {
  analyzeVisual,
  buildVisualPrompt,
  DEFAULT_GEMINI_VISUAL_MODEL,
  VISUAL_UNDERSTANDING_SYSTEM_PROMPT,
};
