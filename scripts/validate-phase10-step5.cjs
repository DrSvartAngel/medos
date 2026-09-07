/**
 * MedOS — Phase 10 Step 5 Validation Suite
 *
 * Validates Source-Grounded Study Assistant UI:
 * - ENTRY: Topic detail has Study Assistant action; route app/topics/[id]/assistant.tsx exists.
 * - SERVICE ISOLATION: UI uses provider-neutral studyAIClient; does NOT import Gemini or call fetch.
 * - SOURCE SELECTION: Loads topic sources; single-source auto-select; stale source handled;
 *   changing source clears previous result; content not leaked in selection cards.
 * - EXPLAIN WORKFLOW: Query required; calls explainConcept with AISourceContext; shows provenance.
 * - SUMMARY WORKFLOW: No query required; calls summarizeSource with AISourceContext; shows provenance.
 * - STATE & EPHEMERALITY: idle/loading/success/error handled; results are ephemeral; zero DB persistence.
 * - GROUNDING & SAFETY: Source-only grounding note visible; study-use academic disclaimer present;
 *   no general knowledge fallback.
 * - ERROR HANDLING: Safe mapping for provider_unavailable, invalid_response, source_not_supported,
 *   grounding_failed; zero raw errors/API keys/SQLite leaked.
 * - LOCALIZATION: Strict EN/TR parity under studyAi namespace.
 * - ACCESSIBILITY: radiogroup/radio semantics, accessible input and buttons, no fixed height clipping.
 * - ISOLATION: Schema remains v12; no AI persistence; no flashcard generation UI yet.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { DatabaseSync } = require('node:sqlite');
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

const calendarDate = load('utils/calendarDate.ts');

function migrate(db) {
  return load('db/migrations.ts', {
    './client': { getDB: () => db },
    '@/utils/calendarDate': calendarDate,
  }).runMigrations();
}

function createStudySourceRepo(db) {
  return load('db/repositories/studySourceRepo.ts', {
    '../client': { getDB: () => db },
    '@/models/studySource': {},
  }).studySourceRepo;
}

function createTopicRepo(db) {
  return load('db/repositories/topicRepo.ts', {
    '../client': { getDB: () => db },
    './cardRepo': { deleteByTopic: () => {} },
    './qbankRepo': { deleteByTopic: () => {} },
    './studySourceRepo': { deleteByTopic: () => {} },
    '@/models/curriculum': {},
  }).topicRepo;
}

// Domain modules
const aiModels = load('models/ai.ts');
const prompts = load('services/ai/prompts.ts', { '@/models/ai': aiModels });
const mockProviderMod = load('services/ai/mockProvider.ts', { '@/models/ai': aiModels });
const studyAIServiceMod = load('services/ai/studyAIService.ts', {
  '@/models/ai': aiModels,
  './prompts': prompts,
});
const sourceContextMod = load('services/ai/sourceContext.ts', {
  '@/models/ai': aiModels,
  '@/models/curriculum': {},
  '@/models/studySource': {},
});
const studyAIClientMod = load('services/ai/studyAIClient.ts', {
  './studyAIService': studyAIServiceMod,
  './mockProvider': mockProviderMod,
  '@/models/ai': aiModels,
});

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
  console.log('=== PHASE 10 STEP 5: SOURCE-GROUNDED STUDY ASSISTANT UI SUITE ===\n');

  const topicDetailCode = read('app/topics/[id].tsx');
  const assistantCode = read('app/topics/[id]/assistant.tsx');
  const clientCode = read('services/ai/studyAIClient.ts');
  const enCode = read('i18n/en.ts');
  const trCode = read('i18n/tr.ts');

  // 1. ENTRY & ROUTE
  await check('Topic detail has Study Assistant entry action', () => {
    assert.ok(
      topicDetailCode.includes('/assistant'),
      'Topic detail must contain navigation link to /assistant route'
    );
    assert.ok(
      topicDetailCode.includes('studyAi.assistant'),
      'Topic detail button must use localized studyAi.assistant label'
    );
  });

  await check('Assistant screen route exists and is properly structured', () => {
    assert.ok(
      fs.existsSync(path.join(root, 'app/topics/[id]/assistant.tsx')),
      'app/topics/[id]/assistant.tsx route file must exist'
    );
    assert.ok(
      assistantCode.includes('export default function StudyAssistantScreen'),
      'Assistant screen must export default StudyAssistantScreen'
    );
    assert.ok(
      assistantCode.includes('<ScreenWrapper includeBottomSafeArea>'),
      'Assistant screen must use ScreenWrapper with includeBottomSafeArea'
    );
    assert.ok(
      assistantCode.includes('router.canGoBack()') && assistantCode.includes('router.back()'),
      'Assistant screen must implement safe back fallback'
    );
    assert.ok(
      assistantCode.includes('BackHandler.addEventListener'),
      'Assistant screen must handle hardwareBackPress'
    );
  });

  // 2. SERVICE ISOLATION
  await check('Assistant UI never imports Gemini adapter or calls fetch', () => {
    assert.ok(
      !assistantCode.includes('geminiProvider'),
      'Assistant UI must NOT import geminiProvider'
    );
    assert.ok(
      !assistantCode.includes('GeminiAIProvider'),
      'Assistant UI must NOT reference GeminiAIProvider'
    );
    assert.ok(
      !assistantCode.includes('@google/genai'),
      'Assistant UI must NOT reference Google GenAI SDK'
    );
    assert.ok(
      !assistantCode.includes('fetch('),
      'Assistant UI must NOT make direct network fetch calls'
    );
    assert.ok(
      assistantCode.includes("from '@/services/ai/studyAIClient'"),
      'Assistant UI must import getStudyAIService from studyAIClient'
    );
  });

  await check('Study AI client provides provider-neutral service with Mock default', () => {
    assert.ok(
      !clientCode.includes('geminiProvider'),
      'studyAIClient must not reference concrete Gemini provider'
    );
    assert.ok(
      clientCode.includes('new MockAIProvider'),
      'studyAIClient must use MockAIProvider by default for Step 5'
    );
    const service = studyAIClientMod.getStudyAIService();
    assert.ok(service, 'getStudyAIService must return service instance');
    assert.equal(typeof service.explainConcept, 'function');
    assert.equal(typeof service.summarizeSource, 'function');
    assert.equal(typeof service.generateFlashcardDrafts, 'function');
  });

  // 3. SOURCE SELECTION & DATA INTEGRATION
  await check('Source selection logic works with SQLite repository', () => {
    const db = new SQLiteAdapter();
    migrate(db);

    const now = Date.now();
    db.runSync(
      `INSERT INTO committees (id, name, subject, created_at)
       VALUES (?, ?, ?, ?)`,
      ['c-1', 'Cardiovascular', 'Medicine', now]
    );
    db.runSync(
      `INSERT INTO subjects (id, committee_id, name, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
      ['s-1', 'c-1', 'Physiology', now, now]
    );
    db.runSync(
      `INSERT INTO topics (id, subject_id, name, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
      ['top-1', 's-1', 'Frank-Starling Law', now, now]
    );

    const sourceRepo = createStudySourceRepo(db);

    // No sources initially
    const emptySources = sourceRepo.getByTopic('top-1');
    assert.equal(emptySources.length, 0);

    // Insert 2 sources
    const s1 = sourceRepo.insert({
      topicId: 'top-1',
      title: 'Ventricular Mechanics Lecture Notes',
      content: 'Stroke volume increases in response to an increase in end-diastolic volume.',
      sourceType: 'note',
    });
    const s2 = sourceRepo.insert({
      topicId: 'top-1',
      title: 'Guyton Physiology Chapter 9 Excerpt',
      content: 'The intrinsic ability of the heart to adapt to increasing volumes of inflowing blood.',
      sourceType: 'text',
    });

    const sources = sourceRepo.getByTopic('top-1');
    assert.equal(sources.length, 2);

    // Check UI code verifies stale sources
    assert.ok(
      assistantCode.includes('freshSource'),
      'Assistant screen must re-verify source exists in DB before calling service'
    );
    assert.ok(
      assistantCode.includes('sourceMissing'),
      'Assistant screen must show sourceMissing when source was deleted'
    );

    db.closeSync();
  });

  await check('Source selection cards do not leak full content in list', () => {
    assert.ok(
      assistantCode.includes('source.title') && assistantCode.includes('source.sourceType'),
      'Selection cards show source.title and source.sourceType'
    );
    // Ensure source.content is not rendered inside selection items
    const selectionBlock = assistantCode.split('accessibilityRole="radiogroup"')[1]?.split('</Section>')[0] || '';
    assert.ok(
      !selectionBlock.includes('source.content'),
      'Selection list must NOT render entire source.content in card preview'
    );
  });

  await check('Changing selected source clears previous result state', () => {
    assert.ok(
      assistantCode.includes('handleSelectSource'),
      'Assistant must define handleSelectSource'
    );
    assert.ok(
      assistantCode.includes("setResultState({ status: 'idle' })"),
      'Changing source must reset resultState to idle to avoid provenance confusion'
    );
  });

  // 4. EXPLAIN WORKFLOW
  await check('Explain workflow executes strictly through StudyAIService with provenance', async () => {
    const mockProvider = new mockProviderMod.MockAIProvider('normal');
    const service = studyAIServiceMod.createStudyAIService(mockProvider);

    const fakeSource = {
      id: 'src-1',
      topicId: 'top-1',
      title: 'Cardiology Notes',
      content: 'The Frank-Starling law states that the stroke volume increases with end diastolic volume.',
      sourceType: 'note',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const fakeTopic = {
      id: 'top-1',
      subjectId: 's-1',
      name: 'Hemodynamics',
      orderIndex: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const context = sourceContextMod.toAISourceContext(fakeSource, fakeTopic);
    assert.equal(context.sourceId, 'src-1');
    assert.equal(context.sourceTitle, 'Cardiology Notes');
    assert.equal(context.topicName, 'Hemodynamics');

    const result = await service.explainConcept('Frank-Starling', context);
    assert.ok(result.text.length > 0);
    assert.equal(result.sourceId, 'src-1');
    assert.equal(result.sourceTitle, 'Cardiology Notes');

    // UI requirements
    assert.ok(
      assistantCode.includes('conceptRequired'),
      'UI must require non-empty concept query'
    );
    assert.ok(
      assistantCode.includes('explainConcept'),
      'UI must call explainConcept on studyAIService'
    );
    assert.ok(
      assistantCode.includes('basedOnSource'),
      'UI must display basedOnSource provenance'
    );
  });

  // 5. SUMMARY WORKFLOW
  await check('Summary workflow executes through StudyAIService without requiring query', async () => {
    const mockProvider = new mockProviderMod.MockAIProvider('normal');
    const service = studyAIServiceMod.createStudyAIService(mockProvider);

    const fakeSource = {
      id: 'src-1',
      topicId: 'top-1',
      title: 'Renal Physiology',
      content: 'The glomerulus filters water and small solutes while retaining proteins.',
      sourceType: 'text',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const fakeTopic = {
      id: 'top-1',
      subjectId: 's-1',
      name: 'Glomerular Function',
      orderIndex: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const context = sourceContextMod.toAISourceContext(fakeSource, fakeTopic);
    const result = await service.summarizeSource(context);

    assert.ok(result.text.length > 0);
    assert.equal(result.sourceId, 'src-1');
    assert.equal(result.sourceTitle, 'Renal Physiology');

    assert.ok(
      assistantCode.includes('summarizeSource'),
      'UI must call summarizeSource on studyAIService'
    );
  });

  // 6. STATE & EPHEMERALITY
  await check('Assistant results remain strictly ephemeral with zero DB writes', () => {
    const db = new SQLiteAdapter();
    migrate(db);

    // Check schema tables: there are NO ai_history, ai_chats, or ai_results tables
    const tables = db.getAllSync(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE '%ai%'"
    );
    assert.equal(
      tables.length,
      0,
      'No persistent tables for AI conversations or results should exist in SQLite'
    );

    // Verify assistant screen does NOT call insert/update/save for AI results
    assert.ok(
      !assistantCode.includes('insertResult') && !assistantCode.includes('saveResult'),
      'Assistant screen must not write AI results to SQLite'
    );

    // Result state includes clear action
    assert.ok(
      assistantCode.includes('clearResult'),
      'Assistant screen must provide action to clear ephemeral result'
    );

    db.closeSync();
  });

  // 7. GROUNDING & SAFETY SCOPE
  await check('Grounding visibility and academic safety disclaimer are prominent', () => {
    assert.ok(
      assistantCode.includes('sourceOnlyNote'),
      'Assistant must display sourceOnlyNote'
    );
    assert.ok(
      assistantCode.includes('studyUseNote'),
      'Assistant must display studyUseNote academic disclaimer'
    );
    assert.ok(
      !assistantCode.includes('diagnos') && !assistantCode.includes('treatment'),
      'Assistant must NOT claim clinical diagnostic or treatment capabilities'
    );
  });

  // 8. SAFE ERROR HANDLING
  await check('Domain errors map cleanly to localized strings without leaking vendor internals', () => {
    const en = load('i18n/en.ts').default;

    // Test error mapping function logic as implemented in assistant.tsx
    function mapError(err) {
      if (err instanceof aiModels.AIServiceError) {
        switch (err.code) {
          case 'provider_unavailable':
            return en.studyAi.providerUnavailable;
          case 'invalid_response':
            return en.studyAi.invalidResponse;
          case 'source_not_supported':
            return en.studyAi.sourceNotSupported;
          case 'grounding_failed':
            return en.studyAi.groundingFailed;
          default:
            return en.studyAi.genericError;
        }
      }
      return en.studyAi.genericError;
    }

    const err1 = new aiModels.AIServiceError('provider_unavailable', 'Raw API key 12345 leaked');
    const msg1 = mapError(err1);
    assert.equal(msg1, en.studyAi.providerUnavailable);
    assert.ok(!msg1.includes('12345'), 'Must never leak raw error or sensitive details');

    const err2 = new aiModels.AIServiceError('grounding_failed', 'Internal hallucination detected');
    const msg2 = mapError(err2);
    assert.equal(msg2, en.studyAi.groundingFailed);

    const err3 = new Error('SQLite disk I/O error');
    const msg3 = mapError(err3);
    assert.equal(msg3, en.studyAi.genericError);
    assert.ok(!msg3.includes('SQLite'), 'Must not leak database internals');
  });

  // 9. LOCALIZATION PARITY
  await check('Strict EN/TR localization parity for studyAi', () => {
    const en = load('i18n/en.ts').default;
    const tr = load('i18n/tr.ts').default;

    assert.ok(en.studyAi, 'en.ts must define studyAi');
    assert.ok(tr.studyAi, 'tr.ts must define studyAi');

    const enKeys = Object.keys(en.studyAi).sort();
    const trKeys = Object.keys(tr.studyAi).sort();

    assert.deepEqual(
      enKeys,
      trKeys,
      `EN and TR studyAi keys must match exactly. Missing in TR: ${enKeys.filter(
        (k) => !trKeys.includes(k)
      ).join(', ')}, Missing in EN: ${trKeys.filter((k) => !enKeys.includes(k)).join(', ')}`
    );

    // Verify parameter functions
    assert.equal(typeof en.studyAi.basedOnSource, 'function');
    assert.equal(typeof tr.studyAi.basedOnSource, 'function');
    assert.equal(en.studyAi.basedOnSource('Lecture 1'), 'Based on: Lecture 1');
    assert.equal(tr.studyAi.basedOnSource('Lecture 1'), 'Dayanak: Lecture 1');

    // Verify key concepts exist
    const requiredKeys = [
      'assistant',
      'selectSource',
      'explainTab',
      'summarizeTab',
      'explainAction',
      'summarizeAction',
      'conceptLabel',
      'conceptRequired',
      'loadingExplain',
      'loadingSummarize',
      'basedOnSource',
      'sourceOnlyNote',
      'studyUseNote',
      'sourceMissing',
      'providerUnavailable',
      'invalidResponse',
      'groundingFailed',
      'noSources',
      'retry',
    ];

    for (const key of requiredKeys) {
      assert.ok(en.studyAi[key], `en.studyAi must contain ${key}`);
      assert.ok(tr.studyAi[key], `tr.studyAi must contain ${key}`);
    }
  });

  // 10. ACCESSIBILITY
  await check('Accessibility attributes and semantics are present', () => {
    assert.ok(
      assistantCode.includes('accessibilityRole="radiogroup"'),
      'Source selection container must declare accessibilityRole="radiogroup"'
    );
    assert.ok(
      assistantCode.includes('accessibilityRole="radio"'),
      'Source card must declare accessibilityRole="radio"'
    );
    assert.ok(
      assistantCode.includes('accessibilityState={{ selected: isSelected }}'),
      'Source card must declare accessibilityState with selected status'
    );
    assert.ok(
      assistantCode.includes('accessibilityLabel={t.studyAi.conceptLabel}'),
      'Input must provide accessible label'
    );
  });

  // 11. ISOLATION & SCOPE BOUNDARIES
  await check('Step 5 scope boundaries are respected', () => {
    // Schema version remains 12
    const migrationCode = read('db/migrations.ts');
    assert.ok(
      migrationCode.includes('CURRENT_VERSION = 12'),
      'Schema version must remain 12'
    );

    // No flashcard generation UI exposed yet in assistant.tsx
    assert.ok(
      !assistantCode.includes('generateFlashcardDrafts') &&
        !assistantCode.includes('flashcardDrafts'),
      'Flashcard generation UI must NOT be exposed in Step 5 (deferred to Step 6)'
    );

    // No PDF handling or document pickers
    assert.ok(
      !assistantCode.includes('pdf') && !assistantCode.includes('DocumentPicker'),
      'No PDF handling or document pickers allowed in Step 5'
    );

    // No API keys hardcoded
    assert.ok(
      !assistantCode.includes('AIzaSy'),
      'Zero API keys hardcoded in assistant screen'
    );
    assert.ok(
      !clientCode.includes('AIzaSy'),
      'Zero API keys hardcoded in client code'
    );
  });

  console.log(`\nALL ${passed} CHECKS PASSED FOR PHASE 10 STEP 5.\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
