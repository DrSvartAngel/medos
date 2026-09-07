/**
 * MedOS — Phase 10 Step 9 Validation Suite
 *
 * Validates Source-Grounded Practice Question Draft Generator:
 * - CONTRACT: AIQuestionDraft interface exists with exactly 4 options, single correct answer index,
 *   explanation, verbatim excerpt, and provenance fields; MAX_QUESTION_DRAFTS <= 5.
 * - SERVICE & GROUNDING: StudyAIService.generateQuestionDrafts validates source grounding,
 *   rejects ungrounded excerpts with grounding_failed, rejects malformed payloads, empty options,
 *   and out-of-bounds correctOptionIndex with invalid_response.
 * - MOCK PROVIDER: Deterministic mock supports normal, bad_grounding, malformed, empty_options,
 *   invalid_correct_index, empty_result, and unavailable modes.
 * - UI INTEGRATION: Questions tab and generate action integrated in Study Assistant;
 *   re-uses selected source; changing source clears drafts.
 * - EDITING: Question, 4 options, explanation, and correct answer radio selection editable in
 *   local React state only; marks draft as edited.
 * - DRAFT MANAGEMENT: Remove single draft, clear all, and regenerate (replaces set) present.
 * - STRICT Q-BANK ISOLATION: Zero calls to qbankRepo, zero qbank_sessions writes, zero useQBankStore
 *   mutations, zero analytics or accuracy calculations.
 * - PROVIDER ISOLATION: UI uses provider-neutral studyAIClient; does NOT import Gemini or call fetch.
 * - SCHEMA: Schema remains v12 unchanged.
 * - LOCALIZATION: Full EN/TR parity across all question draft keys in studyAi namespace.
 * - ACCESSIBILITY: Radio semantics for correct answer selection; descriptive labels for questions and options.
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
  console.log('=== PHASE 10 STEP 9: SOURCE-GROUNDED QUESTION DRAFT GENERATOR SUITE ===\n');

  const assistantCode = read('app/topics/[id]/assistant.tsx');
  const enCode = read('i18n/en.ts');
  const trCode = read('i18n/tr.ts');
  const promptsCode = read('services/ai/prompts.ts');
  const modelsCode = read('models/ai.ts');
  const serviceCode = read('services/ai/studyAIService.ts');

  // 1. CONTRACT VALIDATION
  await check('AIQuestionDraft contract and batch ceiling are defined', () => {
    assert.ok(modelsCode.includes('export interface AIQuestionDraft'), 'AIQuestionDraft must be exported');
    assert.ok(modelsCode.includes('question: string'), 'AIQuestionDraft must have question string');
    assert.ok(modelsCode.includes('options: string[]'), 'AIQuestionDraft must have options array');
    assert.ok(modelsCode.includes('correctOptionIndex: number'), 'AIQuestionDraft must have correctOptionIndex');
    assert.ok(modelsCode.includes('explanation: string'), 'AIQuestionDraft must have explanation');
    assert.ok(modelsCode.includes('sourceExcerpt: string'), 'AIQuestionDraft must have sourceExcerpt');
    assert.ok(modelsCode.includes('sourceId: string'), 'AIQuestionDraft must have sourceId');
    assert.ok(modelsCode.includes('topicId: string'), 'AIQuestionDraft must have topicId');

    assert.ok(
      typeof studyAIServiceMod.MAX_QUESTION_DRAFTS === 'number' &&
        studyAIServiceMod.MAX_QUESTION_DRAFTS <= 5,
      'MAX_QUESTION_DRAFTS must be a number <= 5'
    );
  });

  // 2. PROMPT CONTRACT & GROUNDING VALIDATION
  await check('Prompt builder produces single-best-answer MCQ instructions with grounding rules', () => {
    assert.ok(
      typeof prompts.buildQuestionDraftPrompt === 'function',
      'buildQuestionDraftPrompt function must exist'
    );

    const testSource = {
      sourceId: 'src-101',
      sourceTitle: 'Renal Physiology',
      topicId: 'top-101',
      topicName: 'Glomerular Filtration',
      content: 'Glomerular filtration rate is regulated by tubuloglomerular feedback at the macula densa.',
    };

    const prompt = prompts.buildQuestionDraftPrompt(testSource, 3);
    assert.ok(prompt.systemPrompt.includes('CORE GROUNDING RULES'), 'System prompt must include grounding rules');
    assert.ok(prompt.userPrompt.includes('Renal Physiology'), 'User prompt must include source title');
    assert.ok(prompt.userPrompt.includes('macula densa'), 'User prompt must include source content');
    assert.ok(prompt.schemaDescription.includes('correctOptionIndex'), 'Schema must specify correctOptionIndex');
    assert.ok(prompt.schemaDescription.includes('options'), 'Schema must specify options');
    assert.ok(prompt.schemaDescription.includes('sourceExcerpt'), 'Schema must specify sourceExcerpt');
  });

  // 3. SERVICE GROUNDING & GENERATION (NORMAL & REJECTION MODES)
  await check('StudyAIService generates valid drafts and rejects ungrounded or malformed responses', async () => {
    const normalProvider = new mockProviderMod.MockAIProvider('normal');
    const service = studyAIServiceMod.createStudyAIService(normalProvider);

    const source = {
      id: 'src-cardio',
      topicId: 'top-cardio',
      title: 'Cardiac Electrophysiology',
      content: 'Phase 0 of the cardiac ventricular action potential is caused by rapid opening of voltage-gated fast Na+ channels.\nPhase 2 plateau is maintained by inward Ca2+ current.',
      sourceType: 'note',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const topic = {
      id: 'top-cardio',
      subjectId: 'sub-physio',
      name: 'Cardiology',
      orderIndex: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const context = sourceContextMod.toAISourceContext(source, topic);

    // Normal generation: returns valid MCQs
    const drafts = await service.generateQuestionDrafts(context);
    assert.ok(Array.isArray(drafts));
    assert.ok(drafts.length > 0 && drafts.length <= studyAIServiceMod.MAX_QUESTION_DRAFTS);

    for (const d of drafts) {
      assert.ok(d.id, 'Draft must have id');
      assert.ok(d.question && d.question.trim().length > 0, 'Draft question must not be empty');
      assert.ok(Array.isArray(d.options), 'Draft options must be an array');
      assert.equal(d.options.length, 4, 'Draft options must have exactly 4 items');
      for (const opt of d.options) {
        assert.ok(typeof opt === 'string' && opt.trim().length > 0, 'Option must not be empty');
      }
      assert.ok(
        typeof d.correctOptionIndex === 'number' &&
          Number.isInteger(d.correctOptionIndex) &&
          d.correctOptionIndex >= 0 &&
          d.correctOptionIndex < 4,
        'correctOptionIndex must be an integer between 0 and 3'
      );
      assert.ok(d.explanation && d.explanation.trim().length > 0, 'Explanation must not be empty');
      assert.ok(d.sourceExcerpt && d.sourceExcerpt.trim().length > 0, 'sourceExcerpt must not be empty');
      assert.equal(d.sourceId, 'src-cardio');
      assert.equal(d.sourceTitle, 'Cardiac Electrophysiology');
      assert.equal(d.topicId, 'top-cardio');
      assert.equal(d.edited, false);
      assert.ok(
        prompts.isExcerptGrounded(d.sourceExcerpt, source.content),
        'Generated draft excerpt must be grounded in source content'
      );
    }

    // Bad grounding mode: provider fabricates an excerpt not in source
    const badGroundingProvider = new mockProviderMod.MockAIProvider('bad_grounding');
    const badService = studyAIServiceMod.createStudyAIService(badGroundingProvider);

    await assert.rejects(
      async () => badService.generateQuestionDrafts(context),
      (err) => {
        assert.ok(err instanceof aiModels.AIServiceError);
        assert.equal(err.code, 'grounding_failed');
        return true;
      },
      'Bad grounding must throw AIServiceError with code grounding_failed'
    );

    // Malformed mode: provider returns non-array or invalid schema
    const malformedProvider = new mockProviderMod.MockAIProvider('malformed');
    const malformedService = studyAIServiceMod.createStudyAIService(malformedProvider);

    await assert.rejects(
      async () => malformedService.generateQuestionDrafts(context),
      (err) => {
        assert.ok(err instanceof aiModels.AIServiceError);
        assert.equal(err.code, 'invalid_response');
        return true;
      },
      'Malformed provider response must throw AIServiceError with code invalid_response'
    );

    // Invalid correct index mode
    const invalidIndexProvider = new mockProviderMod.MockAIProvider('invalid_correct_index');
    const invalidIndexService = studyAIServiceMod.createStudyAIService(invalidIndexProvider);

    await assert.rejects(
      async () => invalidIndexService.generateQuestionDrafts(context),
      (err) => {
        assert.ok(err instanceof aiModels.AIServiceError);
        assert.equal(err.code, 'invalid_response');
        return true;
      },
      'Out of bounds correctOptionIndex must throw invalid_response'
    );

    // Empty options mode
    const emptyOptionsProvider = new mockProviderMod.MockAIProvider('empty_options');
    const emptyOptionsService = studyAIServiceMod.createStudyAIService(emptyOptionsProvider);

    await assert.rejects(
      async () => emptyOptionsService.generateQuestionDrafts(context),
      (err) => {
        assert.ok(err instanceof aiModels.AIServiceError);
        assert.equal(err.code, 'invalid_response');
        return true;
      },
      'Empty option string must throw invalid_response'
    );

    // Empty result mode
    const emptyResultProvider = new mockProviderMod.MockAIProvider('empty_result');
    const emptyResultService = studyAIServiceMod.createStudyAIService(emptyResultProvider);

    await assert.rejects(
      async () => emptyResultService.generateQuestionDrafts(context),
      (err) => {
        assert.ok(err instanceof aiModels.AIServiceError);
        assert.equal(err.code, 'invalid_response');
        return true;
      },
      'Empty result must throw invalid_response'
    );

    // Unavailable provider
    const unavailableProvider = new mockProviderMod.MockAIProvider('unavailable');
    const unavailableService = studyAIServiceMod.createStudyAIService(unavailableProvider);

    await assert.rejects(
      async () => unavailableService.generateQuestionDrafts(context),
      (err) => {
        assert.ok(err instanceof aiModels.AIServiceError);
        assert.equal(err.code, 'provider_unavailable');
        return true;
      },
      'Unavailable provider must throw provider_unavailable'
    );
  });

  // 4. UI ENTRY & SOURCE INTEGRATION
  await check('Assistant screen contains Questions tab, generate action, and source clearing', () => {
    assert.ok(assistantCode.includes('questionsTab'), 'Assistant must have questionsTab');
    assert.ok(assistantCode.includes('generateQuestions'), 'Assistant must have generateQuestions action');
    assert.ok(
      assistantCode.includes('handleGenerateQuestionDrafts'),
      'Assistant must define handleGenerateQuestionDrafts'
    );
    assert.ok(
      assistantCode.includes('setQuestionDrafts([])'),
      'Selecting a different source must clear questionDrafts state'
    );
  });

  // 5. DRAFT UI & EDITING CAPABILITIES
  await check('Question drafts are editable in local React state and do not mutate source', () => {
    assert.ok(
      assistantCode.includes('handleEditQuestionDraft'),
      'Assistant must support editing question and explanation'
    );
    assert.ok(
      assistantCode.includes('handleEditQuestionOption'),
      'Assistant must support editing individual options'
    );
    assert.ok(
      assistantCode.includes('handleSetCorrectOption'),
      'Assistant must support selecting the correct option'
    );
    assert.ok(
      assistantCode.includes('handleRemoveQuestionDraft'),
      'Assistant must support removing individual question drafts'
    );
    assert.ok(
      assistantCode.includes('handleClearQuestionDrafts'),
      'Assistant must support clearing all question drafts'
    );
    assert.ok(
      assistantCode.includes('regenerateQuestions'),
      'Assistant must support regenerating question drafts'
    );
  });

  // 6. STRICT Q-BANK ISOLATION (ZERO SESSIONS, ZERO METRICS, ZERO ATTEMPTS)
  await check('Zero Q-Bank session writes, zero store mutation, zero analytics contamination', () => {
    assert.ok(
      !assistantCode.includes('qbankRepo.insertSession'),
      'Assistant must NOT call qbankRepo.insertSession'
    );
    assert.ok(
      !assistantCode.includes('useQBankStore'),
      'Assistant must NOT import or use useQBankStore'
    );
    assert.ok(
      !assistantCode.includes('qbank_sessions'),
      'Assistant must NOT reference qbank_sessions table'
    );
    assert.ok(
      !assistantCode.includes('correct_count'),
      'Assistant must NOT calculate or store correct_count'
    );
    assert.ok(
      !assistantCode.includes('accuracy'),
      'Assistant must NOT calculate or store accuracy'
    );

    // Verify serviceCode also does not write to qbank
    assert.ok(!serviceCode.includes('qbank_sessions'), 'Service must NOT write to qbank_sessions');
    assert.ok(!serviceCode.includes('qbankRepo'), 'Service must NOT reference qbankRepo');
  });

  // 7. PROVIDER ISOLATION & NO REAL NETWORK
  await check('UI and client strictly use mock provider without direct Gemini or fetch imports', () => {
    assert.ok(!assistantCode.includes('geminiProvider'), 'UI must NOT import geminiProvider');
    assert.ok(!assistantCode.includes('GeminiAIProvider'), 'UI must NOT import GeminiAIProvider');
    assert.ok(!assistantCode.includes('@google/genai'), 'UI must NOT import Google GenAI SDK');
    assert.ok(!assistantCode.includes('fetch('), 'UI must NOT invoke fetch API');

    const clientCode = read('services/ai/studyAIClient.ts');
    assert.ok(clientCode.includes('MockAIProvider'), 'studyAIClient must default to MockAIProvider');
  });

  // 8. SCHEMA INTEGRITY (V12 UNCHANGED)
  await check('Schema remains v12 with zero schema changes', () => {
    const db = new SQLiteAdapter();
    migrate(db);

    const versionRow = db.getFirstSync('SELECT version FROM _schema_version LIMIT 1');
    assert.ok(versionRow, 'Schema version row must exist');
    assert.equal(versionRow.version, 12, 'Schema version must remain exactly 12');

    // Verify no new AI draft persistence tables were added to SQLite
    const tables = db
      .getAllSync("SELECT name FROM sqlite_master WHERE type='table'")
      .map((r) => r.name);
    assert.ok(!tables.includes('ai_question_drafts'), 'No ai_question_drafts table in schema');
    assert.ok(!tables.includes('question_drafts'), 'No question_drafts table in schema');

    db.closeSync();
  });

  // 9. LOCALIZATION (STRICT EN/TR PARITY)
  await check('Localization strings for question drafts have 1:1 EN/TR parity', () => {
    const en = load('i18n/en.ts').default;
    const tr = load('i18n/tr.ts').default;

    const requiredKeys = [
      'questionsTab',
      'generateQuestions',
      'questionDrafts',
      'question',
      'option',
      'optionNumbered',
      'correctAnswer',
      'explanation',
      'sourceExcerpt',
      'questionDraftNotice',
      'regenerateQuestions',
      'removeQuestion',
      'removeQuestionNumbered',
      'clearQuestions',
      'noQuestionDrafts',
      'generatingQuestions',
      'questionGenerationFailed',
      'invalidQuestionDraft',
      'questionDraftCount',
      'markAsCorrect',
    ];

    for (const key of requiredKeys) {
      assert.ok(
        Object.hasOwn(en.studyAi, key),
        `English studyAi namespace must contain key "${key}"`
      );
      assert.ok(
        Object.hasOwn(tr.studyAi, key),
        `Turkish studyAi namespace must contain key "${key}"`
      );

      if (typeof en.studyAi[key] === 'function') {
        assert.equal(
          typeof tr.studyAi[key],
          'function',
          `Key "${key}" in Turkish must match function signature`
        );
        assert.ok(
          en.studyAi[key](1).length > 0,
          `English function "${key}" must produce output`
        );
        assert.ok(
          tr.studyAi[key](1).length > 0,
          `Turkish function "${key}" must produce output`
        );
      } else {
        assert.equal(
          typeof tr.studyAi[key],
          'string',
          `Key "${key}" in Turkish must be a string`
        );
        assert.ok(
          en.studyAi[key].trim().length > 0,
          `English string "${key}" must not be empty`
        );
        assert.ok(
          tr.studyAi[key].trim().length > 0,
          `Turkish string "${key}" must not be empty`
        );
      }
    }
  });

  // 10. ACCESSIBILITY SEMANTICS
  await check('Radio semantics, accessibility labels, and draft notice are implemented in UI', () => {
    assert.ok(
      assistantCode.includes('accessibilityRole="radio"'),
      'Option selector must specify accessibilityRole="radio"'
    );
    assert.ok(
      assistantCode.includes('accessibilityRole="radiogroup"'),
      'Option list must specify accessibilityRole="radiogroup"'
    );
    assert.ok(
      assistantCode.includes('questionDraftNotice'),
      'Question draft UI must display questionDraftNotice notice banner'
    );
    assert.ok(
      assistantCode.includes('removeQuestionNumbered'),
      'Remove button must include numbered accessibility label'
    );
  });

  console.log(`\nALL ${passed} PHASE 10 STEP 9 VALIDATION CHECKS PASSED.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
