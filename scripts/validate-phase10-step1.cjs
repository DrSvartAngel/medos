/**
 * MedOS — Phase 10 Step 1 Validation Suite
 *
 * Validates AI Study Engine foundation:
 * - Domain types and error models
 * - Pure prompt builders and source-grounding instructions
 * - Excerpt verification logic (whitespace normalization)
 * - Study AI service orchestration (limits, grounding, provenance, error translation)
 * - Mock provider determinism and test modes (normal, malformed, bad_grounding, unavailable)
 * - Security scans (no hardcoded keys, secrets, or bearer tokens)
 * - Network isolation (zero fetch, zero XMLHttp, zero vendor SDKs)
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');

function load(file, mocks = {}) {
  const code = ts.transpileModule(read(file), {
    fileName: file,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
    },
  }).outputText;
  const module = { exports: {} };
  vm.runInThisContext('(function(require,module,exports){' + code + '\n})')(
    (key) => (Object.hasOwn(mocks, key) ? mocks[key] : require(key)),
    module,
    module.exports
  );
  return module.exports;
}

let passed = 0;
async function check(name, fn) {
  try {
    await fn();
    console.log(`PASS ${name}`);
    passed++;
  } catch (err) {
    console.error(`\nFAIL: ${err}`);
    process.exit(1);
  }
}

async function main() {
  console.log('=== PHASE 10 STEP 1: AI STUDY ENGINE FOUNDATION SUITE ===\n');

  // ── 1. DOMAIN CONTRACTS & MODULE LOADING ─────────────────────────────────────
  const modelsAi = load('models/ai.ts');
  const prompts = load('services/ai/prompts.ts', {
    '@/models/ai': modelsAi,
  });
  const studyAIServiceModule = load('services/ai/studyAIService.ts', {
    '@/models/ai': modelsAi,
    './prompts': prompts,
  });
  const mockProviderModule = load('services/ai/mockProvider.ts', {
    '@/models/ai': modelsAi,
  });

  await check('Domain Types: Provider-neutral contracts and error classes exist', () => {
    assert.ok(modelsAi.AIServiceError, 'AIServiceError class must exist');
    const err = new modelsAi.AIServiceError('grounding_failed', 'Test grounding failure');
    assert.equal(err.code, 'grounding_failed');
    assert.equal(err.name, 'AIServiceError');
    assert.ok(err instanceof Error, 'AIServiceError must extend Error');

    const aiSource = read('models/ai.ts');
    assert.ok(!aiSource.includes("from '@google/") && !aiSource.includes("from \"@google/"), 'No Google SDK imports in models');
    assert.ok(!aiSource.includes("from 'openai'") && !aiSource.includes("from \"openai\""), 'No OpenAI SDK imports in models');
    assert.ok(!aiSource.includes('readinessPercent'), 'No readinessPercent in AI domain');
    assert.ok(!aiSource.includes('confidenceScore'), 'No confidenceScore in AI domain');
    assert.ok(!aiSource.includes('hallucinationScore'), 'No hallucinationScore in AI domain');
    assert.ok(!aiSource.includes('qualityScore'), 'No qualityScore in AI domain');
    assert.ok(!aiSource.includes('apiKey'), 'No apiKey fields in domain contracts');
  });

  // ── 2. PROMPT CONTRACTS & SOURCE GROUNDING ──────────────────────────────────
  await check('Prompts: Source-only grounding, insufficient-source behavior, and medical scope', () => {
    const dummySource = {
      sourceId: 'src-1',
      sourceTitle: 'Cardiac Electrophysiology Notes',
      topicId: 't-action-potentials',
      topicName: 'Action Potentials',
      content: 'Phase 0 corresponds to rapid depolarization via voltage-gated sodium channels.\n' +
               'Phase 2 is the plateau phase characterized by calcium influx through L-type channels.',
    };

    // 1. Explain prompt
    const explainPrompt = prompts.buildExplainPrompt('Phase 0 Depolarization', dummySource);
    assert.ok(
      explainPrompt.systemPrompt.includes('Rely ONLY on the facts, concepts, and terminology explicitly stated'),
      'System prompt must mandate source-only grounding'
    );
    assert.ok(
      explainPrompt.systemPrompt.includes('The provided study material does not contain sufficient information'),
      'System prompt must require explicit insufficient-source message'
    );
    assert.ok(
      explainPrompt.systemPrompt.includes('Do NOT fabricate citations'),
      'System prompt must forbid fabricated citations/page numbers'
    );
    assert.ok(
      explainPrompt.systemPrompt.includes('academic study tool for medical education'),
      'System prompt must state medical education study scope'
    );
    assert.ok(
      explainPrompt.systemPrompt.includes('Do NOT provide patient-specific medical advice'),
      'System prompt must forbid patient-specific clinical advice/diagnosis'
    );
    assert.ok(explainPrompt.userPrompt.includes('Phase 0 corresponds to rapid depolarization'), 'User prompt must include study material');
    assert.ok(explainPrompt.userPrompt.includes('Phase 0 Depolarization'), 'User prompt must include requested concept');

    // 2. Summarize prompt
    const summarizePrompt = prompts.buildSummarizePrompt(dummySource);
    assert.ok(summarizePrompt.systemPrompt.includes('Rely ONLY on the facts'), 'Summarize system prompt must mandate grounding');
    assert.ok(summarizePrompt.userPrompt.includes('Cardiac Electrophysiology Notes'), 'Summarize user prompt must include source title');

    // 3. Flashcard draft prompt
    const draftPrompt = prompts.buildFlashcardDraftPrompt(dummySource, 3);
    assert.ok(draftPrompt.schemaDescription.includes('sourceExcerpt'), 'Draft schema must include sourceExcerpt');
    assert.ok(draftPrompt.userPrompt.includes('Generate up to 3 active-recall flashcard drafts'), 'Draft prompt must specify requested count');
    assert.ok(draftPrompt.userPrompt.includes('verbatim 1-2 sentence excerpt directly from the study material'), 'Draft prompt must mandate verbatim excerpt');
  });

  // ── 3. EXCERPT GROUNDING VALIDATION ─────────────────────────────────────────
  await check('Excerpt Grounding: Exact match, whitespace normalization, and rejection of fabrications', () => {
    const sourceText = 'Phase 0 corresponds to rapid depolarization\n' +
                       '   via voltage-gated sodium channels.   \n\n' +
                       'Phase 2 is the plateau phase.';

    // Exact excerpt
    assert.equal(
      prompts.isExcerptGrounded('Phase 2 is the plateau phase.', sourceText),
      true,
      'Exact excerpt must pass grounding'
    );

    // Whitespace-normalized excerpt (multi-space/newlines collapsed)
    assert.equal(
      prompts.isExcerptGrounded('Phase 0 corresponds to rapid depolarization via voltage-gated sodium channels.', sourceText),
      true,
      'Whitespace-normalized excerpt must pass grounding'
    );

    // Fabricated excerpt not present in source
    assert.equal(
      prompts.isExcerptGrounded('Digitalis inhibits the sodium-potassium ATPase pump.', sourceText),
      false,
      'Invented excerpt must fail grounding'
    );

    // Empty or non-string inputs
    assert.equal(prompts.isExcerptGrounded('', sourceText), false, 'Empty excerpt must fail');
    assert.equal(prompts.isExcerptGrounded('   ', sourceText), false, 'Whitespace-only excerpt must fail');
    assert.equal(prompts.isExcerptGrounded('Phase 2', ''), false, 'Empty source text must fail');
    assert.equal(prompts.isExcerptGrounded(null, sourceText), false, 'Null excerpt must fail');
  });

  // ── 4. MOCK PROVIDER BEHAVIOR ───────────────────────────────────────────────
  await check('Mock Provider: Deterministic outputs across modes (normal, malformed, bad_grounding, unavailable)', async () => {
    const mock = new mockProviderModule.MockAIProvider('normal');
    assert.equal(mock.id, 'mock');
    assert.equal(mock.name, 'Mock AI Provider');

    const dummySource = {
      sourceId: 'src-1',
      sourceTitle: 'Renal Physiology',
      topicId: 't-glomerular',
      topicName: 'Glomerular Filtration',
      content: 'The glomerular filtration rate is regulated by arteriolar resistance.\n' +
               'Podocytes form the visceral layer of Bowman capsule.',
    };

    // Normal mode health
    const health = await mock.healthCheck();
    assert.equal(health.ok, true);

    // Normal mode text
    const textRes = await mock.generateText({
      systemPrompt: 'sys',
      userPrompt: 'user',
      sources: [dummySource],
    });
    assert.ok(textRes.text.includes('Renal Physiology'), 'Text response must mention source');
    assert.equal(textRes.providerId, 'mock');

    // Normal mode structured drafts
    const drafts = await mock.generateStructured({
      systemPrompt: 'sys',
      userPrompt: 'user',
      schemaDescription: 'schema',
      sources: [dummySource],
    });
    assert.ok(Array.isArray(drafts), 'Structured result must be an array in normal mode');
    assert.equal(drafts.length, 2);
    assert.ok(prompts.isExcerptGrounded(drafts[0].sourceExcerpt, dummySource.content), 'Draft excerpt must pass grounding');

    // Bad grounding mode
    mock.setMode('bad_grounding');
    const badDrafts = await mock.generateStructured({
      systemPrompt: 'sys',
      userPrompt: 'user',
      schemaDescription: 'schema',
      sources: [dummySource],
    });
    assert.equal(
      prompts.isExcerptGrounded(badDrafts[0].sourceExcerpt, dummySource.content),
      false,
      'Bad grounding mode must produce ungrounded excerpts'
    );

    // Malformed mode
    mock.setMode('malformed');
    const malformedText = await mock.generateText({ systemPrompt: 's', userPrompt: 'u' });
    assert.equal(malformedText.text, '', 'Malformed mode returns empty text');
    const malformedStructured = await mock.generateStructured({ systemPrompt: 's', userPrompt: 'u', schemaDescription: 's' });
    assert.ok(!Array.isArray(malformedStructured), 'Malformed mode returns non-array');

    // Unavailable mode
    mock.setMode('unavailable');
    const unavailHealth = await mock.healthCheck();
    assert.equal(unavailHealth.ok, false);
    await assert.rejects(
      async () => mock.generateText({ systemPrompt: 's', userPrompt: 'u' }),
      /503 Service Unavailable/
    );
  });

  // ── 5. STUDY AI SERVICE ORCHESTRATION ───────────────────────────────────────
  await check('Study AI Service: Grounding enforcement, batch limits, and error handling', async () => {
    const mock = new mockProviderModule.MockAIProvider('normal');
    const service = studyAIServiceModule.createStudyAIService(mock);

    const validSource = {
      sourceId: 'src-cardiac',
      sourceTitle: 'Cardiac Muscle Physiology',
      topicId: 't-cardiac',
      topicName: 'Cardiac Action Potentials',
      content: 'Phase 0 rapid depolarization occurs due to sodium influx.\n' +
               'Phase 2 plateau is maintained by inward calcium current.',
    };

    // 1. explainConcept
    const explanation = await service.explainConcept('Phase 0', validSource);
    assert.equal(explanation.sourceId, validSource.sourceId);
    assert.equal(explanation.sourceTitle, validSource.sourceTitle);
    assert.ok(explanation.text.length > 0, 'Explanation text must not be empty');

    // 2. summarizeSource
    const summary = await service.summarizeSource(validSource);
    assert.equal(summary.sourceId, validSource.sourceId);
    assert.equal(summary.sourceTitle, validSource.sourceTitle);
    assert.ok(summary.text.length > 0, 'Summary text must not be empty');

    // 3. generateFlashcardDrafts normal
    const drafts = await service.generateFlashcardDrafts(validSource, 2);
    assert.ok(Array.isArray(drafts));
    assert.equal(drafts.length, 2);
    for (const d of drafts) {
      assert.ok(d.id.startsWith(validSource.sourceId), 'Draft ID must reflect source provenance');
      assert.equal(d.sourceId, validSource.sourceId);
      assert.equal(d.sourceTitle, validSource.sourceTitle);
      assert.equal(d.topicId, validSource.topicId);
      assert.equal(d.edited, false);
      assert.ok(prompts.isExcerptGrounded(d.sourceExcerpt, validSource.content), 'Every draft excerpt must be grounded');
    }

    // 4. Batch limit guard: requesting > 5 must throw generation_limit_exceeded
    await assert.rejects(
      async () => service.generateFlashcardDrafts(validSource, 6),
      (err) => {
        assert.ok(err instanceof modelsAi.AIServiceError);
        assert.equal(err.code, 'generation_limit_exceeded');
        return true;
      },
      'Requesting > 5 drafts must throw generation_limit_exceeded'
    );

    // 5. Invalid count <= 0 must throw invalid_response
    await assert.rejects(
      async () => service.generateFlashcardDrafts(validSource, 0),
      (err) => {
        assert.ok(err instanceof modelsAi.AIServiceError);
        assert.equal(err.code, 'invalid_response');
        return true;
      }
    );

    // 6. Bad grounding rejection: mock producing fabricated excerpt
    mock.setMode('bad_grounding');
    await assert.rejects(
      async () => service.generateFlashcardDrafts(validSource, 2),
      (err) => {
        assert.ok(err instanceof modelsAi.AIServiceError);
        assert.equal(err.code, 'grounding_failed');
        return true;
      },
      'Draft with ungrounded excerpt must throw grounding_failed'
    );

    // 7. Malformed response rejection
    mock.setMode('malformed');
    await assert.rejects(
      async () => service.generateFlashcardDrafts(validSource, 2),
      (err) => {
        assert.ok(err instanceof modelsAi.AIServiceError);
        assert.equal(err.code, 'invalid_response');
        return true;
      },
      'Malformed provider response must throw invalid_response'
    );

    // 8. Provider unavailable error translation
    mock.setMode('unavailable');
    await assert.rejects(
      async () => service.explainConcept('Phase 0', validSource),
      (err) => {
        assert.ok(err instanceof modelsAi.AIServiceError);
        assert.equal(err.code, 'provider_unavailable');
        return true;
      },
      'Provider failure must translate to provider_unavailable'
    );

    // 9. Source context validation
    mock.setMode('normal');
    const emptySource = { ...validSource, content: '   ' };
    await assert.rejects(
      async () => service.generateFlashcardDrafts(emptySource, 2),
      (err) => {
        assert.ok(err instanceof modelsAi.AIServiceError);
        assert.equal(err.code, 'source_not_supported');
        return true;
      },
      'Empty source content must throw source_not_supported'
    );
  });

  // ── 6. FLASHCARD REPO ISOLATION ────────────────────────────────────────────
  await check('Isolation: Service returns drafts only and does NOT persist to flashcard tables', () => {
    const serviceSource = read('services/ai/studyAIService.ts');
    assert.ok(!serviceSource.includes('memoryRepo'), 'Service must not import memoryRepo');
    assert.ok(!serviceSource.includes('flashcardRepo'), 'Service must not import flashcardRepo');
    assert.ok(!serviceSource.includes('getDB'), 'Service must not access SQLite database directly');
    assert.ok(!serviceSource.includes('INSERT INTO flashcards'), 'Service must not persist flashcards');
  });

  // ── 7. SECURITY SCAN ───────────────────────────────────────────────────────
  await check('Security: Absence of credentials, hardcoded keys, and bearer tokens', () => {
    const filesToScan = [
      'models/ai.ts',
      'services/ai/prompts.ts',
      'services/ai/studyAIService.ts',
      'services/ai/mockProvider.ts',
    ];

    const forbiddenPatterns = [
      'AIza',
      'sk-',
      'OPENAI_API_KEY',
      'GEMINI_API_KEY',
      'Authorization:',
      'Bearer ',
    ];

    for (const file of filesToScan) {
      const content = read(file);
      for (const pattern of forbiddenPatterns) {
        assert.ok(
          !content.includes(pattern),
          `File ${file} must not contain forbidden pattern "${pattern}"`
        );
      }
    }
  });

  // ── 8. NETWORK & DEPENDENCY ISOLATION ───────────────────────────────────────
  await check('Network: Absence of fetch, XMLHttpRequest, axios, or AI vendor SDKs in Phase 10 runtime', () => {
    const filesToScan = [
      'models/ai.ts',
      'services/ai/prompts.ts',
      'services/ai/studyAIService.ts',
      'services/ai/mockProvider.ts',
    ];

    for (const file of filesToScan) {
      const content = read(file);
      assert.ok(!content.includes('fetch('), `File ${file} must not invoke fetch`);
      assert.ok(!content.includes('XMLHttpRequest'), `File ${file} must not use XMLHttpRequest`);
      assert.ok(!content.includes('axios'), `File ${file} must not import axios`);
      assert.ok(!content.includes("from '@google/genai'") && !content.includes('from "@google/genai"'), `File ${file} must not import @google/genai`);
      assert.ok(!content.includes("from '@google/generative-ai'") && !content.includes('from "@google/generative-ai"'), `File ${file} must not import @google/generative-ai`);
      assert.ok(!content.includes("from 'openai'") && !content.includes('from "openai"'), `File ${file} must not import openai`);
    }

    const pkg = JSON.parse(read('package.json'));
    assert.ok(!pkg.dependencies['@google/genai'], 'No Google AI SDK in package.json');
    assert.ok(!pkg.dependencies['openai'], 'No OpenAI SDK in package.json');
  });

  console.log(`\nALL ${passed} PHASE 10 STEP 1 CHECKS PASSED.`);
}

main().catch((err) => {
  console.error('\nFAIL:', err);
  process.exit(1);
});
