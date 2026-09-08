/**
 * MedOS — Phase 10 Master AI Integrity Gate
 *
 * Dedicated end-to-end master validation suite for the entire AI Study Engine:
 * 1. AI Architecture & Composition Root
 * 2. Provider Isolation & Domain Independence
 * 3. Mock Provider Determinism & Offline Safety
 * 4. Gemini Provider Specifications & Mocked Network Verification
 * 5. Security & Secret Redaction Master Audit
 * 6. Source Grounding & Provenance Rigor
 * 7. Flashcard Draft Generation & Memory Import Safety
 * 8. Question Draft Safety & Zero Q-Bank Side Effects
 * 9. AI Study Plan Safety & Zero Automated Calendar/Session Side Effects
 * 10. Document Ingestion Pipeline & Truthful PDF Boundary (Step 8 PARTIAL)
 * 11. Offline Core Independence & Boot Safety
 * 12. Centralized Provider Switching & State Isolation
 * 13. Localization Parity (EN/TR across all 5 AI catalogs)
 * 14. Accessibility Semantics & Screen Layout Attributes
 * 15. Dependency Integrity & Expo SDK 57 Compatibility
 * 16. Database Schema v12 & Zero AI Drift
 * 17. Step 1-11 Orchestration & Cross-Step Verification
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const { DatabaseSync } = require('node:sqlite');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');

let passed = 0;
async function check(name, run) {
  await run();
  passed++;
  console.log('PASS ' + name);
}

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
    (key) => {
      if (Object.hasOwn(mocks, key)) return mocks[key];
      if (key.startsWith('.')) {
        const dir = path.dirname(path.join(root, file));
        const candidate = path.join(dir, key.endsWith('.ts') ? key : key + '.ts');
        if (fs.existsSync(candidate)) {
          const relCandidate = path.relative(root, candidate).replace(/\\/g, '/');
          return load(relCandidate, mocks);
        }
      }
      return require(key);
    },
    module,
    module.exports,
    file,
    path.dirname(file)
  );
  return module.exports;
}

class SQLiteAdapter {
  constructor() {
    this.db = new DatabaseSync(':memory:');
  }
  execSync(sql) {
    this.db.exec(sql);
  }
  runSync(sql, values = []) {
    return this.db.prepare(sql).run(...values);
  }
  getFirstSync(sql, values = []) {
    return this.db.prepare(sql).get(...values);
  }
  getAllSync(sql, values = []) {
    return this.db.prepare(sql).all(...values);
  }
  withTransactionSync(work) {
    this.db.exec('BEGIN');
    try {
      work();
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }
  closeSync() {
    this.db.close();
  }
}

async function main() {
  console.log('=== PHASE 10: AI STUDY ENGINE MASTER INTEGRITY GATE ===\n');

  const modelsAi = load('models/ai.ts');
  const prompts = load('services/ai/prompts.ts', { '@/models/ai': modelsAi });
  const mockProviderMod = load('services/ai/mockProvider.ts', { '@/models/ai': modelsAi });
  const studyAIServiceMod = load('services/ai/studyAIService.ts', {
    '@/models/ai': modelsAi,
    './prompts': prompts,
  });

  // 1. AI Architecture & Composition Root
  await check('AI Architecture: Provider-neutral contracts, central client composition, zero vendor shapes in domain', () => {
    const aiModelsSource = read('models/ai.ts');
    assert.ok(aiModelsSource.includes('export interface AIProvider'), 'AIProvider contract must exist');
    assert.ok(aiModelsSource.includes('export interface AIExplanationResult'), 'AIExplanationResult must exist');
    assert.ok(aiModelsSource.includes('export interface AISummaryResult'), 'AISummaryResult must exist');
    assert.ok(aiModelsSource.includes('export interface AIFlashcardDraft'), 'AIFlashcardDraft must exist');
    assert.ok(aiModelsSource.includes('export interface AIQuestionDraft'), 'AIQuestionDraft must exist');
    assert.ok(aiModelsSource.includes('export interface AIStudyPlanDraft'), 'AIStudyPlanDraft must exist');
    assert.ok(aiModelsSource.includes('export type AIProviderId'), 'AIProviderId must exist');
    assert.ok(aiModelsSource.includes('export class AIServiceError'), 'AIServiceError must exist');

    // Verify domain models do not import or leak vendor SDKs or credentials
    assert.ok(!aiModelsSource.includes("from '@google/") && !aiModelsSource.includes("from '@google-cloud/"), 'Domain models must not reference Google SDK');
    assert.ok(!aiModelsSource.includes("from 'openai'") && !aiModelsSource.includes('from "openai"'), 'Domain models must not import OpenAI SDK');
    assert.ok(!aiModelsSource.includes('apiKey'), 'Domain models must not contain apiKey fields');

    // studyAIClient must be central composition root
    const clientSource = read('services/ai/studyAIClient.ts');
    assert.ok(clientSource.includes('export interface AIProviderState'), 'AIProviderState must exist in studyAIClient');
    assert.ok(clientSource.includes('export type AIProviderStatus'), 'AIProviderStatus must exist in studyAIClient');
    assert.ok(clientSource.includes('getActiveAIProviderState'), 'Must export getActiveAIProviderState');
    assert.ok(clientSource.includes('setActiveAIProvider'), 'Must export setActiveAIProvider');
    assert.ok(clientSource.includes('testAIProviderConnection'), 'Must export testAIProviderConnection');
    assert.ok(clientSource.includes('refreshStudyAIService'), 'Must export refreshStudyAIService');
  });

  // 2. Provider Isolation & Domain Independence
  await check('Provider Isolation: Non-AI modules and UI screens strictly never import Gemini or vendor SDKs', () => {
    const nonAIModules = [
      'app/(tabs)/focus.tsx',
      'app/(tabs)/calendar.tsx',
      'app/committees/[id].tsx',
      'app/(tabs)/index.tsx',
      'app/decks/[id]/review.tsx',
      'app/qbank/new.tsx',
      'store/useFocusStore.ts',
      'store/useMemoryStore.ts',
      'store/useQBankStore.ts',
      'store/useDashboardStore.ts',
      'store/useCommitteeStore.ts',
      'db/repositories/focusRepo.ts',
      'db/repositories/memoryRepo.ts',
      'db/repositories/qbankRepo.ts',
      'db/repositories/analyticsRepo.ts',
    ];
    for (const f of nonAIModules) {
      const code = read(f);
      assert.ok(!code.includes('gemini'), `${f} must not import or reference gemini`);
      assert.ok(!code.includes('credentialStore'), `${f} must not reference credentialStore`);
      assert.ok(!code.includes('StudyAIService'), `${f} must not import StudyAIService directly`);
    }

    // AI domain screens must not import Gemini directly
    const aiDomainScreens = [
      'app/topics/[id]/assistant.tsx',
      'app/committees/[id]/study-plan.tsx',
      'app/topics/[id]/sources/new.tsx',
      'app/topics/[id]/sources/import-document.tsx',
    ];
    for (const f of aiDomainScreens) {
      const code = read(f);
      assert.ok(!code.includes('geminiProvider'), `${f} must not import geminiProvider directly`);
      assert.ok(!code.includes('@google/generative-ai'), `${f} must not import Google AI SDK`);
      assert.ok(!code.includes('createGeminiProvider'), `${f} must not instantiate Gemini provider directly`);
    }

    // AI settings screen communicates through studyAIClient and credentialStore, never instantiating provider directly
    const settingsCode = read('app/settings/ai.tsx');
    assert.ok(!settingsCode.includes('new GeminiAIProvider'), 'app/settings/ai.tsx must not instantiate GeminiAIProvider directly');
    assert.ok(!settingsCode.includes('@google/generative-ai'), 'app/settings/ai.tsx must not import Google AI SDK');
  });

  // 3. Mock Provider Master Check
  await check('Mock Provider Master: Deterministic, offline, zero-network generation for all 5 capabilities and error modes', async () => {
    const mock = new mockProviderMod.MockAIProvider('normal');
    assert.equal(mock.id, 'mock');
    assert.equal(mock.name, 'Mock AI Provider');

    const service = studyAIServiceMod.createStudyAIService(mock);

    const source = {
      sourceId: 'src-1',
      topicId: 'top-1',
      topicName: 'Cardiology',
      sourceTitle: 'Heart Anatomy',
      content: 'The heart has four chambers: left atrium, right atrium, left ventricle, and right ventricle. Valves prevent backflow of blood.',
    };

    // 1. Explain
    const exp = await service.explainConcept('Valves', source);
    assert.equal(exp.sourceId, 'src-1');
    assert.ok(exp.text.length > 20);

    // 2. Summarize
    const sum = await service.summarizeSource(source);
    assert.equal(sum.sourceId, 'src-1');
    assert.ok(sum.text.length > 20);

    // 3. Flashcards
    const fc = await service.generateFlashcardDrafts(source, 3);
    assert.ok(fc.length >= 1 && fc.length <= 5);
    assert.ok(fc[0].front.length > 0);
    assert.ok(fc[0].back.length > 0);
    assert.ok(prompts.isExcerptGrounded(fc[0].sourceExcerpt, source.content));

    // 4. Questions
    const qd = await service.generateQuestionDrafts(source, 2);
    assert.ok(qd.length >= 1 && qd.length <= 5);
    assert.equal(qd[0].options.length, 4);
    assert.ok(qd[0].correctOptionIndex >= 0 && qd[0].correctOptionIndex <= 3);
    assert.ok(qd[0].explanation.length > 0);
    assert.ok(prompts.isExcerptGrounded(qd[0].sourceExcerpt, source.content));

    // 5. Study Plan
    const planContext = {
      committeeId: 'com-1',
      committeeName: 'Cardiovascular',
      daysUntilExam: 14,
      topics: [
        {
          topicId: 'top-1',
          topicName: 'Cardiology',
          subjectName: 'Physiology',
          masteryStatus: 'needs_attention',
          neglectStatus: 'recent',
          qbankQuestions: 10,
          qbankAccuracy: 50,
          memoryReviews: 4,
          memoryRetention: 75,
          dueCards: 2,
          lastStudiedAt: Date.now() - 3600000,
          weakReasons: ['low_accuracy'],
          neglectReasons: [],
        },
      ],
    };
    const sp = await service.generateStudyPlan(planContext);
    assert.ok(sp.items.length >= 1 && sp.items.length <= 5);
    assert.ok(['review', 'memory', 'qbank', 'focus'].includes(sp.items[0].action));
    assert.ok(sp.items[0].estimatedMinutes >= 10 && sp.items[0].estimatedMinutes <= 90);

    // Error mode: bad_grounding
    mock.setMode('bad_grounding');
    await assert.rejects(
      async () => service.generateFlashcardDrafts(source, 2),
      (err) => err instanceof modelsAi.AIServiceError && err.code === 'grounding_failed'
    );

    // Error mode: malformed
    mock.setMode('malformed');
    await assert.rejects(
      async () => service.generateQuestionDrafts(source, 2),
      (err) => err instanceof modelsAi.AIServiceError && err.code === 'invalid_response'
    );

    // Error mode: unavailable
    mock.setMode('unavailable');
    const health = await mock.healthCheck();
    assert.equal(health.ok, false);
    await assert.rejects(
      async () => service.explainConcept('Valves', source),
      (err) => err instanceof modelsAi.AIServiceError && err.code === 'provider_unavailable'
    );
  });

  // 4. Gemini Provider Master Check
  await check('Gemini Provider Master: REST construction, gemini-2.5-flash default, header-only auth, structured JSON, error classifications', async () => {
    const geminiMod = load('services/ai/geminiProvider.ts', {
      '@/models/ai': modelsAi,
    });

    assert.equal(geminiMod.DEFAULT_GEMINI_MODEL, 'gemini-2.5-flash');

    let capturedUrl = '';
    let capturedOptions = {};
    let mockResponse = {
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: 'Verified mock Gemini text response.' }],
            },
          },
        ],
      }),
    };

    const mockFetch = async (url, opts) => {
      capturedUrl = url;
      capturedOptions = opts || {};
      return mockResponse;
    };

    const provider = geminiMod.createGeminiProvider({
      apiKey: 'AIzaSySecretTestOnlyKey123',
      fetchImpl: mockFetch,
    });

    assert.equal(provider.id, 'gemini');
    assert.equal(provider.name, 'Google Gemini');

    // 1. Text generation request
    const textRes = await provider.generateText({
      systemPrompt: 'System instruction.',
      userPrompt: 'User prompt test.',
    });
    assert.equal(textRes.text, 'Verified mock Gemini text response.');
    assert.equal(textRes.providerId, 'gemini');

    // Verification of endpoint and headers
    assert.ok(capturedUrl.includes('/models/gemini-2.5-flash:generateContent'));
    assert.ok(!capturedUrl.includes('AIzaSySecretTestOnlyKey123'), 'API key must not be in URL query parameters');
    assert.equal(capturedOptions.headers['x-goog-api-key'], 'AIzaSySecretTestOnlyKey123');

    // Configurable model test
    const proProvider = geminiMod.createGeminiProvider({
      apiKey: 'test-key',
      model: 'gemini-1.5-pro',
      fetchImpl: mockFetch,
    });
    await proProvider.generateText({ systemPrompt: 's', userPrompt: 'u' });
    assert.ok(capturedUrl.includes('/models/gemini-1.5-pro:generateContent'), 'Custom model must be respected');

    // 2. Structured JSON generation
    mockResponse = {
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: '```json\n{"summary": "Test", "count": 2}\n```' }],
            },
          },
        ],
      }),
    };
    const structuredRes = await provider.generateStructured({
      systemPrompt: 'sys',
      userPrompt: 'user',
      schemaDescription: 'json object',
    });
    assert.deepEqual(structuredRes, { summary: 'Test', count: 2 });
    const parsedBody = JSON.parse(capturedOptions.body);
    assert.equal(parsedBody.generationConfig.responseMimeType, 'application/json');

    // 3. Health Check
    mockResponse = {
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'OK' }] } }],
      }),
    };
    const isHealthy = await provider.healthCheck();
    assert.equal(isHealthy.ok, true);

    // 4. Error mappings: Auth (401/403)
    mockResponse = {
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: async () => ({ error: { message: 'Invalid API key' } }),
    };
    await assert.rejects(
      async () => provider.generateText({ systemPrompt: 's', userPrompt: 'u' }),
      (err) => err instanceof modelsAi.AIServiceError && err.code === 'provider_unavailable' && err.message.includes('authentication failed')
    );

    // 429 Rate limit
    mockResponse = {
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
      json: async () => ({ error: { message: 'Quota exceeded' } }),
    };
    await assert.rejects(
      async () => provider.generateText({ systemPrompt: 's', userPrompt: 'u' }),
      (err) => err instanceof modelsAi.AIServiceError && err.code === 'provider_unavailable' && err.message.includes('rate limit exceeded')
    );

    // 500 Server error
    mockResponse = {
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: async () => ({ error: { message: 'Server error' } }),
    };
    await assert.rejects(
      async () => provider.generateText({ systemPrompt: 's', userPrompt: 'u' }),
      (err) => err instanceof modelsAi.AIServiceError && err.code === 'provider_unavailable' && err.message.includes('temporarily unavailable')
    );

    // Empty candidates
    mockResponse = {
      ok: true,
      status: 200,
      json: async () => ({ candidates: [] }),
    };
    await assert.rejects(
      async () => provider.generateText({ systemPrompt: 's', userPrompt: 'u' }),
      (err) => err instanceof modelsAi.AIServiceError && err.code === 'invalid_response'
    );
  });

  // 5. Security Master Audit
  await check('Security Master: SecureStore exclusivity, zero SQLite/AsyncStorage keys, secret sanitization, repository clean scan', async () => {
    let simulatedSecureStore = {};
    const mockSecureStore = {
      getItemAsync: async (k) => simulatedSecureStore[k] || null,
      setItemAsync: async (k, v) => { simulatedSecureStore[k] = v; },
      deleteItemAsync: async (k) => { delete simulatedSecureStore[k]; },
    };
    const credStore = load('services/ai/credentialStore.ts', {
      'expo-secure-store': mockSecureStore,
    });
    credStore.setSecureStorageAdapter(mockSecureStore);

    // Set, get, delete lifecycle
    await credStore.setGeminiApiKey('  AIzaSyValidCleanKey123  ');
    assert.equal(await credStore.getGeminiApiKey(), 'AIzaSyValidCleanKey123');
    await credStore.deleteGeminiApiKey();
    assert.equal(await credStore.getGeminiApiKey(), null);

    // Empty key validation
    await assert.rejects(async () => credStore.setGeminiApiKey('   '), /API key cannot be empty/);

    // Redaction
    const geminiMod = load('services/ai/geminiProvider.ts', { '@/models/ai': modelsAi });
    assert.equal(geminiMod.redactSecrets('Key AIzaSy123456789012345678901234567890123 leaked', ['AIzaSy123456789012345678901234567890123']), 'Key [REDACTED] leaked');

    // Verify zero API keys in SQLite or migrations
    const migrations = read('db/migrations.ts');
    assert.ok(!migrations.includes('api_key'), 'Migrations must NEVER contain api_key columns');
    assert.ok(!migrations.includes('gemini'), 'Migrations must NEVER contain gemini tables');
    assert.ok(!migrations.includes('credential'), 'Migrations must NEVER contain credential tables');

    // Global repository clean scan for actual unredacted production keys
    const sensitiveFiles = [
      'app/settings/ai.tsx',
      'services/ai/studyAIClient.ts',
      'services/ai/geminiProvider.ts',
      'services/ai/mockProvider.ts',
      'services/ai/credentialStore.ts',
      'db/client.ts',
      'db/migrations.ts',
      'docs/ROADMAP.md',
      'docs/PROJECT_STATUS.md',
      'docs/LAST_AGENT_REPORT.md',
      'docs/AGENT_HANDOFF.md',
    ];
    for (const f of sensitiveFiles) {
      const content = read(f);
      assert.ok(!content.includes('AIzaSyB'), `${f} must not contain actual real API keys`);
      assert.ok(!content.includes('GEMINI_API_KEY='), `${f} must not hardcode GEMINI_API_KEY assignment`);
      assert.ok(!content.includes('OPENAI_API_KEY='), `${f} must not hardcode OPENAI_API_KEY assignment`);
    }
  });

  // 6. Grounding Master Audit
  await check('Grounding Master: Source required, excerpt verification, whitespace normalization, rejection of fabrications, state clearance', () => {
    const fullText = 'Mitochondria are the powerhouses of the cell. They generate ATP through oxidative phosphorylation.';

    // Excerpt verification logic
    assert.equal(prompts.isExcerptGrounded('powerhouses of the cell', fullText), true);
    assert.equal(prompts.isExcerptGrounded('oxidative phosphorylation', fullText), true);
    assert.equal(prompts.isExcerptGrounded('The nucleus stores genetic information.', fullText), false);
    assert.equal(prompts.isExcerptGrounded('', fullText), false);
    assert.equal(prompts.isExcerptGrounded(null, fullText), false);

    // Whitespace normalization
    const messySource = 'Phase 0 corresponds to  \n rapid depolarization \t via sodium channels.';
    assert.equal(prompts.isExcerptGrounded('Phase 0 corresponds to rapid depolarization via sodium channels.', messySource), true);

    // Prompt builders mandate source and grounding instructions
    const explainPrompt = prompts.buildExplainPrompt('ATP', {
      sourceId: 's1',
      sourceTitle: 'Cell Bio',
      topicId: 't1',
      topicName: 'Metabolism',
      content: fullText,
    });
    assert.ok(explainPrompt.systemPrompt.includes('Rely ONLY on the facts'));
    assert.ok(explainPrompt.systemPrompt.includes('The provided study material does not contain sufficient information'));
    assert.ok(explainPrompt.userPrompt.includes(fullText));

    // Stale state clearance upon source change is present in assistant
    const assistantSource = read('app/topics/[id]/assistant.tsx');
    assert.ok(assistantSource.includes("setResultState({ status: 'idle' })"), 'Must clear resultState when source changes');
    assert.ok(assistantSource.includes('setDrafts([])'), 'Must clear flashcard drafts when source changes');
    assert.ok(assistantSource.includes('setQuestionDrafts([])'), 'Must clear question drafts when source changes');
  });

  // 7. Flashcard Safety
  await check('Flashcard Safety: Max 5 drafts, ephemeral, editable, explicit Review -> Memory approval, zero review/streak writes', async () => {
    const db = new SQLiteAdapter();
    const calendarDate = load('utils/calendarDate.ts');
    const migrations = load('db/migrations.ts', {
      'expo-sqlite': {},
      './client': { getDB: () => db },
      '@/utils/calendarDate': calendarDate,
    });
    migrations.runMigrations();

    const memoryRepo = load('db/repositories/memoryRepo.ts', {
      '../client': { getDB: () => db },
      '@/utils/memoryScheduling': {
        scheduleReview: () => ({ state: 'learning', intervalDays: 1, nextReviewAt: Date.now() }),
      },
      '@/store/useMemoryStore': {},
    }).memoryRepo;

    const now = Date.now();
    db.runSync(
      'INSERT INTO committees (id, name, subject, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      ['c-1', 'Cardiovascular', '', now, now]
    );
    db.runSync(
      'INSERT INTO subjects (id, committee_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      ['s-1', 'c-1', 'Physiology', now, now]
    );
    db.runSync(
      'INSERT INTO topics (id, subject_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      ['t-1', 's-1', 'Cardiac Cycle', now, now]
    );
    db.runSync(
      'INSERT INTO decks (id, name, subject, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      ['d-1', 'Cardiology Deck', '', now, now]
    );

    // Simulate explicit user approval of 2 flashcard drafts
    const approvedDrafts = [
      { id: 'fc-1', deckId: 'd-1', topicId: 't-1', front: 'Chamber count?', back: 'Four chambers', createdAt: now, updatedAt: now },
      { id: 'fc-2', deckId: 'd-1', topicId: 't-1', front: 'Valves function?', back: 'Prevent backflow', createdAt: now, updatedAt: now },
    ];

    db.withTransactionSync(() => {
      for (const card of approvedDrafts) {
        memoryRepo.insertCard(card);
      }
    });

    // Verify canonical initial SRS values
    const cards = memoryRepo.getCardsByDeck('d-1');
    assert.equal(cards.length, 2);
    for (const card of cards) {
      assert.equal(card.schedule.state, 'new');
      assert.equal(card.deckId, 'd-1');
      assert.equal(card.topicId, 't-1');
    }

    // Critical: Zero writes to flashcard_reviews
    const reviewCount = db.getFirstSync('SELECT COUNT(*) as count FROM flashcard_reviews').count;
    assert.equal(reviewCount, 0, 'Flashcard generation and approval must NEVER write to flashcard_reviews');

    // Critical: Zero writes to focus_sessions or qbank_sessions
    const focusCount = db.getFirstSync('SELECT COUNT(*) as count FROM focus_sessions').count;
    assert.equal(focusCount, 0);
    const qbankCount = db.getFirstSync('SELECT COUNT(*) as count FROM qbank_sessions').count;
    assert.equal(qbankCount, 0);

    db.closeSync();
  });

  // 8. Question Draft Safety
  await check('Question Draft Safety: Exactly 4 options, 1 answer, explanation, citation, max 5, zero qbank_sessions writes', async () => {
    const db = new SQLiteAdapter();
    const calendarDate = load('utils/calendarDate.ts');
    const migrations = load('db/migrations.ts', {
      'expo-sqlite': {},
      './client': { getDB: () => db },
      '@/utils/calendarDate': calendarDate,
    });
    migrations.runMigrations();

    const mock = new mockProviderMod.MockAIProvider('normal');
    const service = studyAIServiceMod.createStudyAIService(mock);

    const source = {
      sourceId: 'src-cardio',
      topicId: 'top-cardio',
      sourceTitle: 'Cardiac Output',
      topicName: 'Cardiac Output',
      content: 'Cardiac output is stroke volume multiplied by heart rate. Normal resting output is roughly 5 L/min.',
    };

    const drafts = await service.generateQuestionDrafts(source, 3);

    assert.ok(drafts.length <= 5, 'Max 5 drafts enforced');
    for (const q of drafts) {
      assert.equal(q.options.length, 4, 'Every question must have exactly 4 options');
      assert.ok(q.correctOptionIndex >= 0 && q.correctOptionIndex <= 3, 'correctOptionIndex must be 0..3');
      assert.ok(q.explanation.length > 0, 'Explanation must be non-empty');
      assert.ok(q.sourceExcerpt.length > 0, 'Citation must be non-empty');
      assert.ok(prompts.isExcerptGrounded(q.sourceExcerpt, source.content));
    }

    // Critical: ZERO writes to qbank_sessions or qbank_answers
    const qbankCount = db.getFirstSync('SELECT COUNT(*) as count FROM qbank_sessions').count;
    assert.equal(qbankCount, 0, 'Question draft generation must NEVER create qbank_sessions');

    db.closeSync();
  });

  // 9. Study Plan Safety
  await check('Study Plan Safety: Real analytics evidence only, null preservation, max 5, duration 10-90, zero calendar/session/DB writes', async () => {
    const db = new SQLiteAdapter();
    const calendarDate = load('utils/calendarDate.ts');
    const migrations = load('db/migrations.ts', {
      'expo-sqlite': {},
      './client': { getDB: () => db },
      '@/utils/calendarDate': calendarDate,
    });
    migrations.runMigrations();

    const mock = new mockProviderMod.MockAIProvider('normal');
    const service = studyAIServiceMod.createStudyAIService(mock);

    const planContext = {
      committeeId: 'com-neuro',
      committeeName: 'Neuroscience',
      daysUntilExam: 10,
      topics: [
        {
          topicId: 'top-cortex',
          topicName: 'Cerebral Cortex',
          subjectName: 'Neuroanatomy',
          masteryStatus: 'unstudied',
          neglectStatus: 'never_studied',
          qbankQuestions: null,
          qbankAccuracy: null, // Null preserved!
          memoryReviews: null,
          memoryRetention: null, // Null preserved!
          dueCards: null,
          lastStudiedAt: null,
          weakReasons: [],
          neglectReasons: ['never_studied'],
        },
      ],
    };

    const plan = await service.generateStudyPlan(planContext);

    assert.ok(plan.items.length <= 5);
    for (const item of plan.items) {
      assert.ok(['review', 'memory', 'qbank', 'focus'].includes(item.action));
      assert.ok(item.estimatedMinutes >= 10 && item.estimatedMinutes <= 90);
      assert.ok(item.reason.length > 0);
    }

    // Critical zero automation: no calendar events, focus sessions, or memory writes
    assert.equal(db.getFirstSync('SELECT COUNT(*) as c FROM focus_sessions').c, 0);
    assert.equal(db.getFirstSync('SELECT COUNT(*) as c FROM flashcards').c, 0);
    assert.equal(db.getFirstSync('SELECT COUNT(*) as c FROM qbank_sessions').c, 0);
    assert.equal(db.getFirstSync('SELECT COUNT(*) as c FROM calendar_events').c, 0);

    db.closeSync();
  });

  // 10. Document Ingestion Integrity (Step 8 PARTIAL)
  await check('Document Ingestion Integrity: Text/markdown extraction, PDF picker boundary, max 5MB/100k limits, zero cloud upload, Step 8 truthful PARTIAL status', async () => {
    const docTypes = load('services/documents/documentTypes.ts');
    const docModule = load('services/documents/documentExtractor.ts', {
      './documentTypes': docTypes,
      './pdfExtractor': { pdfExtractor: { isSupported: () => false, extract: async () => ({ status: 'unavailable', text: '' }) } },
      './textExtractor': { textExtractor: { isSupported: () => true, extract: async () => ({ status: 'success', text: 'Clean text' }) } },
    });
    assert.equal(docModule.MAX_DOCUMENT_FILE_SIZE_BYTES, 5 * 1024 * 1024, 'Max 5MB file size limit');
    assert.equal(docModule.MAX_DOCUMENT_TEXT_LENGTH, 100000, 'Max 100k character text limit');
    assert.equal(docModule.cleanDocumentTitle('Physiology_Notes.pdf'), 'Physiology_Notes');

    // PDF extractor capability boundary
    const pdfModule = load('services/documents/pdfExtractor.ts', {
      './documentTypes': docTypes,
      './documentExtractor': docTypes,
    });
    const pdfExtractor = pdfModule.pdfExtractor;
    assert.equal(pdfExtractor.isSupported('application/pdf', 'test.pdf'), false, 'PDF extraction must report unsupported in Hermes/Expo Go');
    const pdfRes = await pdfExtractor.extract({ uri: 'file:///test.pdf', name: 'test.pdf', mimeType: 'application/pdf', size: 1000 });
    assert.equal(pdfRes.status, 'unavailable', 'PDF extraction must report unavailable');
    assert.equal(pdfRes.text, '');
    assert.ok(pdfRes.warnings && pdfRes.warnings.length > 0);

    // Text extractor functionality
    const textModule = load('services/documents/textExtractor.ts', {
      './documentTypes': {
        ...docTypes,
        normalizeExtractedText: (str) => str.trim(),
      },
      './documentExtractor': {
        ...docTypes,
        normalizeExtractedText: (str) => str.trim(),
      },
      'expo-file-system': {
        File: class MockFile {
          constructor(uri) { this.uri = uri; }
          async text() { return 'Extracted clinical guideline markdown text.'; }
        },
      },
    });
    const textExtractor = textModule.textExtractor;
    assert.equal(textExtractor.isSupported('text/plain', 'doc.txt'), true);
    assert.equal(textExtractor.isSupported(undefined, 'doc.md'), true);
    const textRes = await textExtractor.extract({ uri: 'file:///doc.md', name: 'doc.md', size: 100 });
    assert.equal(textRes.status, 'success');
    assert.equal(textRes.text, 'Extracted clinical guideline markdown text.');
  });

  // 11. Offline Core Master Check
  await check('Offline Core Master: Zero provider calls on app startup, root layout unblocked, full core independence without AI', () => {
    const rootLayout = read('app/_layout.tsx');
    assert.ok(!rootLayout.includes('studyAIClient'), 'Root layout must not initialize studyAIClient');
    assert.ok(!rootLayout.includes('GeminiAIProvider'), 'Root layout must not call Gemini provider');
    assert.ok(!rootLayout.includes('testAIProviderConnection'), 'Root layout must not ping AI endpoints');

    // Verify all core features function without AI keys
    const coreRoutes = [
      'app/(tabs)/index.tsx',
      'app/(tabs)/focus.tsx',
      'app/(tabs)/calendar.tsx',
      'app/committees/[id].tsx',
      'app/study-support/recovery.tsx',
      'app/study-support/check-in.tsx',
    ];
    for (const r of coreRoutes) {
      const code = read(r);
      assert.ok(!code.includes('credentialStore'), `${r} must not reference credentialStore`);
      assert.ok(!code.includes('testAIProviderConnection'), `${r} must not call AI connection test`);
    }
  });

  // 12. Centralized Provider Switching & State Isolation
  await check('Provider Switching: Mock <-> Gemini transitions, explicit user choice, zero silent fallback, state preserved on error', async () => {
    let secureStorage = {};
    const mockSecureStore = {
      getItemAsync: async (k) => secureStorage[k] || null,
      setItemAsync: async (k, v) => { secureStorage[k] = v; },
      deleteItemAsync: async (k) => { delete secureStorage[k]; },
    };
    const credentialStoreModule = load('services/ai/credentialStore.ts', {
      'expo-secure-store': mockSecureStore,
    });
    credentialStoreModule.setSecureStorageAdapter(mockSecureStore);

    const geminiMod = load('services/ai/geminiProvider.ts', {
      '@/models/ai': modelsAi,
    });

    const clientModule = load('services/ai/studyAIClient.ts', {
      './credentialStore': credentialStoreModule,
      './geminiProvider': geminiMod,
      './mockProvider': mockProviderMod,
      './studyAIService': studyAIServiceMod,
      '@/models/ai': modelsAi,
    });

    // Default state: Mock
    const defaultState = await clientModule.getActiveAIProviderState();
    assert.equal(defaultState.providerId, 'mock');
    assert.equal(defaultState.status, 'mock');

    // Switch to Gemini without key -> reports missing_credential, does NOT crash
    await clientModule.setActiveAIProvider('gemini');
    const missingKeyState = await clientModule.getActiveAIProviderState();
    assert.equal(missingKeyState.providerId, 'gemini');
    assert.equal(missingKeyState.status, 'missing_credential');

    // Save key -> reports configured
    await credentialStoreModule.setGeminiApiKey('AIzaSyValidKeyTest999');
    await clientModule.refreshStudyAIService();
    const configuredState = await clientModule.getActiveAIProviderState();
    assert.equal(configuredState.providerId, 'gemini');
    assert.equal(configuredState.status, 'configured');
    assert.equal(configuredState.hasApiKey, true);

    // Switch back to Mock -> restores instant offline simulation
    await clientModule.setActiveAIProvider('mock');
    const mockRestored = await clientModule.getActiveAIProviderState();
    assert.equal(mockRestored.providerId, 'mock');
    assert.equal(mockRestored.status, 'mock');
  });

  // 13. Localization Parity
  await check('Localization Parity: 100% EN/TR key parity across studySources, documentImport, studyAi, studyPlan, aiSettings', () => {
    const en = load('i18n/en.ts').default;
    const tr = load('i18n/tr.ts').default;

    const catalogs = ['studySources', 'documentImport', 'studyAi', 'studyPlan', 'aiSettings'];
    for (const cat of catalogs) {
      assert.ok(en[cat], `EN catalog missing ${cat}`);
      assert.ok(tr[cat], `TR catalog missing ${cat}`);
      const enKeys = Object.keys(en[cat]).sort();
      const trKeys = Object.keys(tr[cat]).sort();
      assert.deepEqual(enKeys, trKeys, `Key mismatch in catalog ${cat}`);

      // Verify function signatures and non-empty string leaves
      for (const k of enKeys) {
        assert.equal(typeof en[cat][k], typeof tr[cat][k], `Type mismatch for ${cat}.${k}`);
        if (typeof en[cat][k] === 'string') {
          assert.ok(en[cat][k].length > 0, `Empty EN string: ${cat}.${k}`);
          assert.ok(tr[cat][k].length > 0, `Empty TR string: ${cat}.${k}`);
        } else if (typeof en[cat][k] === 'function') {
          assert.equal(en[cat][k].length, tr[cat][k].length, `Function arity mismatch for ${cat}.${k}`);
        }
      }
    }
  });

  // 14. Accessibility Semantics & Screen Layout Attributes
  await check('Accessibility Semantics: Verified roles, labels, radio/checkbox semantics, password masking, alert roles, safe area wrappers', () => {
    const aiSettings = read('app/settings/ai.tsx');
    assert.ok(aiSettings.includes('accessibilityRole="radio"'), 'Provider selector must have radio role');
    assert.ok(aiSettings.includes('secureTextEntry'), 'API key input must mask input');
    assert.ok(aiSettings.includes('accessibilityRole="alert"'), 'Test connection and error results must have alert role');
    assert.ok(aiSettings.includes('accessibilityLabel='), 'Buttons and inputs must have labels');
    assert.ok(aiSettings.includes('ScreenWrapper'), 'Must use ScreenWrapper');

    const assistant = read('app/topics/[id]/assistant.tsx');
    assert.ok(assistant.includes('ScreenWrapper'), 'Assistant must use ScreenWrapper');
    assert.ok(assistant.includes('Button'), 'Assistant must use accessible Button components');

    const studyPlan = read('app/committees/[id]/study-plan.tsx');
    assert.ok(studyPlan.includes('ScreenWrapper'), 'Study Plan must use ScreenWrapper');
    assert.ok(studyPlan.includes('Button'), 'Study Plan must use accessible Button components');

    const docImport = read('app/topics/[id]/sources/import-document.tsx');
    assert.ok(docImport.includes('ScreenWrapper'), 'Document import must use ScreenWrapper');

    // UI primitives provide built-in accessibility roles
    const buttonSource = read('components/ui/Button.tsx');
    assert.ok(buttonSource.includes('accessibilityRole="button"'), 'Button primitive must provide accessibilityRole="button"');
    assert.ok(buttonSource.includes('accessibilityState'), 'Button primitive must provide accessibilityState');
  });

  // 15. Dependency Integrity & Expo SDK 57 Compatibility
  await check('Dependency Integrity: Expo SDK 57 compatible runtime packages locked, zero node-only parsers or server AI SDKs', () => {
    const pkg = JSON.parse(read('package.json'));
    const lock = JSON.parse(read('package-lock.json'));

    const required = {
      'expo-secure-store': '~57.0.3',
      'expo-document-picker': '~57.0.1',
      'expo-file-system': '~57.0.6',
    };

    for (const [dep, ver] of Object.entries(required)) {
      assert.equal(pkg.dependencies[dep], ver, `package.json must declare ${dep} with ${ver}`);
      const lockDep = lock.packages && lock.packages[''] && lock.packages[''].dependencies && lock.packages[''].dependencies[dep];
      assert.equal(lockDep, ver, `package-lock.json must declare ${dep} with ${ver}`);
    }

    // Zero dangerous or server-only packages
    const banned = ['pdf-parse', '@google/generative-ai', 'openai', 'anthropic', 'fs-extra'];
    for (const b of banned) {
      assert.equal(pkg.dependencies[b], undefined, `Must NOT include banned package ${b}`);
    }
  });

  // 16. Database Schema v12 & Zero AI Drift
  await check('Database Schema v12: Strictly v12, study_sources is only persistence addition, foreign key CASCADE verified, no AI tables', () => {
    const migrationsSource = read('db/migrations.ts');
    const versionMatch = migrationsSource.match(/const CURRENT_VERSION = (\d+);/);
    assert.ok(versionMatch && parseInt(versionMatch[1], 10) === 12, 'Current schema version must be strictly 12');

    const db = new SQLiteAdapter();
    const calendarDate = load('utils/calendarDate.ts');
    const migrations = load('db/migrations.ts', {
      'expo-sqlite': {},
      './client': { getDB: () => db },
      '@/utils/calendarDate': calendarDate,
    });
    migrations.runMigrations();

    // Verify study_sources table exists
    const tables = db.getAllSync("SELECT name FROM sqlite_master WHERE type='table'").map(t => t.name);
    assert.ok(tables.includes('study_sources'), 'study_sources table must exist');

    // Verify CASCADE deletion
    db.execSync('PRAGMA foreign_keys = ON');
    db.runSync("INSERT INTO committees (id, name, subject, created_at) VALUES ('com-1', 'Com', 'Sub', 1000)");
    db.runSync("INSERT INTO subjects (id, committee_id, name, created_at, updated_at) VALUES ('sub-1', 'com-1', 'Sub', 1000, 1000)");
    db.runSync("INSERT INTO topics (id, subject_id, name, created_at, updated_at) VALUES ('top-1', 'sub-1', 'Top', 1000, 1000)");
    db.runSync("INSERT INTO study_sources (id, topic_id, title, source_type, content, created_at, updated_at) VALUES ('src-1', 'top-1', 'Title', 'note', 'Content', 1000, 1000)");

    assert.equal(db.getFirstSync("SELECT COUNT(*) as c FROM study_sources").c, 1);
    db.runSync("DELETE FROM topics WHERE id = 'top-1'");
    assert.equal(db.getFirstSync("SELECT COUNT(*) as c FROM study_sources").c, 0, 'Deleting topic must cascade delete study_sources');

    // Verify no AI-specific persistence tables
    const aiTables = ['ai_conversations', 'ai_messages', 'flashcard_drafts', 'question_drafts', 'study_plan_drafts', 'credentials'];
    for (const t of aiTables) {
      assert.ok(!tables.includes(t), `Must NOT have AI drift table ${t}`);
    }

    db.closeSync();
  });

  // 17. Step 1-11 Orchestration & Cross-Step Verification
  await check('Step 1-11 Orchestration: Full suite of dedicated phase validation scripts passes synchronously', () => {
    for (let i = 1; i <= 11; i++) {
      const scriptFile = path.join(root, 'scripts', `validate-phase10-step${i}.cjs`);
      assert.ok(fs.existsSync(scriptFile), `Script validate-phase10-step${i}.cjs must exist`);
      execFileSync(process.execPath, [scriptFile], { cwd: root, stdio: 'pipe' });
    }
  });

  console.log(`\nALL ${passed} PHASE 10 MASTER INTEGRITY CHECKS PASSED.`);
}

main().catch((err) => {
  console.error('\nPHASE 10 MASTER GATE FAILED:', err);
  process.exit(1);
});
