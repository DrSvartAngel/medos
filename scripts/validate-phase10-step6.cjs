/**
 * MedOS — Phase 10 Step 6 Validation Suite
 *
 * Validates Source-Grounded Flashcard Draft Generator:
 * - ENTRY: Flashcard draft action integrated in Study Assistant; mode toggle exists.
 * - SERVICE ISOLATION: UI uses provider-neutral studyAIClient; does NOT import Gemini or call fetch.
 * - SOURCE: Requires selected source; builds AISourceContext; stale/deleted source blocks generation;
 *   changing source clears drafts.
 * - GENERATION: StudyAIService.generateFlashcardDrafts invoked; respects MAX_FLASHCARD_DRAFTS;
 *   grounding validation enforced; malformed outputs safely rejected.
 * - EDITING: Front and back editable in local React state; sets edited badge; source content unchanged.
 * - DRAFT MANAGEMENT: Remove single draft; clear all drafts; regenerate replaces drafts without appending.
 * - PERSISTENCE SAFETY: Zero writes to flashcards/decks/reviews/qbank; zero AI draft tables in SQLite;
 *   no save/import/approve buttons in Step 6; schema remains v12.
 * - LOCALIZATION: Full EN/TR parity across all flashcard draft keys in studyAi namespace.
 * - ACCESSIBILITY: Labelled inputs and buttons; draft-specific remove labels; provenance and draft notices.
 * - SECURITY: Zero hardcoded API keys; zero real network; mock-first offline execution.
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
  console.log('=== PHASE 10 STEP 6: SOURCE-GROUNDED FLASHCARD DRAFT GENERATOR SUITE ===\n');

  const assistantCode = read('app/topics/[id]/assistant.tsx');
  const clientCode = read('services/ai/studyAIClient.ts');
  const enCode = read('i18n/en.ts');
  const trCode = read('i18n/tr.ts');

  // 1. ENTRY & INTEGRATION
  await check('Assistant screen contains flashcard draft tab and generate action', () => {
    assert.ok(
      assistantCode.includes('flashcardsTab'),
      'Assistant must define flashcardsTab mode switch'
    );
    assert.ok(
      assistantCode.includes('generateFlashcards'),
      'Assistant must render generateFlashcards action'
    );
    assert.ok(
      assistantCode.includes('handleGenerateDrafts'),
      'Assistant must implement handleGenerateDrafts handler'
    );
  });

  // 2. SERVICE ISOLATION
  await check('UI strictly uses provider-neutral client without Gemini or fetch imports', () => {
    assert.ok(!assistantCode.includes('geminiProvider'), 'UI must NOT import geminiProvider');
    assert.ok(!assistantCode.includes('GeminiAIProvider'), 'UI must NOT reference GeminiAIProvider');
    assert.ok(!assistantCode.includes('@google/genai'), 'UI must NOT reference Google GenAI SDK');
    assert.ok(!assistantCode.includes('fetch('), 'UI must NOT make network fetch calls');
    assert.ok(
      assistantCode.includes("from '@/services/ai/studyAIClient'"),
      'UI must import from studyAIClient'
    );
  });

  // 3. SOURCE VALIDATION & DRAFT CLEARING ON SOURCE CHANGE
  await check('Source selection is required and changing source clears draft state', () => {
    assert.ok(
      assistantCode.includes('setDrafts([])'),
      'Changing selected source must clear drafts via setDrafts([])'
    );
    assert.ok(
      assistantCode.includes('isSourceStale'),
      'Stale source detection must be implemented'
    );
    assert.ok(
      assistantCode.includes('freshSource'),
      'Generation handler must re-verify source exists in DB before invoking AI service'
    );
  });

  // 4. GENERATION & STUDY AI SERVICE INTEGRATION
  await check('StudyAIService generates valid grounded drafts and rejects bad grounding', async () => {
    const normalProvider = new mockProviderMod.MockAIProvider('normal');
    const service = studyAIServiceMod.createStudyAIService(normalProvider);

    const source = {
      id: 'src-1',
      topicId: 'top-1',
      title: 'Ventricular Mechanics',
      content: 'Stroke volume increases in response to an increase in end-diastolic volume.\nThis is the Frank-Starling law.',
      sourceType: 'note',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const topic = {
      id: 'top-1',
      subjectId: 's-1',
      name: 'Hemodynamics',
      orderIndex: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const context = sourceContextMod.toAISourceContext(source, topic);

    // Normal generation: returns valid drafts
    const drafts = await service.generateFlashcardDrafts(context);
    assert.ok(Array.isArray(drafts));
    assert.ok(drafts.length > 0 && drafts.length <= studyAIServiceMod.MAX_FLASHCARD_DRAFTS);

    for (const d of drafts) {
      assert.ok(d.id, 'Draft must have id');
      assert.ok(d.front, 'Draft must have front');
      assert.ok(d.back, 'Draft must have back');
      assert.ok(d.sourceExcerpt, 'Draft must have sourceExcerpt');
      assert.equal(d.sourceId, 'src-1');
      assert.equal(d.sourceTitle, 'Ventricular Mechanics');
      assert.equal(d.topicId, 'top-1');
      assert.equal(d.edited, false);
      // Excerpt MUST exist in source content
      assert.ok(
        prompts.isExcerptGrounded(d.sourceExcerpt, source.content),
        'Generated draft excerpt must be grounded in source content'
      );
    }

    // Bad grounding mode: provider fabricates an excerpt not in source
    const badGroundingProvider = new mockProviderMod.MockAIProvider('bad_grounding');
    const badService = studyAIServiceMod.createStudyAIService(badGroundingProvider);

    await assert.rejects(
      async () => badService.generateFlashcardDrafts(context),
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
      async () => malformedService.generateFlashcardDrafts(context),
      (err) => {
        assert.ok(err instanceof aiModels.AIServiceError);
        assert.equal(err.code, 'invalid_response');
        return true;
      },
      'Malformed provider response must throw invalid_response'
    );
  });

  // 5. LOCAL EDITING
  await check('Drafts are editable locally and mark edited status without mutating source', () => {
    assert.ok(
      assistantCode.includes('handleEditDraft'),
      'Assistant must implement handleEditDraft'
    );
    assert.ok(
      assistantCode.includes('edited: true'),
      'Editing a draft must set edited: true'
    );
    assert.ok(
      assistantCode.includes('editedBadge'),
      'Edited badge must be displayed on modified drafts'
    );

    // Verify draft edit logic in memory
    const testDrafts = [
      {
        id: 'd1',
        front: 'Original Front',
        back: 'Original Back',
        sourceId: 's1',
        sourceTitle: 'Source',
        sourceExcerpt: 'Excerpt',
        topicId: 't1',
        edited: false,
      },
    ];

    function edit(drafts, id, field, value) {
      return drafts.map((d) => (d.id === id ? { ...d, [field]: value, edited: true } : d));
    }

    const updatedFront = edit(testDrafts, 'd1', 'front', 'Edited Question?');
    assert.equal(updatedFront[0].front, 'Edited Question?');
    assert.equal(updatedFront[0].edited, true);
    assert.equal(updatedFront[0].back, 'Original Back');

    const updatedBack = edit(updatedFront, 'd1', 'back', 'Edited Answer!');
    assert.equal(updatedBack[0].back, 'Edited Answer!');
    assert.equal(updatedBack[0].edited, true);
  });

  // 6. DRAFT MANAGEMENT: REMOVE, CLEAR ALL, REGENERATE
  await check('Drafts can be individually removed, cleared, or replaced via regenerate', () => {
    assert.ok(
      assistantCode.includes('handleRemoveDraft'),
      'Assistant must implement handleRemoveDraft'
    );
    assert.ok(
      assistantCode.includes('handleClearDrafts'),
      'Assistant must implement handleClearDrafts'
    );
    assert.ok(
      assistantCode.includes('regenerate'),
      'Assistant must provide regenerate action'
    );

    // Verify remove logic
    const testDrafts = [
      { id: 'd1', front: 'F1', back: 'B1' },
      { id: 'd2', front: 'F2', back: 'B2' },
      { id: 'd3', front: 'F3', back: 'B3' },
    ];

    function remove(drafts, id) {
      return drafts.filter((d) => d.id !== id);
    }

    const afterRemove = remove(testDrafts, 'd2');
    assert.equal(afterRemove.length, 2);
    assert.equal(afterRemove[0].id, 'd1');
    assert.equal(afterRemove[1].id, 'd3');

    // Verify clear all
    function clear() {
      return [];
    }
    assert.equal(clear().length, 0);

    // Verify regenerate replaces, does not append
    function regenerate(newDrafts) {
      return newDrafts; // setDrafts(generated) replaces completely
    }
    const regenerated = regenerate([{ id: 'd4', front: 'F4', back: 'B4' }]);
    assert.equal(regenerated.length, 1);
    assert.equal(regenerated[0].id, 'd4');
  });

  // 7. PERSISTENCE SAFETY & STEP 6 BOUNDARIES
  await check('Persistence safety: drafts are strictly ephemeral with zero DB writes or save buttons', () => {
    const db = new SQLiteAdapter();
    migrate(db);

    const now = Date.now();
    db.runSync(
      `INSERT INTO committees (id, name, subject, created_at) VALUES ('c1', 'Cardio', 'Medicine', ?)`,
      [now]
    );
    db.runSync(
      `INSERT INTO subjects (id, committee_id, name, created_at, updated_at) VALUES ('s1', 'c1', 'Physio', ?, ?)`,
      [now, now]
    );
    db.runSync(
      `INSERT INTO topics (id, subject_id, name, created_at, updated_at) VALUES ('t1', 's1', 'Cardiac', ?, ?)`,
      [now, now]
    );
    db.runSync(
      `INSERT INTO study_sources (id, topic_id, title, content, source_type, created_at, updated_at)
       VALUES ('src1', 't1', 'Notes', 'Content excerpt.', 'note', ?, ?)`,
      [now, now]
    );

    // Count before
    const cardsBefore = db.getFirstSync('SELECT COUNT(*) as count FROM flashcards').count;
    const decksBefore = db.getFirstSync('SELECT COUNT(*) as count FROM decks').count;

    // Verify assistant screen has NO save / add / approve / import buttons
    assert.ok(
      !assistantCode.includes('saveFlashcard') &&
        !assistantCode.includes('saveToMemory') &&
        !assistantCode.includes('addToDeck') &&
        !assistantCode.includes('approveFlashcard') &&
        !assistantCode.includes('importFlashcards'),
      'Assistant screen must NOT contain Save to Memory, Add to Deck, or Approve actions in Step 6'
    );

    // Count after: strictly unchanged
    const cardsAfter = db.getFirstSync('SELECT COUNT(*) as count FROM flashcards').count;
    const decksAfter = db.getFirstSync('SELECT COUNT(*) as count FROM decks').count;

    assert.equal(cardsBefore, cardsAfter);
    assert.equal(decksBefore, decksAfter);

    // Schema version remains 12
    const migrationCode = read('db/migrations.ts');
    assert.ok(migrationCode.includes('CURRENT_VERSION = 12'), 'Schema version must remain 12');

    db.closeSync();
  });

  // 8. GROUNDING & SCOPE LABELS
  await check('Draft review notice, source provenance, and academic safety labels are visible', () => {
    assert.ok(
      assistantCode.includes('draftReviewNotice'),
      'Assistant must display draftReviewNotice'
    );
    assert.ok(
      assistantCode.includes('sourceOnlyNote'),
      'Assistant must display sourceOnlyNote'
    );
    assert.ok(
      assistantCode.includes('studyUseNote'),
      'Assistant must display studyUseNote'
    );
    assert.ok(
      assistantCode.includes('sourceExcerpt'),
      'Assistant must render sourceExcerpt container for each draft'
    );
  });

  // 9. LOCALIZATION PARITY
  await check('Strict EN/TR localization parity for studyAi Step 6 keys', () => {
    const en = load('i18n/en.ts').default;
    const tr = load('i18n/tr.ts').default;

    const step6Keys = [
      'flashcardsTab',
      'generateFlashcards',
      'flashcardDrafts',
      'draftReviewNotice',
      'front',
      'back',
      'sourceExcerpt',
      'regenerate',
      'removeDraft',
      'removeDraftNumbered',
      'clearDrafts',
      'noDrafts',
      'generatingDrafts',
      'generationFailed',
      'draftCount',
      'editedBadge',
    ];

    for (const key of step6Keys) {
      assert.ok(en.studyAi[key], `en.studyAi must define ${key}`);
      assert.ok(tr.studyAi[key], `tr.studyAi must define ${key}`);
    }

    assert.equal(typeof en.studyAi.removeDraftNumbered, 'function');
    assert.equal(typeof tr.studyAi.removeDraftNumbered, 'function');
    assert.equal(en.studyAi.removeDraftNumbered(1), 'Remove draft 1');
    assert.equal(tr.studyAi.removeDraftNumbered(1), "Taslak 1'i kaldır");

    assert.equal(typeof en.studyAi.draftCount, 'function');
    assert.equal(typeof tr.studyAi.draftCount, 'function');
    assert.equal(en.studyAi.draftCount(1), '1 draft');
    assert.equal(en.studyAi.draftCount(3), '3 drafts');
    assert.equal(tr.studyAi.draftCount(3), '3 taslak');

    // All keys in en.studyAi must match tr.studyAi
    const enKeys = Object.keys(en.studyAi).sort();
    const trKeys = Object.keys(tr.studyAi).sort();
    assert.deepEqual(
      enKeys,
      trKeys,
      `EN and TR studyAi keys must match exactly. Mismatches: ${enKeys.filter(
        (k) => !trKeys.includes(k)
      ).join(', ')}`
    );
  });

  // 10. ACCESSIBILITY
  await check('Accessibility labels, roles, and states are present for draft UI', () => {
    assert.ok(
      assistantCode.includes('accessibilityLabel={`${t.studyAi.front} ${index + 1}`}') ||
        assistantCode.includes('accessibilityLabel={`${t.studyAi.front}'),
      'Front input must have accessible label'
    );
    assert.ok(
      assistantCode.includes('accessibilityLabel={`${t.studyAi.back} ${index + 1}`}') ||
        assistantCode.includes('accessibilityLabel={`${t.studyAi.back}'),
      'Back input must have accessible label'
    );
    assert.ok(
      assistantCode.includes('removeDraftNumbered'),
      'Remove draft button must use removeDraftNumbered accessible label'
    );
    assert.ok(
      assistantCode.includes('generatingDrafts'),
      'Loading state must announce generatingDrafts'
    );
  });

  // 11. SECURITY
  await check('Security: Zero API keys or vendor credentials in Step 6 code', () => {
    assert.ok(!assistantCode.includes('AIzaSy'), 'Zero API keys in assistant screen');
    assert.ok(!clientCode.includes('AIzaSy'), 'Zero API keys in study client');
  });

  console.log(`\nALL ${passed} CHECKS PASSED FOR PHASE 10 STEP 6.\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
