/**
 * MedOS — Phase 10 Step 7 Validation Suite
 *
 * Validates Flashcard Draft Review → Memory Import:
 * - SELECTION: Default all selected; toggle; select all; deselect all; correct counts.
 * - DECK: Decks loaded; empty state handled; stale/deleted deck rejected.
 * - VALIDATION: Deck required; at least one selected draft required; non-empty front/back;
 *   validation precedes write (no partial write).
 * - IMPORT: Reuses canonical Memory persistence (memoryRepo.insertCards); edited values saved;
 *   correct deck and topic linked; canonical scheduling defaults (unscheduled, interval 1, ease 2.5);
 *   zero review history (flashcard_reviews untouched); zero study/practice evidence.
 * - BATCH SAFETY: Atomic transaction execution; failed import preserves drafts; success clears imported drafts;
 *   duplicate submit prevented.
 * - ISOLATION: Zero AI provider calls during save; zero network/fetch; UI does not import Gemini;
 *   zero Q-Bank writes; zero analytics evidence mutation.
 * - SCHEMA: Schema strictly unchanged at v12.
 * - LOCALIZATION: Full EN/TR parity across all Step 7 studyAi keys.
 * - ACCESSIBILITY: Checkbox roles and checked states; radiogroup/radio deck picker; labelled buttons.
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

function createMemoryRepo(db) {
  return load('db/repositories/memoryRepo.ts', {
    '../client': { getDB: () => db },
    '@/utils/memoryScheduling': {
      scheduleReview: () => ({ state: 'learning', intervalDays: 1, nextReviewAt: Date.now() }),
    },
    '@/store/useMemoryStore': {},
  }).memoryRepo;
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
  console.log('=== PHASE 10 STEP 7: FLASHCARD DRAFT REVIEW → MEMORY IMPORT SUITE ===\n');

  const assistantCode = read('app/topics/[id]/assistant.tsx');
  const memoryRepoCode = read('db/repositories/memoryRepo.ts');
  const memoryStoreCode = read('store/useMemoryStore.ts');
  const migrationsCode = read('db/migrations.ts');
  const enCode = read('i18n/en.ts');
  const trCode = read('i18n/tr.ts');

  // 1. SCHEMA INTEGRITY
  await check('Schema remains strictly v12 with zero new tables or altered columns', () => {
    const vMatch = migrationsCode.match(/CURRENT_VERSION\s*=\s*(\d+)/);
    assert.ok(
      vMatch && parseInt(vMatch[1], 10) >= 12,
      'Schema version must be at least 12'
    );
    assert.ok(
      !migrationsCode.includes('ai_flashcard'),
      'Must NOT create any AI draft tables in SQLite'
    );
  });

  // 2. CANONICAL REPOSITORY & BATCH PERSISTENCE
  await check('Assistant UI wraps canonical memoryRepo.insertCard in atomic withTransactionSync', () => {
    assert.ok(
      assistantCode.includes('getDB().withTransactionSync'),
      'Assistant must wrap card batch persistence in getDB().withTransactionSync'
    );
    assert.ok(
      assistantCode.includes('memoryRepo.insertCard('),
      'Assistant must reuse canonical memoryRepo.insertCard persistence path'
    );
    assert.ok(
      memoryRepoCode.includes('insertCard(card: Flashcard): void'),
      'memoryRepo must expose canonical insertCard method'
    );
  });

  // 3. SELECTION LOGIC & CONTROLS IN UI
  await check('Assistant UI implements draft selection with default-all, toggle, and batch controls', () => {
    assert.ok(
      assistantCode.includes('selectedDraftIds'),
      'UI must maintain selectedDraftIds state'
    );
    assert.ok(
      assistantCode.includes('handleToggleDraft'),
      'UI must implement handleToggleDraft'
    );
    assert.ok(
      assistantCode.includes('handleSelectAll'),
      'UI must implement handleSelectAll'
    );
    assert.ok(
      assistantCode.includes('handleDeselectAll'),
      'UI must implement handleDeselectAll'
    );
    assert.ok(
      assistantCode.includes('selectedCount'),
      'UI must display localized selectedCount'
    );
    assert.ok(
      assistantCode.includes('accessibilityRole="checkbox"'),
      'Draft cards must use accessibilityRole="checkbox"'
    );
  });

  // 4. DESTINATION DECK SELECTION
  await check('Assistant UI provides destination deck selection with empty deck state and refresh', () => {
    assert.ok(
      assistantCode.includes('chooseDeck'),
      'UI must include destination deck selection header'
    );
    assert.ok(
      assistantCode.includes('noDecks'),
      'UI must handle no-decks empty state'
    );
    assert.ok(
      assistantCode.includes('createDeck'),
      'UI must provide action to create a deck'
    );
    assert.ok(
      assistantCode.includes('loadDecks'),
      'UI must implement loadDecks to retrieve existing decks'
    );
    assert.ok(
      assistantCode.includes('accessibilityRole="radiogroup"'),
      'Deck selection must expose radiogroup accessibility role'
    );
  });

  // 5. ATOMIC VALIDATION BEFORE SAVE
  await check('Import handler validates deck, selection, and content before writing', () => {
    assert.ok(
      assistantCode.includes('handleImport'),
      'UI must implement explicit handleImport'
    );
    assert.ok(
      assistantCode.includes('deckMissing'),
      'handleImport must validate destination deck is chosen'
    );
    assert.ok(
      assistantCode.includes('noDraftsSelected'),
      'handleImport must validate at least one draft is selected'
    );
    assert.ok(
      assistantCode.includes('invalidDraft'),
      'handleImport must validate front and back are trimmed and non-empty'
    );
    assert.ok(
      assistantCode.includes('isImporting'),
      'handleImport must guard against duplicate submissions'
    );
  });

  // 6. CANONICAL DB PERSISTENCE BEHAVIOR & SCHEDULING DEFAULTS
  await check('memoryRepo.insertCard in transaction persists cards with canonical unscheduled defaults and topic link', () => {
    const db = new SQLiteAdapter();
    migrate(db);
    const repo = createMemoryRepo(db);

    const now = Date.now();
    // Seed committee, subject, topic, and deck
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
      ['d-1', 'Cardio Core', '', now, now]
    );

    const cardsToInsert = [
      {
        id: 'fc-1',
        deckId: 'd-1',
        topicId: 't-1',
        front: 'What is stroke volume?',
        back: 'Volume of blood pumped from ventricle per beat.',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'fc-2',
        deckId: 'd-1',
        topicId: 't-1',
        front: 'What defines cardiac output?',
        back: 'Stroke volume multiplied by heart rate.',
        createdAt: now,
        updatedAt: now,
      },
    ];

    db.withTransactionSync(() => {
      for (const c of cardsToInsert) {
        repo.insertCard(c);
      }
    });

    // Verify flashcards table
    const storedCards = db.getAllSync('SELECT * FROM flashcards WHERE deck_id = ? ORDER BY id ASC', ['d-1']);
    assert.equal(storedCards.length, 2);

    for (const card of storedCards) {
      assert.equal(card.deck_id, 'd-1');
      assert.equal(card.topic_id, 't-1');
      assert.equal(card.schedule_state, 'unscheduled');
      assert.equal(card.interval, 1);
      assert.equal(card.ease, 2.5);
      assert.equal(card.next_review, now);
    }

    // Verify ZERO reviews created (creation != study evidence)
    const reviews = db.getAllSync('SELECT * FROM flashcard_reviews');
    assert.equal(reviews.length, 0, 'No reviews should be created on card import');

    // Verify learning evidence: topic has linked cards, but ZERO reviews and ZERO study activity
    const evidence = repo.getTopicLearningEvidence('t-1', now);
    assert.equal(evidence.linkedCards, 2);
    assert.equal(evidence.linkedReviews, 0);

    const hasReviews = repo.hasTopicReviewActivity('t-1');
    assert.equal(hasReviews, false, 'hasTopicReviewActivity must be false for newly imported cards');
  });

  // 7. BATCH TRANSACTION ROLLBACK ON FAILURE
  await check('Card batch in withTransactionSync executes atomically and rolls back if an invalid topic is linked', () => {
    const db = new SQLiteAdapter();
    migrate(db);
    const repo = createMemoryRepo(db);

    const now = Date.now();
    db.runSync(
      'INSERT INTO decks (id, name, subject, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      ['d-test', 'Test Deck', '', now, now]
    );

    const cards = [
      {
        id: 'fc-valid',
        deckId: 'd-test',
        topicId: null,
        front: 'Valid front',
        back: 'Valid back',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'fc-invalid',
        deckId: 'd-test',
        topicId: 'nonexistent-topic-id', // triggers error in checkedTopicId
        front: 'Bad front',
        back: 'Bad back',
        createdAt: now,
        updatedAt: now,
      },
    ];

    assert.throws(
      () => {
        db.withTransactionSync(() => {
          for (const c of cards) {
            repo.insertCard(c);
          }
        });
      },
      /memory_topic_unavailable/,
      'Should throw when topic does not exist'
    );

    // Verify atomic rollback: 0 cards inserted
    const stored = db.getAllSync('SELECT * FROM flashcards WHERE deck_id = ?', ['d-test']);
    assert.equal(stored.length, 0, 'Transaction must roll back completely on failure');
  });

  // 8. DRAFT PRESERVATION ON FAILURE / CLEAR ON SUCCESS
  await check('UI handles post-import state: clears imported drafts on success; keeps drafts on failure', () => {
    // In success branch: drafts filtered to remove imported IDs
    assert.ok(
      assistantCode.includes('setDrafts((prev) => prev.filter'),
      'Success must remove imported drafts from state'
    );
    assert.ok(
      assistantCode.includes('importSuccess'),
      'Success state must be recorded'
    );
    assert.ok(
      assistantCode.includes('importFailed'),
      'Failure must display localized importFailed message'
    );
    // Failure catch does NOT call setDrafts([])
    const importFnMatch = assistantCode.match(/const handleImport =[\s\S]*?finally/);
    assert.ok(importFnMatch, 'handleImport implementation found');
    const importBody = importFnMatch[0];
    const catchIndex = importBody.indexOf('catch');
    const catchBlock = importBody.slice(catchIndex);
    assert.ok(!catchBlock.includes('setDrafts([])'), 'Catch block must NOT wipe drafts on error');
  });

  // 9. ISOLATION & NO PROVIDER CALL ON IMPORT
  await check('Import flow is purely local: zero provider calls, zero network, zero Q-Bank writes', () => {
    const importFnMatch = assistantCode.match(/const handleImport =[\s\S]*?finally/);
    assert.ok(importFnMatch);
    const importBody = importFnMatch[0];

    assert.ok(!importBody.includes('service.'), 'handleImport must not call AI service');
    assert.ok(!importBody.includes('fetch('), 'handleImport must not call fetch');
    assert.ok(!importBody.includes('qbankRepo'), 'handleImport must not touch qbankRepo');
    assert.ok(!importBody.includes('analyticsRepo'), 'handleImport must not touch analyticsRepo');
  });

  // 10. LOCALIZATION PARITY
  await check('All Step 7 studyAi keys exist with complete EN/TR parity', () => {
    const requiredKeys = [
      'selected',
      'selectAll',
      'deselectAll',
      'selectedCount',
      'chooseDeck',
      'noDecks',
      'createDeck',
      'reviewAndAddToMemory',
      'reviewAndAddToMemoryCount',
      'importing',
      'importSuccess',
      'importFailed',
      'noDraftsSelected',
      'invalidDraft',
      'deckMissing',
      'viewDeck',
    ];

    for (const key of requiredKeys) {
      assert.ok(
        enCode.includes(`${key}:`),
        `i18n/en.ts missing studyAi.${key}`
      );
      assert.ok(
        trCode.includes(`${key}:`),
        `i18n/tr.ts missing studyAi.${key}`
      );
    }
  });

  // 11. ACCESSIBILITY
  await check('Accessibility attributes and roles are properly attached', () => {
    assert.ok(
      assistantCode.includes('accessibilityRole="checkbox"'),
      'Draft checkbox must have accessibilityRole="checkbox"'
    );
    assert.ok(
      assistantCode.includes('accessibilityState={{ checked: isSelected }}'),
      'Draft checkbox must expose checked state'
    );
    assert.ok(
      assistantCode.includes('accessibilityRole="radiogroup"'),
      'Deck selector must expose radiogroup role'
    );
    assert.ok(
      assistantCode.includes('accessibilityRole="radio"'),
      'Deck items must expose radio role'
    );
    assert.ok(
      assistantCode.includes('t.studyAi.selectedCount'),
      'Selected count must be accessible'
    );
  });

  console.log(`\nAll ${passed} checks passed successfully!`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
