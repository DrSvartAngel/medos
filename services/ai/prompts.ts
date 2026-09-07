// MedOS — Phase 10 Step 1: AI Prompt Builders & Grounding Validation
// Pure, provider-independent functions for source-grounded medical study prompts.

import { AISourceContext, AIStudyPlanningContext } from '@/models/ai';

const BASE_SYSTEM_PROMPT = `You are a medical education study assistant in MedOS.
Your role is to assist medical students with academic coursework, exam preparation, and active recall.

CORE GROUNDING RULES:
1. Grounding: Rely ONLY on the facts, concepts, and terminology explicitly stated in the provided study material.
2. Insufficient Source: If the provided study material does not contain the answer or support the concept, state clearly: "The provided study material does not contain sufficient information to address this topic."
3. No Fabrication: Do NOT fabricate citations, page numbers, journal references, or external facts.
4. No Extraneous Medical Knowledge: Do NOT silently introduce outside medical facts or unverified clinical assertions.
5. Medical Scope: This is an academic study tool for medical education. Do NOT provide patient-specific medical advice, diagnosis, triage, or clinical treatment recommendations.`;

/**
 * Normalizes text by collapsing consecutive whitespace characters into a single space and trimming.
 */
export function normalizeWhitespace(text: string): string {
  if (typeof text !== 'string') return '';
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Validates whether a candidate excerpt is genuinely grounded in the source text.
 * Performs whitespace-normalized substring matching.
 * Rejects empty or fabricated excerpts.
 */
export function isExcerptGrounded(excerpt: string, sourceContent: string): boolean {
  if (typeof excerpt !== 'string' || typeof sourceContent !== 'string') {
    return false;
  }

  const cleanExcerpt = normalizeWhitespace(excerpt);
  const cleanSource = normalizeWhitespace(sourceContent);

  if (cleanExcerpt.length === 0 || cleanSource.length === 0) {
    return false;
  }

  // Exact normalized substring match (case-insensitive for resilience to minor capitalization variance)
  return cleanSource.toLowerCase().includes(cleanExcerpt.toLowerCase());
}

/**
 * Builds system and user prompts for explaining a concept strictly from source material.
 */
export function buildExplainPrompt(
  concept: string,
  source: AISourceContext
): { systemPrompt: string; userPrompt: string } {
  const cleanConcept = concept.trim();

  const userPrompt = `TOPIC: ${source.topicName}
SOURCE TITLE: ${source.sourceTitle}

STUDY MATERIAL:
---
${source.content.trim()}
---

TASK:
Explain the following concept using ONLY the study material provided above:
"${cleanConcept}"

If the material does not cover this concept, state that clearly.`;

  return {
    systemPrompt: BASE_SYSTEM_PROMPT,
    userPrompt,
  };
}

/**
 * Builds system and user prompts for summarizing source material.
 */
export function buildSummarizePrompt(
  source: AISourceContext
): { systemPrompt: string; userPrompt: string } {
  const userPrompt = `TOPIC: ${source.topicName}
SOURCE TITLE: ${source.sourceTitle}

STUDY MATERIAL:
---
${source.content.trim()}
---

TASK:
Provide a concise, high-yield academic summary of the study material provided above.
Capture core physiological, anatomical, or clinical mechanisms directly described in the text.
Do not introduce outside knowledge or ungrounded claims.`;

  return {
    systemPrompt: BASE_SYSTEM_PROMPT,
    userPrompt,
  };
}

/**
 * Builds prompts and schema description for generating active-recall flashcard drafts.
 */
export function buildFlashcardDraftPrompt(
  source: AISourceContext,
  count: number
): { systemPrompt: string; userPrompt: string; schemaDescription: string } {
  const schemaDescription = `JSON Array of objects with keys:
- "front": string (concise question or active recall prompt)
- "back": string (direct, accurate answer)
- "sourceExcerpt": string (an exact 1-2 sentence verbatim excerpt from the study material that proves the answer)`;

  const userPrompt = `TOPIC: ${source.topicName}
SOURCE TITLE: ${source.sourceTitle}

STUDY MATERIAL:
---
${source.content.trim()}
---

TASK:
Generate up to ${count} active-recall flashcard drafts based ONLY on the study material above.
For each flashcard:
1. "front": Focus on high-yield factual knowledge, physiological mechanisms, anatomical relationships, or clinical criteria directly found in the text.
2. "back": Concise, unambiguous answer.
3. "sourceExcerpt": You MUST copy a verbatim 1-2 sentence excerpt directly from the study material that verifies this card. Do NOT paraphrase the excerpt.

Return valid JSON conforming to the requested schema.`;

  return {
    systemPrompt: BASE_SYSTEM_PROMPT,
    userPrompt,
    schemaDescription,
  };
}

/**
 * Builds prompts and schema description for generating source-grounded practice question drafts.
 */
export function buildQuestionDraftPrompt(
  source: AISourceContext,
  count: number
): { systemPrompt: string; userPrompt: string; schemaDescription: string } {
  const schemaDescription = `JSON Array of objects with keys:
- "question": string (single-best-answer medical multiple choice question)
- "options": array of exactly 4 strings (plausible answer choices)
- "correctOptionIndex": integer (0, 1, 2, or 3, indicating the index of the single correct option in "options")
- "explanation": string (clear explanation grounded in the study material)
- "sourceExcerpt": string (an exact 1-2 sentence verbatim excerpt from the study material that proves the correct answer)`;

  const userPrompt = `TOPIC: ${source.topicName}
SOURCE TITLE: ${source.sourceTitle}

STUDY MATERIAL:
---
${source.content.trim()}
---

TASK:
Generate up to ${count} single-best-answer practice question drafts (MCQs) based ONLY on the study material above.
For each question:
1. "question": Single-best-answer medical education question addressing concepts directly explained in the text.
2. "options": Exactly 4 plausible options. Exactly ONE option must be unambiguously correct.
3. "correctOptionIndex": 0, 1, 2, or 3 matching the correct option.
4. "explanation": Explain why the correct option is right based directly on the text.
5. "sourceExcerpt": You MUST copy a verbatim 1-2 sentence excerpt directly from the study material that verifies the correct answer. Do NOT paraphrase the excerpt.

Return valid JSON conforming to the requested schema.`;

  return {
    systemPrompt: BASE_SYSTEM_PROMPT,
    userPrompt,
    schemaDescription,
  };
}

/**
 * Builds system prompt, user prompt, and schema description for AI-assisted study planning.
 */
export function buildStudyPlanPrompt(
  context: AIStudyPlanningContext
): { systemPrompt: string; userPrompt: string; schemaDescription: string } {
  const schemaDescription = `JSON Object with keys:
- "summary": string (calm, factual 1-2 sentence overview of recommended focus areas based on the evidence)
- "items": Array of objects with keys:
  - "topicId": string (MUST match one of the supplied topic IDs exactly)
  - "topicName": string (canonical name corresponding to topicId)
  - "action": string (strictly one of: "review", "memory", "qbank", "focus")
  - "reason": string (concise factual reason derived only from the provided metrics)
  - "estimatedMinutes": integer (reasonable session duration between 10 and 90 minutes)`;

  const topicsFormatted = context.topics
    .map((t, idx) => {
      const qbankInfo =
        t.qbankAccuracy !== null
          ? `${t.qbankQuestions} questions, ${t.qbankAccuracy}% accuracy`
          : `${t.qbankQuestions} questions, no accuracy score`;
      const memoryInfo =
        t.memoryRetention !== null
          ? `${t.memoryReviews} reviews, ${t.memoryRetention}% retention, ${t.dueCards} cards due`
          : `${t.memoryReviews} reviews, ${t.dueCards} cards due`;
      const weakStr =
        t.weakReasons.length > 0
          ? `Weakness triggers: [${t.weakReasons.join(', ')}]`
          : 'No active weakness triggers';
      const neglectStr =
        t.neglectStatus !== 'recent' ? `Neglect status: ${t.neglectStatus}` : 'Recently studied';

      return `${idx + 1}. TOPIC ID: "${t.topicId}"
   NAME: "${t.topicName}" (Subject: "${t.subjectName || 'General'}")
   MASTERY: ${t.masteryStatus}
   Q-BANK: ${qbankInfo}
   MEMORY (SRS): ${memoryInfo}
   STATUS: ${weakStr}; ${neglectStr}`;
    })
    .join('\n\n');

  const daysExamStr =
    typeof context.daysUntilExam === 'number'
      ? `DAYS UNTIL EXAM: ${context.daysUntilExam}`
      : 'DAYS UNTIL EXAM: Not scheduled';

  const userPrompt = `COMMITTEE: "${context.committeeName}"
${daysExamStr}

FACTUAL LEARNING EVIDENCE FOR CANDIDATE TOPICS:
---
${topicsFormatted}
---

TASK:
Create a calm, focused, and realistic advisory study plan draft consisting of up to 5 prioritized study actions based ONLY on the evidence above.

RULES:
1. Grounding: Rely ONLY on the factual evidence provided above. Do NOT invent performance metrics, exam readiness, psychiatric states, or missing scores.
2. ADHD-Friendly: Keep workload manageable (maximum 5 items). Each task must have a clear actionable step ("review", "memory", "qbank", or "focus") and realistic duration (10 to 90 minutes).
3. Objective Reasons: Clearly cite the evidence trigger (e.g. "Low Q-Bank accuracy (45%)", "15 due flashcards", "Unstudied topic"). Avoid guilt-inducing or punitive language.
4. Canonical IDs: You MUST only recommend topics listed in the candidates above, using their exact "topicId" and "topicName".
5. No Clinical Advice: Do NOT generate clinical treatment recommendations or patient-care decisions.

Return valid JSON conforming to the requested schema.`;

  return {
    systemPrompt: BASE_SYSTEM_PROMPT,
    userPrompt,
    schemaDescription,
  };
}


