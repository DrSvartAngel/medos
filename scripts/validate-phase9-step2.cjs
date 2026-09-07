/**
 * MedOS — Phase 9 Step 2 Validation Script
 *
 * Validates the Learning Analytics Repository:
 * 1. Factual Topic Analytics Evidence across Q-Bank, Memory (SRS), and Focus modalities.
 * 2. Exact predicate reuse (Focus concluded-study, Memory good/easy success, due cards).
 * 3. Batch Committee Topic Analytics (single-pass CTE query, zero N+1 per topic).
 * 4. Raw aggregate calculation for Subjects and Committees (never average child percentages).
 * 5. Correct zero/null semantics for unstudied topics, zero-evidence subjects, and missing IDs.
 * 6. Exclusion of unlinked practice and cross-committee data.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { DatabaseSync } = require('node:sqlite');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

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
    (key) => (Object.hasOwn(mocks, key) ? mocks[key] : require(key)),
    module,
    module.exports,
    file,
    path.dirname(file)
  );
  return module.exports;
}

class Adapter {
  constructor() {
    this.db = new DatabaseSync(':memory:');
    this.queryLog = [];
  }
  execSync(sql) {
    this.db.exec(sql);
  }
  runSync(sql, values = []) {
    this.queryLog.push({ sql, values });
    return this.db.prepare(sql).run(...values);
  }
  getFirstSync(sql, values = []) {
    this.queryLog.push({ sql, values });
    return this.db.prepare(sql).get(...values);
  }
  getAllSync(sql, values = []) {
    this.queryLog.push({ sql, values });
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
  clearLog() {
    this.queryLog = [];
  }
}

const date = load('utils/calendarDate.ts');
const analyticsRules = load('utils/analyticsRules.ts', {
  './calendarDate': date,
});

function migrate(db) {
  return load(
    'db/migrations.ts',
    {
      './client': { getDB: () => db },
      '@/utils/calendarDate': date,
    }
  ).runMigrations();
}

function createRepo(db) {
  return load('db/repositories/analyticsRepo.ts', {
    '../client': { getDB: () => db },
    '@/models/analytics': {},
    '@/utils/analyticsRules': analyticsRules,
  }).analyticsRepo;
}

async function fixture(run) {
  const db = new Adapter();
  try {
    db.execSync('PRAGMA foreign_keys = ON');
    migrate(db);
    const repo = createRepo(db);
    await run(db, repo);
  } finally {
    db.closeSync();
  }
}

async function main() {
  console.log('=== PHASE 9 STEP 2: LEARNING ANALYTICS REPOSITORY VALIDATION ===\n');

  await check('Topic analytics gathers factual Q-Bank, Memory, and Focus evidence with exact predicates', async () => {
    await fixture(async (db, repo) => {
      const now = 100000;

      // Seed hierarchy: Committee A -> Subject A -> Topic A
      db.runSync(`INSERT INTO committees (id, name, subject, created_at, start_date, exam_date, updated_at)
        VALUES ('comm-a', 'Committee A', 'Internal Medicine', 1000, 0, 0, 1000)`);
      db.runSync(`INSERT INTO subjects (id, committee_id, name, description, created_at, updated_at)
        VALUES ('subj-a', 'comm-a', 'Subject A', '', 1100, 1100)`);
      db.runSync(`INSERT INTO topics (id, subject_id, name, description, learning_objectives, created_at, updated_at)
        VALUES ('topic-a', 'subj-a', 'Topic A', '', '', 1200, 1200)`);

      // 1. Q-Bank evidence: 1 session, 1/1 questions, created at 70000
      db.runSync(`INSERT INTO qbank_sessions (id, topic_id, total_questions, correct_count, duration_sec, source_name, created_at)
        VALUES ('qb-1', 'topic-a', 1, 1, 60, 'Test Bank', 70000)`);

      // 2. Memory evidence: Deck A with cards & reviews
      db.runSync(`INSERT INTO decks (id, name, subject, description, committee_id, created_at, updated_at)
        VALUES ('deck-a', 'Deck A', 'Cardiology', '', 'comm-a', 1000, 1000)`);

      // 2 cards linked to Topic A:
      // card 1: learning, next_review <= now (due)
      db.runSync(`INSERT INTO flashcards (id, deck_id, topic_id, front, back, interval, ease, next_review, schedule_state, created_at, updated_at)
        VALUES ('c-1', 'deck-a', 'topic-a', 'F1', 'B1', 1, 2.5, 90000, 'learning', 1500, 1500)`);
      // card 2: learning, next_review > now (not due)
      db.runSync(`INSERT INTO flashcards (id, deck_id, topic_id, front, back, interval, ease, next_review, schedule_state, created_at, updated_at)
        VALUES ('c-2', 'deck-a', 'topic-a', 'F2', 'B2', 5, 2.5, 150000, 'learning', 1600, 1600)`);

      // 10 reviews on Topic A: 4 good, 2 easy, 2 hard, 2 again
      const ratings = ['good', 'good', 'good', 'good', 'easy', 'easy', 'hard', 'hard', 'again', 'again'];
      let revTime = 50000;
      for (let i = 0; i < ratings.length; i++) {
        db.runSync(`INSERT INTO flashcard_reviews (id, card_id, topic_id, rating, reviewed_at)
          VALUES ('rev-${i}', 'c-1', 'topic-a', '${ratings[i]}', ${revTime + i * 100})`);
      }
      const lastReviewedAt = revTime + 900;

      // 3. Focus evidence:
      // - Valid completed session: 1500s actual, ended_at 25000
      db.runSync(`INSERT INTO focus_sessions (id, topic_id, duration_sec, actual_duration_sec, completed, cancelled, started_at, ended_at)
        VALUES ('f-1', 'topic-a', 1500, 1500, 1, 0, 10000, 25000)`);
      // - Valid cancelled session: 45s (>= 30s qualifies), ended_at 30045
      db.runSync(`INSERT INTO focus_sessions (id, topic_id, duration_sec, actual_duration_sec, completed, cancelled, started_at, ended_at)
        VALUES ('f-2', 'topic-a', 1500, 45, 0, 1, 30000, 30045)`);
      // - Invalid cancelled session: 20s (< 30s does NOT qualify)
      db.runSync(`INSERT INTO focus_sessions (id, topic_id, duration_sec, actual_duration_sec, completed, cancelled, started_at, ended_at)
        VALUES ('f-3', 'topic-a', 1500, 20, 0, 1, 40000, 40020)`);
      // - Unfinished session: ended_at IS NULL (does NOT qualify)
      db.runSync(`INSERT INTO focus_sessions (id, topic_id, duration_sec, actual_duration_sec, completed, cancelled, started_at, ended_at)
        VALUES ('f-4', 'topic-a', 1500, 0, 0, 0, 45000, NULL)`);

      const topicEvidence = repo.getTopicAnalytics('topic-a', now);
      assert.ok(topicEvidence !== null);
      assert.equal(topicEvidence.topicId, 'topic-a');
      assert.equal(topicEvidence.subjectId, 'subj-a');
      assert.equal(topicEvidence.committeeId, 'comm-a');
      assert.equal(topicEvidence.topicName, 'Topic A');

      // Q-Bank
      assert.equal(topicEvidence.questionCount, 1);
      assert.equal(topicEvidence.correctCount, 1);
      assert.equal(topicEvidence.accuracyPercent, 100);
      assert.equal(topicEvidence.lastPracticedAt, 70000);

      // Memory
      assert.equal(topicEvidence.linkedCardCount, 2);
      assert.equal(topicEvidence.dueCardCount, 1);
      assert.equal(topicEvidence.reviewCount, 10);
      assert.equal(topicEvidence.successfulReviewCount, 6); // 4 good + 2 easy
      assert.equal(topicEvidence.retentionPercent, 60); // 6 / 10 = 60%
      assert.equal(topicEvidence.lastReviewedAt, lastReviewedAt);

      // Focus: exactly 2 valid sessions, 1500 + 45 = 1545 seconds
      assert.equal(topicEvidence.sessionCount, 2);
      assert.equal(topicEvidence.studySeconds, 1545);
      assert.equal(topicEvidence.lastFocusedAt, 30045);

      // Derived timestamps & status
      assert.equal(topicEvidence.lastActiveAt, 70000); // max(30045, 50900, 70000)
      assert.equal(topicEvidence.practiced, true);
      // Has due cards and retention < 70% => needs_attention
      assert.equal(topicEvidence.masteryStatus, 'needs_attention');
    });
  });

  await check('Batch Committee Topic Analytics avoids N+1 per-topic queries and preserves zero-evidence topics', async () => {
    await fixture(async (db, repo) => {
      const now = 100000;

      // Committee A:
      //   Subject A -> Topic A, Topic B
      //   Subject B -> Topic C (zero evidence)
      // Committee B:
      //   Subject C -> Topic D
      db.runSync(`INSERT INTO committees (id, name, subject, created_at, start_date, exam_date, updated_at) VALUES
        ('comm-a', 'Committee A', 'Internal Medicine', 1000, 0, 0, 1000),
        ('comm-b', 'Committee B', 'Pediatrics', 2000, 0, 0, 2000)`);
      db.runSync(`INSERT INTO subjects (id, committee_id, name, description, created_at, updated_at) VALUES
        ('subj-a', 'comm-a', 'Subject A', '', 1100, 1100),
        ('subj-b', 'comm-a', 'Subject B', '', 1200, 1200),
        ('subj-c', 'comm-b', 'Subject C', '', 2100, 2100)`);
      db.runSync(`INSERT INTO topics (id, subject_id, name, description, learning_objectives, created_at, updated_at) VALUES
        ('topic-a', 'subj-a', 'Topic A', '', '', 1300, 1300),
        ('topic-b', 'subj-a', 'Topic B', '', '', 1400, 1400),
        ('topic-c', 'subj-b', 'Topic C', '', '', 1500, 1500),
        ('topic-d', 'subj-c', 'Topic D', '', '', 2200, 2200)`);

      // Add evidence for Topic A (1 question, 1 correct)
      db.runSync(`INSERT INTO qbank_sessions (id, topic_id, total_questions, correct_count, created_at)
        VALUES ('qb-a', 'topic-a', 1, 1, 50000)`);

      // Add evidence for Topic B (100 questions, 50 correct)
      db.runSync(`INSERT INTO qbank_sessions (id, topic_id, total_questions, correct_count, created_at)
        VALUES ('qb-b', 'topic-b', 100, 50, 51000)`);

      // Evidence for Topic D (in Committee B - must be excluded)
      db.runSync(`INSERT INTO qbank_sessions (id, topic_id, total_questions, correct_count, created_at)
        VALUES ('qb-d', 'topic-d', 20, 18, 52000)`);

      // Unlinked session (topic_id is NULL - must be excluded)
      db.runSync(`INSERT INTO qbank_sessions (id, topic_id, total_questions, correct_count, created_at)
        VALUES ('qb-null', NULL, 30, 25, 53000)`);

      // Clear query log to verify N+1 absence
      db.clearLog();

      const batchResults = repo.getCommitteeTopicAnalytics('comm-a', now);

      // Verify exactly ONE query was executed (single batch CTE)
      assert.equal(db.queryLog.length, 1, 'getCommitteeTopicAnalytics must execute exactly 1 SQLite query');

      // Verify 3 topics returned from Committee A
      assert.equal(batchResults.length, 3);
      const ids = batchResults.map((t) => t.topicId);
      assert.deepEqual(ids, ['topic-a', 'topic-b', 'topic-c']);

      // Topic A: 1/1 = 100%
      const resA = batchResults.find((t) => t.topicId === 'topic-a');
      assert.equal(resA.questionCount, 1);
      assert.equal(resA.correctCount, 1);
      assert.equal(resA.accuracyPercent, 100);

      // Topic B: 50/100 = 50%
      const resB = batchResults.find((t) => t.topicId === 'topic-b');
      assert.equal(resB.questionCount, 100);
      assert.equal(resB.correctCount, 50);
      assert.equal(resB.accuracyPercent, 50);

      // Topic C: zero evidence preserved faithfully
      const resC = batchResults.find((t) => t.topicId === 'topic-c');
      assert.equal(resC.questionCount, 0);
      assert.equal(resC.correctCount, 0);
      assert.equal(resC.accuracyPercent, null);
      assert.equal(resC.linkedCardCount, 0);
      assert.equal(resC.dueCardCount, 0);
      assert.equal(resC.reviewCount, 0);
      assert.equal(resC.successfulReviewCount, 0);
      assert.equal(resC.retentionPercent, null);
      assert.equal(resC.studySeconds, 0);
      assert.equal(resC.sessionCount, 0);
      assert.equal(resC.lastActiveAt, null);
      assert.equal(resC.practiced, false);
      assert.equal(resC.masteryStatus, 'unstudied');
      assert.equal(resC.neglectStatus, 'never_studied');
    });
  });

  await check('Subject and Committee aggregation strictly calculates raw totals and never averages percentages', async () => {
    await fixture(async (db, repo) => {
      const now = 100000;

      // Committee A:
      //   Subject A -> Topic A (1/1 questions), Topic B (50/100 questions)
      //   Subject B -> Topic C (zero practice)
      db.runSync(`INSERT INTO committees (id, name, subject, created_at, start_date, exam_date, updated_at) VALUES
        ('comm-a', 'Committee A', 'Internal Medicine', 1000, 0, 0, 1000)`);
      db.runSync(`INSERT INTO subjects (id, committee_id, name, description, created_at, updated_at) VALUES
        ('subj-a', 'comm-a', 'Subject A', '', 1100, 1100),
        ('subj-b', 'comm-a', 'Subject B', '', 1200, 1200)`);
      db.runSync(`INSERT INTO topics (id, subject_id, name, description, learning_objectives, created_at, updated_at) VALUES
        ('topic-a', 'subj-a', 'Topic A', '', '', 1300, 1300),
        ('topic-b', 'subj-a', 'Topic B', '', '', 1400, 1400),
        ('topic-c', 'subj-b', 'Topic C', '', '', 1500, 1500)`);

      db.runSync(`INSERT INTO qbank_sessions (id, topic_id, total_questions, correct_count, created_at) VALUES
        ('qb-a', 'topic-a', 1, 1, 50000),
        ('qb-b', 'topic-b', 100, 50, 51000)`);

      // Flashcards: Topic A has 10 reviews (6 good/easy, 4 hard/again = 60%)
      db.runSync(`INSERT INTO decks (id, name, subject, description, committee_id, created_at, updated_at)
        VALUES ('deck-a', 'Deck A', 'Cardiology', '', 'comm-a', 1000, 1000)`);
      db.runSync(`INSERT INTO flashcards (id, deck_id, topic_id, front, back, interval, ease, next_review, schedule_state, created_at, updated_at)
        VALUES ('c-1', 'deck-a', 'topic-a', 'F1', 'B1', 1, 2.5, 50000, 'learning', 1500, 1500)`);
      const ratings = ['good', 'good', 'good', 'good', 'easy', 'easy', 'hard', 'hard', 'again', 'again'];
      for (let i = 0; i < ratings.length; i++) {
        db.runSync(`INSERT INTO flashcard_reviews (id, card_id, topic_id, rating, reviewed_at)
          VALUES ('rev-${i}', 'c-1', 'topic-a', '${ratings[i]}', ${50000 + i})`);
      }

      // 1. Verify Subject A summary
      const subjA = repo.getSubjectAnalytics('subj-a', now);
      assert.ok(subjA !== null);
      assert.equal(subjA.subjectId, 'subj-a');
      assert.equal(subjA.totalTopics, 2);
      assert.equal(subjA.practicedTopics, 2);
      assert.equal(subjA.coveragePercent, 100);
      assert.equal(subjA.totalQuestions, 101);
      assert.equal(subjA.correctQuestions, 51);
      // 51 / 101 = 50.495...% => round(50) = 50%
      // IF it averaged percentages: (100% + 50%) / 2 = 75%. Assert strictly 50%!
      assert.equal(subjA.qbankAccuracyPercent, 50, 'Subject accuracy must be 50% from 51/101, NOT 75%');
      assert.equal(subjA.totalReviews, 10);
      assert.equal(subjA.successfulReviews, 6);
      assert.equal(subjA.memoryRetentionPercent, 60);

      // 2. Verify Subject B summary (unstudied topic)
      const subjB = repo.getSubjectAnalytics('subj-b', now);
      assert.ok(subjB !== null);
      assert.equal(subjB.totalTopics, 1);
      assert.equal(subjB.practicedTopics, 0);
      assert.equal(subjB.coveragePercent, 0);
      assert.equal(subjB.totalQuestions, 0);
      assert.equal(subjB.correctQuestions, 0);
      assert.equal(subjB.qbankAccuracyPercent, null);
      assert.equal(subjB.totalReviews, 0);
      assert.equal(subjB.successfulReviews, 0);
      assert.equal(subjB.memoryRetentionPercent, null);

      // 3. Verify Committee A summary (aggregates Subject A + Subject B)
      db.clearLog();
      const commA = repo.getCommitteeAnalytics('comm-a', now);
      assert.ok(commA !== null);

      // Verify constant SQLite call count:
      // 1 (committee check) + 1 (subjects list) + 1 (batch topics query) = 3 calls
      assert.equal(db.queryLog.length, 3, 'Committee analytics must use a constant 3 SQLite queries');

      assert.equal(commA.committeeId, 'comm-a');
      assert.equal(commA.totalSubjects, 2);
      assert.equal(commA.totalTopics, 3);
      assert.equal(commA.practicedTopics, 2);
      // 2 / 3 = 66.666...% => round(67%)
      assert.equal(commA.coveragePercent, 67);
      assert.equal(commA.totalQuestions, 101);
      assert.equal(commA.correctQuestions, 51);
      assert.equal(commA.qbankAccuracyPercent, 50, 'Committee accuracy must be 50% from 51/101, NOT averaged');
      assert.equal(commA.totalReviews, 10);
      assert.equal(commA.successfulReviews, 6);
      assert.equal(commA.memoryRetentionPercent, 60);
    });
  });

  await check('Zero, null, and missing ID semantics are truthful and compliant with repository conventions', async () => {
    await fixture(async (db, repo) => {
      const now = 100000;

      // Empty committee with 0 subjects/topics
      db.runSync(`INSERT INTO committees (id, name, subject, created_at, start_date, exam_date, updated_at)
        VALUES ('comm-empty', 'Empty Committee', 'Empty', 1000, 0, 0, 1000)`);

      const emptyComm = repo.getCommitteeAnalytics('comm-empty', now);
      assert.ok(emptyComm !== null);
      assert.equal(emptyComm.totalSubjects, 0);
      assert.equal(emptyComm.totalTopics, 0);
      assert.equal(emptyComm.practicedTopics, 0);
      assert.equal(emptyComm.coveragePercent, null, 'Zero-topic committee coverage must be null');
      assert.equal(emptyComm.qbankAccuracyPercent, null);
      assert.equal(emptyComm.memoryRetentionPercent, null);

      const emptyTopicList = repo.getCommitteeTopicAnalytics('comm-empty', now);
      assert.deepEqual(emptyTopicList, []);

      // Empty subject with 0 topics
      db.runSync(`INSERT INTO subjects (id, committee_id, name, description, created_at, updated_at)
        VALUES ('subj-empty', 'comm-empty', 'Empty Subject', '', 1100, 1100)`);
      const emptySubj = repo.getSubjectAnalytics('subj-empty', now);
      assert.ok(emptySubj !== null);
      assert.equal(emptySubj.totalTopics, 0);
      assert.equal(emptySubj.coveragePercent, null);
      assert.equal(emptySubj.qbankAccuracyPercent, null);
      assert.equal(emptySubj.memoryRetentionPercent, null);

      // Missing / non-existent IDs
      assert.equal(repo.getTopicAnalytics('non-existent', now), null);
      assert.equal(repo.getSubjectAnalytics('non-existent', now), null);
      assert.equal(repo.getCommitteeAnalytics('non-existent', now), null);
      assert.deepEqual(repo.getCommitteeTopicAnalytics('non-existent', now), []);

      // Invalid / whitespace IDs
      assert.equal(repo.getTopicAnalytics('  ', now), null);
      assert.equal(repo.getSubjectAnalytics('', now), null);
      assert.equal(repo.getCommitteeAnalytics(' ', now), null);
      assert.deepEqual(repo.getCommitteeTopicAnalytics('', now), []);
    });
  });

  await check('Owning cards alone does not count as practice', async () => {
    await fixture(async (db, repo) => {
      const now = 100000;
      db.runSync(`INSERT INTO committees (id, name, subject, created_at, start_date, exam_date, updated_at)
        VALUES ('comm-1', 'Committee 1', 'General', 1000, 0, 0, 1000)`);
      db.runSync(`INSERT INTO subjects (id, committee_id, name, description, created_at, updated_at)
        VALUES ('subj-1', 'comm-1', 'Subject 1', '', 1100, 1100)`);
      db.runSync(`INSERT INTO topics (id, subject_id, name, description, learning_objectives, created_at, updated_at)
        VALUES ('topic-cards-only', 'subj-1', 'Cards Only Topic', '', '', 1200, 1200)`);

      db.runSync(`INSERT INTO decks (id, name, subject, description, committee_id, created_at, updated_at)
        VALUES ('deck-1', 'Deck 1', 'General', '', 'comm-1', 1000, 1000)`);

      // 5 flashcards linked, but 0 reviews, 0 focus, 0 qbank
      for (let i = 0; i < 5; i++) {
        db.runSync(`INSERT INTO flashcards (id, deck_id, topic_id, front, back, interval, ease, next_review, schedule_state, created_at, updated_at)
          VALUES ('card-${i}', 'deck-1', 'topic-cards-only', 'F', 'B', 1, 2.5, 50000, 'unscheduled', 1500, 1500)`);
      }

      const evidence = repo.getTopicAnalytics('topic-cards-only', now);
      assert.ok(evidence !== null);
      assert.equal(evidence.linkedCardCount, 5);
      assert.equal(evidence.reviewCount, 0);
      assert.equal(evidence.sessionCount, 0);
      assert.equal(evidence.questionCount, 0);
      assert.equal(evidence.practiced, false, 'Owning cards alone must NOT count as practice');
      assert.equal(evidence.masteryStatus, 'unstudied');
      assert.equal(evidence.neglectStatus, 'never_studied');

      const subj = repo.getSubjectAnalytics('subj-1', now);
      assert.equal(subj.practicedTopics, 0);
      assert.equal(subj.coveragePercent, 0);
    });
  });

  console.log(`\n=== ALL ${passed} PHASE 9 STEP 2 TESTS PASSED ===\n`);
}

main().catch((err) => {
  console.error('\nFAILED: ' + err.message);
  console.error(err.stack);
  process.exit(1);
});
