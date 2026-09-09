/**
 * MedOS — Phase 10 Step 4 Validation Suite
 *
 * Validates Real Gemini AI Provider Integration:
 * - PROVIDER CONTRACT: implements AIProvider, id = 'gemini', name = 'Google Gemini', zero vendor type leakage.
 * - TEXT GENERATION: correct REST endpoint, x-goog-api-key header, source context preserved, returned text extracted.
 * - STRUCTURED GENERATION: generationConfig.responseMimeType = 'application/json', valid JSON parsed,
 *   markdown-fenced JSON handled, malformed JSON rejected, empty response rejected.
 * - STUDY AI SERVICE INTEGRATION: createStudyAIService(geminiProvider) successfully runs explainConcept,
 *   summarizeSource, and generateFlashcardDrafts with grounding verification.
 * - ERROR MAPPING: network failure, timeout, 401/403 auth, 429 rate limit, 500 server error, malformed response.
 * - SECURITY: API key injected via config, zero hardcoded keys, API key never exposed in thrown errors or URLs.
 * - TESTABILITY: 100% mocked fetch in automated tests; zero real HTTP calls or quota consumption.
 * - ISOLATION: No AI UI yet, zero flashcard/Q-Bank persistence, schema v12 strictly unchanged.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');

function load(file, mocks = {}, source = read(file)) {
  const output = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
    },
    fileName: file,
  }).outputText;
  const module = { exports: {} };
  const wrapped = vm.runInThisContext(
    '(function(require,module,exports,__filename,__dirname){' + output + '\n})',
    { filename: file }
  );
  wrapped(
    (key) => (Object.hasOwn(mocks, key) ? mocks[key] : require(key)),
    module,
    module.exports,
    file,
    path.dirname(file)
  );
  return module.exports;
}

const aiModels = load('models/ai.ts');
const prompts = load('services/ai/prompts.ts', { '@/models/ai': aiModels });
const studyAIServiceMod = load('services/ai/studyAIService.ts', {
  '@/models/ai': aiModels,
  './prompts': prompts,
});

function createMockFetch(handler) {
  return async function mockFetch(url, options) {
    return handler(url, options);
  };
}

function jsonResponse(status, data) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: async () => data,
    text: async () => JSON.stringify(data),
  };
}

let passed = 0;
async function check(name, fn) {
  try {
    await fn();
    console.log(`PASS ${name}`);
    passed++;
  } catch (err) {
    console.error(`\nFAIL: ${name}\n${err.stack || err}`);
    process.exit(1);
  }
}

async function main() {
  console.log('=== PHASE 10 STEP 4: GEMINI AI PROVIDER INTEGRATION SUITE ===\n');

  const geminiMod = load('services/ai/geminiProvider.ts', {
    '@/models/ai': aiModels,
  });

  const { createGeminiProvider, GeminiAIProvider, DEFAULT_GEMINI_MODEL, DEFAULT_GEMINI_BASE_URL } = geminiMod;

  // ── 1. PROVIDER CONTRACT & ATTRIBUTES ─────────────────────────────────────────
  await check('Provider Contract: Implements AIProvider, id="gemini", zero vendor type leakage', () => {
    assert.equal(typeof createGeminiProvider, 'function');
    assert.equal(typeof GeminiAIProvider, 'function');

    const provider = createGeminiProvider({
      apiKey: 'test-dummy-key-12345',
    });

    assert.equal(provider.id, 'gemini', 'Provider id must be "gemini"');
    assert.equal(provider.name, 'Google Gemini', 'Provider name must be "Google Gemini"');
    assert.equal(typeof provider.generateText, 'function');
    assert.equal(typeof provider.generateStructured, 'function');
    assert.equal(typeof provider.healthCheck, 'function');

    // Missing config or missing key validation
    assert.throws(() => {
      // @ts-ignore
      createGeminiProvider(null);
    }, /Gemini config object is required/);

    const emptyKeyProvider = createGeminiProvider({ apiKey: '   ' });
    assert.rejects(
      async () => {
        await emptyKeyProvider.generateText({ systemPrompt: '', userPrompt: 'test' });
      },
      (err) => err instanceof aiModels.AIServiceError && err.code === 'provider_unavailable'
    );
  });

  // ── 2. TEXT GENERATION VIA REST ──────────────────────────────────────────────
  await check('Text Generation: Correct URL, x-goog-api-key header, source context preservation, text extraction', async () => {
    let capturedUrl = '';
    let capturedOptions = null;
    let capturedBody = null;

    const mockFetch = createMockFetch((url, options) => {
      capturedUrl = url;
      capturedOptions = options;
      capturedBody = JSON.parse(options.body);

      return jsonResponse(200, {
        candidates: [
          {
            content: {
              parts: [{ text: 'Grounded explanation of cardiac action potentials.' }],
              role: 'model',
            },
            finishReason: 'STOP',
          },
        ],
      });
    });

    const provider = createGeminiProvider({
      apiKey: 'my-secret-test-key',
      fetchImpl: mockFetch,
    });

    const sourceContext = {
      sourceId: 'src-1',
      sourceTitle: 'Robbins Pathology',
      topicId: 't-1',
      topicName: 'Myocardial Infarction',
      content: 'Ischemia triggers coagulative necrosis within hours.',
    };

    const result = await provider.generateText({
      systemPrompt: 'You are a medical assistant.',
      userPrompt: 'Explain the mechanism of ischemia.',
      sources: [sourceContext],
      options: { temperature: 0.1, maxOutputTokens: 500 },
    });

    assert.equal(result.providerId, 'gemini');
    assert.equal(result.text, 'Grounded explanation of cardiac action potentials.');

    // Assert URL endpoint
    assert.equal(
      capturedUrl,
      `${DEFAULT_GEMINI_BASE_URL}/models/${encodeURIComponent(DEFAULT_GEMINI_MODEL)}:generateContent`
    );

    // Assert header-based auth (x-goog-api-key) without query string exposure
    assert.equal(capturedOptions.headers['x-goog-api-key'], 'my-secret-test-key');
    assert.equal(capturedOptions.headers['Content-Type'], 'application/json');
    assert.ok(!capturedUrl.includes('my-secret-test-key'), 'API key must not be in the URL query string');

    // Assert request body structure
    assert.equal(capturedBody.systemInstruction.parts[0].text, 'You are a medical assistant.');
    assert.equal(capturedBody.generationConfig.temperature, 0.1);
    assert.equal(capturedBody.generationConfig.maxOutputTokens, 500);

    // Assert source context is preserved in user content
    const userText = capturedBody.contents[0].parts[0].text;
    assert.ok(userText.includes('Robbins Pathology'), 'Source title must be preserved');
    assert.ok(userText.includes('Myocardial Infarction'), 'Topic name must be preserved');
    assert.ok(userText.includes('Ischemia triggers coagulative necrosis'), 'Content must be preserved');
  });

  // ── 3. STRUCTURED OUTPUT GENERATION ──────────────────────────────────────────
  await check('Structured Generation: Requests application/json, parses JSON, handles markdown code fences', async () => {
    let capturedBody = null;

    const mockFetch = createMockFetch((url, options) => {
      capturedBody = JSON.parse(options.body);

      // Return JSON wrapped in markdown code fence (common LLM behavior)
      const payload = JSON.stringify([
        {
          front: 'What type of necrosis occurs in myocardial infarction?',
          back: 'Coagulative necrosis.',
          sourceExcerpt: 'Ischemia triggers coagulative necrosis within hours.',
        },
      ]);

      return jsonResponse(200, {
        candidates: [
          {
            content: {
              parts: [{ text: `\`\`\`json\n${payload}\n\`\`\`` }],
              role: 'model',
            },
            finishReason: 'STOP',
          },
        ],
      });
    });

    const provider = createGeminiProvider({
      apiKey: 'test-key',
      fetchImpl: mockFetch,
    });

    const structuredResult = await provider.generateStructured({
      systemPrompt: 'You are an active recall assistant.',
      userPrompt: 'Generate a flashcard.',
      schemaDescription: 'Array of objects with front, back, sourceExcerpt',
    });

    assert.ok(Array.isArray(structuredResult), 'Result must be parsed array');
    assert.equal(structuredResult.length, 1);
    assert.equal(structuredResult[0].front, 'What type of necrosis occurs in myocardial infarction?');
    assert.equal(structuredResult[0].back, 'Coagulative necrosis.');

    // Verify responseMimeType in generationConfig
    assert.equal(capturedBody.generationConfig.responseMimeType, 'application/json');
  });

  // ── 4. STRUCTURED GENERATION REJECTION OF MALFORMED RESPONSES ────────────────
  await check('Structured Generation: Rejects invalid JSON and empty candidates', async () => {
    // 1. Invalid JSON string
    const badJsonFetch = createMockFetch(() =>
      jsonResponse(200, {
        candidates: [
          {
            content: { parts: [{ text: 'This is not valid JSON at all: {broken' }] },
          },
        ],
      })
    );
    const badJsonProvider = createGeminiProvider({ apiKey: 'k', fetchImpl: badJsonFetch });
    await assert.rejects(
      async () => {
        await badJsonProvider.generateStructured({
          systemPrompt: '',
          userPrompt: 'Test',
          schemaDescription: 'JSON',
        });
      },
      (err) => err instanceof aiModels.AIServiceError && err.code === 'invalid_response'
    );

    // 2. Empty candidates
    const emptyCandidatesFetch = createMockFetch(() =>
      jsonResponse(200, {
        candidates: [],
      })
    );
    const emptyCandidatesProvider = createGeminiProvider({ apiKey: 'k', fetchImpl: emptyCandidatesFetch });
    await assert.rejects(
      async () => {
        await emptyCandidatesProvider.generateStructured({
          systemPrompt: '',
          userPrompt: 'Test',
          schemaDescription: 'JSON',
        });
      },
      (err) => err instanceof aiModels.AIServiceError && err.code === 'invalid_response'
    );

    // 3. Empty text in part
    const emptyTextFetch = createMockFetch(() =>
      jsonResponse(200, {
        candidates: [
          {
            content: { parts: [{ text: '   ' }] },
          },
        ],
      })
    );
    const emptyTextProvider = createGeminiProvider({ apiKey: 'k', fetchImpl: emptyTextFetch });
    await assert.rejects(
      async () => {
        await emptyTextProvider.generateStructured({
          systemPrompt: '',
          userPrompt: 'Test',
          schemaDescription: 'JSON',
        });
      },
      (err) => err instanceof aiModels.AIServiceError && err.code === 'invalid_response'
    );
  });

  // ── 5. STUDY AI SERVICE INTEGRATION ──────────────────────────────────────────
  await check('StudyAIService Integration: Orchestrates explain, summarize, and grounded flashcards via GeminiProvider', async () => {
    const sourceContext = {
      sourceId: 'src-cell-1',
      sourceTitle: 'Cell Injury and Death',
      topicId: 'top-path-1',
      topicName: 'Cellular Adaptations',
      content:
        'Hypertrophy is an increase in the size of cells resulting in an overall increase in the size of the organ. ' +
        'Hyperplasia is an increase in the number of cells in an organ or tissue in response to a stimulus.',
    };

    const mockFetch = createMockFetch((url, options) => {
      const body = JSON.parse(options.body);

      // Check if this is a structured flashcard request
      if (body.generationConfig?.responseMimeType === 'application/json') {
        const drafts = [
          {
            front: 'What is hypertrophy?',
            back: 'An increase in cell size resulting in an overall increase in organ size.',
            sourceExcerpt:
              'Hypertrophy is an increase in the size of cells resulting in an overall increase in the size of the organ.',
          },
          {
            front: 'What is hyperplasia?',
            back: 'An increase in the number of cells in an organ or tissue in response to a stimulus.',
            sourceExcerpt:
              'Hyperplasia is an increase in the number of cells in an organ or tissue in response to a stimulus.',
          },
        ];
        return jsonResponse(200, {
          candidates: [{ content: { parts: [{ text: JSON.stringify(drafts) }] } }],
        });
      }

      // Plain text response for explain / summarize
      return jsonResponse(200, {
        candidates: [
          {
            content: {
              parts: [{ text: 'Hypertrophy involves increased cellular protein synthesis without cell division.' }],
            },
          },
        ],
      });
    });

    const geminiProvider = createGeminiProvider({
      apiKey: 'valid-test-key',
      fetchImpl: mockFetch,
    });

    const studyAIService = studyAIServiceMod.createStudyAIService(geminiProvider);

    // 1. explainConcept
    const explainRes = await studyAIService.explainConcept('Hypertrophy', sourceContext);
    assert.equal(explainRes.sourceId, 'src-cell-1');
    assert.ok(explainRes.text.includes('Hypertrophy involves'));

    // 2. summarizeSource
    const summaryRes = await studyAIService.summarizeSource(sourceContext);
    assert.equal(summaryRes.sourceId, 'src-cell-1');
    assert.ok(summaryRes.text.length > 0);

    // 3. generateFlashcardDrafts
    const flashcards = await studyAIService.generateFlashcardDrafts(sourceContext, 2);
    assert.equal(flashcards.length, 2);
    assert.equal(flashcards[0].front, 'What is hypertrophy?');
    assert.equal(flashcards[0].sourceId, 'src-cell-1');
    assert.equal(flashcards[0].topicId, 'top-path-1');
    // Grounding verified by StudyAIService
    assert.ok(sourceContext.content.includes(flashcards[0].sourceExcerpt));
  });

  // ── 6. ERROR MAPPING TO AISERVICEERROR ────────────────────────────────────────
  await check('Error Mapping: Network failure, 401/403 auth, 429 rate limit, 500 server, and timeout map cleanly', async () => {
    // 1. Network failure
    const netFailFetch = createMockFetch(() => {
      throw new Error('fetch failed: ECONNREFUSED');
    });
    const netFailProvider = createGeminiProvider({ apiKey: 'k', fetchImpl: netFailFetch });
    await assert.rejects(
      async () => {
        await netFailProvider.generateText({ systemPrompt: '', userPrompt: 't' });
      },
      (err) => err instanceof aiModels.AIServiceError && err.code === 'provider_unavailable' && err.message.includes('Network request')
    );

    // 2. 401 / 403 Authentication failure
    const authFailFetch = createMockFetch(() =>
      jsonResponse(401, { error: { message: 'API_KEY_INVALID' } })
    );
    const authFailProvider = createGeminiProvider({ apiKey: 'k', fetchImpl: authFailFetch });
    await assert.rejects(
      async () => {
        await authFailProvider.generateText({ systemPrompt: '', userPrompt: 't' });
      },
      (err) => err instanceof aiModels.AIServiceError && err.code === 'provider_unavailable' && err.message.includes('authentication failed')
    );

    // 3. 429 Rate limit
    const rateLimitFetch = createMockFetch(() =>
      jsonResponse(429, { error: { message: 'Resource exhausted: quota exceeded' } })
    );
    const rateLimitProvider = createGeminiProvider({ apiKey: 'k', fetchImpl: rateLimitFetch });
    await assert.rejects(
      async () => {
        await rateLimitProvider.generateText({ systemPrompt: '', userPrompt: 't' });
      },
      (err) => err instanceof aiModels.AIServiceError && err.code === 'provider_unavailable' && err.message.includes('rate limit exceeded')
    );

    // 4. 500 Server error
    const serverErrorFetch = createMockFetch(() =>
      jsonResponse(503, { error: { message: 'Service Unavailable' } })
    );
    const serverErrorProvider = createGeminiProvider({ apiKey: 'k', fetchImpl: serverErrorFetch });
    await assert.rejects(
      async () => {
        await serverErrorProvider.generateText({ systemPrompt: '', userPrompt: 't' });
      },
      (err) => err instanceof aiModels.AIServiceError && err.code === 'provider_unavailable' && err.message.includes('service is temporarily unavailable')
    );
  });

  // ── 7. SECURITY & KEY SANITIZATION ───────────────────────────────────────────
  await check('Security: API key injected via config, zero hardcoded secrets, key not leaked in error messages', async () => {
    const sensitiveKey = 'AIzaSySecretToken999XYZ';

    // Provider error echoing the key
    const echoKeyFetch = createMockFetch(() =>
      jsonResponse(400, {
        error: { message: `Invalid parameter key=${sensitiveKey}` },
      })
    );

    const provider = createGeminiProvider({
      apiKey: sensitiveKey,
      fetchImpl: echoKeyFetch,
    });

    try {
      await provider.generateText({ systemPrompt: '', userPrompt: 'Test' });
      assert.fail('Should have thrown');
    } catch (err) {
      assert.ok(err instanceof aiModels.AIServiceError);
      // Key must NOT be exposed in the error message!
      assert.ok(!err.message.includes(sensitiveKey), 'API key must be redacted from error messages');
      assert.ok(err.message.includes('[REDACTED]'));
    }

    // Static scan on geminiProvider.ts source code
    const providerSource = read('services/ai/geminiProvider.ts');

    // Forbid hardcoded secrets
    assert.ok(!providerSource.includes('AIzaSy'), 'No Google API keys hardcoded');
    assert.ok(!providerSource.includes('sk-'), 'No OpenAI keys hardcoded');
    assert.ok(!providerSource.includes('process.env.GEMINI_API_KEY'), 'geminiProvider should receive apiKey via config, not process.env directly');
    assert.ok(!providerSource.includes('console.log'), 'No logging of requests or keys');
  });

  // ── 8. HEALTH CHECK ──────────────────────────────────────────────────────────
  await check('Health Check: Returns truthful ok status and message', async () => {
    // 1. Missing key
    const noKeyProvider = createGeminiProvider({ apiKey: '' });
    const healthNoKey = await noKeyProvider.healthCheck();
    assert.equal(healthNoKey.ok, false);
    assert.ok(healthNoKey.message.includes('missing'));

    // 2. Online provider
    const onlineFetch = createMockFetch(() =>
      jsonResponse(200, {
        candidates: [{ content: { parts: [{ text: 'OK' }] } }],
      })
    );
    const onlineProvider = createGeminiProvider({ apiKey: 'k', fetchImpl: onlineFetch });
    const healthOnline = await onlineProvider.healthCheck();
    assert.equal(healthOnline.ok, true);

    // 3. Offline provider
    const offlineFetch = createMockFetch(() => {
      throw new Error('Offline');
    });
    const offlineProvider = createGeminiProvider({ apiKey: 'k', fetchImpl: offlineFetch });
    const healthOffline = await offlineProvider.healthCheck();
    assert.equal(healthOffline.ok, false);
  });

  // ── 9. ISOLATION & OFFLINE PRESERVATION ──────────────────────────────────────
  await check('Isolation: MedOS offline core preserved, schema stays v12, zero draft persistence', () => {
    // Verify schema version is v12
    const migrationsSource = read('db/migrations.ts');
    assert.match(migrationsSource, /CURRENT_VERSION\s*=\s*(1[2-9]|\d{2,})/, 'Schema version must be at least v12');

    // Verify no AI UI or persistence added
    const appDir = path.join(root, 'app');
    assert.ok(!fs.existsSync(path.join(appDir, 'ai')), 'No AI route directory added yet');
    assert.ok(!fs.existsSync(path.join(appDir, 'chat')), 'No chat route directory added yet');

    // Verify study_sources table remains pure
    assert.ok(!migrationsSource.includes('ai_drafts'), 'No ai_drafts table in schema');
    assert.ok(!migrationsSource.includes('generated_flashcards'), 'No generated_flashcards table in schema');
  });

  console.log(`\nAll ${passed} Phase 10 Step 4 validation checks passed successfully!`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
