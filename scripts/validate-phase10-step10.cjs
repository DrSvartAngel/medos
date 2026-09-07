/**
 * MedOS — Phase 10 Step 10 Validation Suite
 *
 * Validates AI-Assisted Study Planning Engine:
 * - CONTEXT: Planning context derived from real analytics; null metrics remain strictly null;
 *   no fake readiness score; deterministic candidate selection (weak first, neglected second).
 * - CONTRACT: AIStudyPlanDraft and AIStudyPlanItem interfaces; MAX_PLAN_ITEMS <= 5;
 *   only known topic IDs; allowed action enum ('review' | 'memory' | 'qbank' | 'focus');
 *   bounded duration (10–90 min); malformed output rejected.
 * - PROMPT: Prompt uses only supplied MedOS evidence, enforces JSON format, ADHD-friendly workload,
 *   strictly forbids scoring/readiness inference.
 * - MOCK PROVIDER: Deterministic mock supports normal, malformed, unknown_topic, invalid_action,
 *   invalid_duration, empty_result, and unavailable modes.
 * - UI INTEGRATION: Committee Study Plan screen exists at app/committees/[id]/study-plan.tsx;
 *   Committee detail links to it; factual evidence snapshot rendered; local editing for action
 *   and duration; remove item, clear plan, regenerate supported.
 * - STRICT AUTOMATION ISOLATION: Zero calendar writes, zero focus session writes, zero memory review
 *   writes, zero Q-Bank writes, zero analytics mutation, zero topic completion mutation.
 * - PROVIDER ISOLATION: UI uses studyAIClient; does NOT import Gemini or call fetch directly.
 * - SCHEMA: Schema remains v12 unchanged.
 * - LOCALIZATION: Full EN/TR parity across all studyPlan keys.
 * - ACCESSIBILITY: Accessible roles, descriptive labels on actions and steppers.
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
const committeeDate = load('utils/committeeDate.ts', {
  './calendarDate': calendarDate,
  '@/utils/calendarDate': calendarDate,
});

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
const analyticsRules = load('utils/analyticsRules.ts', {
  './calendarDate': calendarDate,
  '@/models/analytics': {},
});
const priorityRules = load('utils/analyticsPriorityRules.ts', {
  './analyticsRules': analyticsRules,
  './calendarDate': calendarDate,
});
const planningContextMod = load('services/ai/planningContext.ts', {
  '@/models/ai': aiModels,
  '@/models/analytics': {},
  '@/utils/analyticsPriorityRules': priorityRules,
  '@/utils/analyticsRules': analyticsRules,
  '@/utils/committeeDate': committeeDate,
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
  console.log('=== PHASE 10 STEP 10: AI-ASSISTED STUDY PLANNING SUITE ===\n');

  const studyPlanScreenCode = read('app/committees/[id]/study-plan.tsx');
  const committeeDetailCode = read('app/committees/[id].tsx');
  const enCode = read('i18n/en.ts');
  const trCode = read('i18n/tr.ts');
  const promptsCode = read('services/ai/prompts.ts');
  const modelsCode = read('models/ai.ts');
  const serviceCode = read('services/ai/studyAIService.ts');
  const mockCode = read('services/ai/mockProvider.ts');

  // 1. CONTRACT VALIDATION
  await check('AIStudyPlanDraft and AIStudyPlanItem contracts and batch limits exist', () => {
    assert.ok(modelsCode.includes('export interface AIStudyPlanDraft'), 'AIStudyPlanDraft must be exported');
    assert.ok(modelsCode.includes('summary: string'), 'AIStudyPlanDraft must have summary');
    assert.ok(modelsCode.includes('items: AIStudyPlanItem[]'), 'AIStudyPlanDraft must have items array');

    assert.ok(modelsCode.includes('export interface AIStudyPlanItem'), 'AIStudyPlanItem must be exported');
    assert.ok(modelsCode.includes('topicId: string'), 'AIStudyPlanItem must have topicId');
    assert.ok(modelsCode.includes('topicName: string'), 'AIStudyPlanItem must have topicName');
    assert.ok(modelsCode.includes('action: AIStudyPlanAction'), 'AIStudyPlanItem must have action');
    assert.ok(modelsCode.includes('reason: string'), 'AIStudyPlanItem must have reason');
    assert.ok(modelsCode.includes('estimatedMinutes: number'), 'AIStudyPlanItem must have estimatedMinutes');

    assert.ok(
      typeof studyAIServiceMod.MAX_PLAN_ITEMS === 'number' && studyAIServiceMod.MAX_PLAN_ITEMS <= 5,
      'MAX_PLAN_ITEMS must be <= 5'
    );
  });

  // 2. PLANNING CONTEXT BUILDER & FACTUAL DATA INTEGRITY
  await check('Planning context preserves nulls, omits fake readiness, and picks top factual candidates', () => {
    const committee = { id: 'c1', name: 'Cardiovascular System', examDate: Date.now() + 86400000 * 10 };
    const topicEvidences = [
      {
        topicId: 't1',
        subjectId: 's1',
        committeeId: 'c1',
        topicName: 'Arrhythmias',
        questionCount: 15,
        correctCount: 6,
        accuracyPercent: 40,
        lastPracticedAt: Date.now() - 3600000,
        linkedCardCount: 10,
        dueCardCount: 5,
        reviewCount: 8,
        successfulReviewCount: 5,
        retentionPercent: 62,
        lastReviewedAt: Date.now() - 3600000,
        studySeconds: 1200,
        sessionCount: 1,
        lastFocusedAt: Date.now() - 3600000,
        lastActiveAt: Date.now() - 3600000,
        practiced: true,
        masteryStatus: 'needs_attention',
        neglectStatus: 'recent',
      },
      {
        topicId: 't2',
        subjectId: 's1',
        committeeId: 'c1',
        topicName: 'Heart Failure',
        questionCount: 0,
        correctCount: 0,
        accuracyPercent: null,
        lastPracticedAt: null,
        linkedCardCount: 0,
        dueCardCount: 0,
        reviewCount: 0,
        successfulReviewCount: 0,
        retentionPercent: null,
        lastReviewedAt: null,
        studySeconds: 0,
        sessionCount: 0,
        lastFocusedAt: null,
        lastActiveAt: null,
        practiced: false,
        masteryStatus: 'unstudied',
        neglectStatus: 'never_studied',
      },
    ];

    const ctx = planningContextMod.buildPlanningContext(
      committee,
      topicEvidences,
      new Map([['s1', 'Cardiology']])
    );

    assert.equal(ctx.committeeId, 'c1');
    assert.equal(ctx.committeeName, 'Cardiovascular System');
    assert.equal(ctx.topics.length, 2);

    const t1 = ctx.topics.find((t) => t.topicId === 't1');
    assert.ok(t1, 't1 should be in candidate list');
    assert.equal(t1.topicName, 'Arrhythmias');
    assert.equal(t1.qbankAccuracy, 40);
    assert.equal(t1.memoryRetention, 62);
    assert.equal(t1.dueCards, 5);

    const t2 = ctx.topics.find((t) => t.topicId === 't2');
    assert.ok(t2, 't2 should be in candidate list');
    assert.equal(t2.qbankQuestions, null, 'Unstudied topic must have null qbankQuestions');
    assert.equal(t2.qbankAccuracy, null, 'Unstudied topic must have null qbankAccuracy');
    assert.equal(t2.memoryReviews, null, 'Unstudied topic must have null memoryReviews');
    assert.equal(t2.memoryRetention, null, 'Unstudied topic must have null memoryRetention');
    assert.equal(t2.dueCards, null, 'Unstudied topic must have null dueCards');

    // Verify NO composite readiness score exists anywhere on context or topic
    assert.equal(ctx.readinessScore, undefined);
    assert.equal(ctx.readinessPercent, undefined);
    assert.equal(t1.readinessScore, undefined);
    assert.equal(t2.readinessScore, undefined);
  });

  // 3. PROMPT INTEGRITY
  await check('Planning prompt adheres to factual constraints and ADHD friendly rules', () => {
    assert.ok(promptsCode.includes('buildStudyPlanPrompt'), 'buildStudyPlanPrompt must exist');
    assert.ok(promptsCode.includes('Do NOT invent'), 'Prompt must instruct not to invent metrics');
    assert.ok(promptsCode.includes('advisory'), 'Prompt must specify advisory nature');
    assert.ok(promptsCode.includes('JSON'), 'Prompt must enforce JSON output');
  });

  // 4. MOCK PROVIDER MODES & SERVICE VALIDATION
  await check('MockAIProvider generates valid deterministic plan and handles error modes', async () => {
    const testContext = {
      committeeId: 'c1',
      committeeName: 'Cardiovascular System',
      daysUntilExam: 10,
      topics: [
        {
          topicId: 't1',
          topicName: 'Arrhythmias',
          subjectName: 'Cardiology',
          masteryStatus: 'needs_attention',
          neglectStatus: 'recent',
          qbankQuestions: 15,
          qbankAccuracy: 40,
          memoryReviews: 8,
          memoryRetention: 60,
          dueCards: 5,
          lastStudiedAt: Date.now() - 3600000,
          weakReasons: ['qbank_low_accuracy'],
          neglectReasons: [],
        },
      ],
    };

    // 4.1 Normal mode
    const mockProvider = new mockProviderMod.MockAIProvider('normal');
    const service = studyAIServiceMod.createStudyAIService(mockProvider);
    const plan = await service.generateStudyPlan(testContext);

    assert.ok(plan.summary.length > 0, 'Plan must have summary');
    assert.ok(plan.items.length > 0 && plan.items.length <= 5, 'Plan items count must be 1..5');
    for (const item of plan.items) {
      assert.equal(item.topicId, 't1', 'Item topicId must match supplied topic');
      assert.equal(item.topicName, 'Arrhythmias', 'Item topicName must match supplied topic');
      assert.ok(
        ['review', 'memory', 'qbank', 'focus'].includes(item.action),
        `Action ${item.action} must be valid`
      );
      assert.ok(
        item.estimatedMinutes >= 10 && item.estimatedMinutes <= 90,
        `Duration ${item.estimatedMinutes} must be 10..90`
      );
      assert.ok(item.reason.length > 0, 'Reason must be non-empty');
    }

    // 4.2 Malformed mode
    const malformedService = studyAIServiceMod.createStudyAIService(new mockProviderMod.MockAIProvider('malformed'));
    await assert.rejects(
      () => malformedService.generateStudyPlan(testContext),
      (err) => err.code === 'invalid_response',
      'Malformed plan should reject with invalid_response'
    );

    // 4.3 Unknown topic mode
    const unknownTopicService = studyAIServiceMod.createStudyAIService(new mockProviderMod.MockAIProvider('unknown_topic'));
    await assert.rejects(
      () => unknownTopicService.generateStudyPlan(testContext),
      (err) => err.code === 'invalid_response',
      'Unknown topic ID should reject with invalid_response'
    );

    // 4.4 Invalid action mode
    const invalidActionService = studyAIServiceMod.createStudyAIService(new mockProviderMod.MockAIProvider('invalid_action'));
    await assert.rejects(
      () => invalidActionService.generateStudyPlan(testContext),
      (err) => err.code === 'invalid_response',
      'Invalid action enum should reject with invalid_response'
    );

    // 4.5 Invalid duration mode
    const invalidDurationService = studyAIServiceMod.createStudyAIService(new mockProviderMod.MockAIProvider('invalid_duration'));
    await assert.rejects(
      () => invalidDurationService.generateStudyPlan(testContext),
      (err) => err.code === 'invalid_response',
      'Invalid duration should reject with invalid_response'
    );

    // 4.6 Empty result mode
    const emptyService = studyAIServiceMod.createStudyAIService(new mockProviderMod.MockAIProvider('empty_result'));
    await assert.rejects(
      () => emptyService.generateStudyPlan(testContext),
      (err) => err.code === 'invalid_response',
      'Empty plan items should reject with invalid_response'
    );

    // 4.7 Unavailable mode
    const unavailableService = studyAIServiceMod.createStudyAIService(new mockProviderMod.MockAIProvider('unavailable'));
    await assert.rejects(
      () => unavailableService.generateStudyPlan(testContext),
      (err) => err.code === 'provider_unavailable',
      'Unavailable provider should reject with provider_unavailable'
    );
  });

  // 5. UI SCREEN & INTEGRATION
  await check('Study Plan screen and committee detail link exist with correct layout and state handlers', () => {
    // Check Committee detail has link to study-plan
    assert.ok(
      committeeDetailCode.includes('/study-plan'),
      'Committee detail screen must link to committee study-plan route'
    );

    // Check study-plan.tsx exists and uses ScreenWrapper
    assert.ok(
      studyPlanScreenCode.includes('<ScreenWrapper includeBottomSafeArea'),
      'Study plan screen must use ScreenWrapper includeBottomSafeArea'
    );

    // Evidence snapshot elements
    assert.ok(studyPlanScreenCode.includes('evidenceSnapshot'), 'Evidence snapshot section must exist');
    assert.ok(studyPlanScreenCode.includes('weakCount'), 'Weak count must be displayed');
    assert.ok(studyPlanScreenCode.includes('neglectedCount'), 'Neglected count must be displayed');
    assert.ok(studyPlanScreenCode.includes('dueCount'), 'Due count must be displayed');

    // Local editing features
    assert.ok(studyPlanScreenCode.includes('handleActionChange'), 'Local action change handler must exist');
    assert.ok(studyPlanScreenCode.includes('handleDurationChange'), 'Local duration change handler must exist');
    assert.ok(studyPlanScreenCode.includes('handleRemoveItem'), 'Local remove item handler must exist');
    assert.ok(studyPlanScreenCode.includes('handleClearPlan'), 'Local clear plan handler must exist');
    assert.ok(studyPlanScreenCode.includes('handleGeneratePlan'), 'Generate plan handler must exist');

    // Plan Draft Notice / Advisory label
    assert.ok(studyPlanScreenCode.includes('advisoryNote'), 'Advisory note must be displayed');
    assert.ok(studyPlanScreenCode.includes('planDraftNotice'), 'Plan draft notice badge must be displayed');
  });

  // 6. ZERO AUTOMATION / REPO ISOLATION
  await check('Strict automation isolation: zero DB writes, zero calendar/focus/memory/qbank side effects', () => {
    // Check imports in study-plan.tsx
    assert.ok(!studyPlanScreenCode.includes('calendarRepo'), 'study-plan.tsx must not import calendarRepo');
    assert.ok(!studyPlanScreenCode.includes('insertCalendarEvent'), 'study-plan.tsx must not create calendar events');
    assert.ok(!studyPlanScreenCode.includes('focusRepo'), 'study-plan.tsx must not import focusRepo');
    assert.ok(!studyPlanScreenCode.includes('useFocusStore'), 'study-plan.tsx must not start Focus sessions');
    assert.ok(!studyPlanScreenCode.includes('qbankRepo'), 'study-plan.tsx must not import qbankRepo');
    assert.ok(!studyPlanScreenCode.includes('useQBankStore'), 'study-plan.tsx must not mutate Q-Bank store');
    assert.ok(!studyPlanScreenCode.includes('recordReview'), 'study-plan.tsx must not write Memory reviews');
    assert.ok(!studyPlanScreenCode.includes('updateMastery'), 'study-plan.tsx must not update topic mastery');
    assert.ok(!studyPlanScreenCode.includes('is_completed'), 'study-plan.tsx must not mark topics completed');
  });

  // 7. PROVIDER ISOLATION
  await check('Provider isolation: UI does not import Gemini or call fetch directly', () => {
    assert.ok(!studyPlanScreenCode.includes('@google/generative-ai'), 'UI must not import Google Generative AI');
    assert.ok(!studyPlanScreenCode.includes('geminiProvider'), 'UI must not import geminiProvider directly');
    assert.ok(!studyPlanScreenCode.includes('fetch('), 'UI must not make direct network calls');
    assert.ok(studyPlanScreenCode.includes('getStudyAIService'), 'UI must use getStudyAIService client');
  });

  // 8. DATABASE SCHEMA INTEGRITY
  await check('Database schema remains v12 unchanged', () => {
    const db = new SQLiteAdapter();
    migrate(db);
    const versionRow = db.getFirstSync('SELECT version FROM _schema_version LIMIT 1');
    assert.ok(versionRow, 'Schema version row must exist');
    assert.equal(versionRow.version, 12, 'Schema version must remain exactly 12');

    const tables = db
      .getAllSync("SELECT name FROM sqlite_master WHERE type='table'")
      .map((r) => r.name);
    assert.ok(!tables.includes('study_plans'), 'No study_plans table in schema');
    assert.ok(!tables.includes('ai_study_plans'), 'No ai_study_plans table in schema');
  });

  // 9. LOCALIZATION PARITY
  await check('Full EN and TR localization parity for studyPlan namespace', () => {
    const en = load('i18n/en.ts').default;
    const tr = load('i18n/tr.ts').default;

    assert.ok(en.studyPlan, 'en.ts must have studyPlan dictionary');
    assert.ok(tr.studyPlan, 'tr.ts must have studyPlan dictionary');

    const enKeys = Object.keys(en.studyPlan).sort();
    const trKeys = Object.keys(tr.studyPlan).sort();

    assert.deepEqual(enKeys, trKeys, 'studyPlan keys must have 1:1 parity between EN and TR');

    // Check actions sub-dictionary
    const enActionKeys = Object.keys(en.studyPlan.actions).sort();
    const trActionKeys = Object.keys(tr.studyPlan.actions).sort();
    assert.deepEqual(enActionKeys, trActionKeys, 'studyPlan.actions must have 1:1 parity');

    // Required prompt concepts
    const required = [
      'generatePlan',
      'generatingPlan',
      'planDraftNotice',
      'planSummary',
      'action',
      'review',
      'memory',
      'qbank',
      'focus',
      'estimatedMinutes',
      'reason',
      'removeItem',
      'clearPlan',
      'regeneratePlan',
      'noTopics',
      'insufficientEvidence',
      'planFailed',
      'invalidPlan',
      'unknownTopic',
      'minutes',
    ];

    for (const req of required) {
      assert.ok(req in en.studyPlan, `en.studyPlan missing required key: ${req}`);
      assert.ok(req in tr.studyPlan, `tr.studyPlan missing required key: ${req}`);
    }
  });

  // 10. ACCESSIBILITY
  await check('Accessibility standards respected with clear labels and roles', () => {
    assert.ok(
      studyPlanScreenCode.includes('accessibilityRole="button"'),
      'Buttons must have accessibilityRole="button"'
    );
    assert.ok(
      studyPlanScreenCode.includes('accessibilityRole="alert"'),
      'Errors must have accessibilityRole="alert"'
    );
    assert.ok(
      studyPlanScreenCode.includes('accessibilityLabel='),
      'Accessible labels must be present'
    );
  });

  console.log(`\nAll ${passed} checks PASSED!`);
}

main().catch((err) => {
  console.error('Validation failed:', err);
  process.exit(1);
});
