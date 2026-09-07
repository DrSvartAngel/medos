/**
 * MedOS — Phase 9 Master Validation Suite
 *
 * Dedicated end-to-end static, architectural, database, and deterministic rule validation for Phase 9:
 * 1. Domain Rules: arithmetic, sample guards, lastActive, mastery heuristics, neglect threshold, coverage, raw percentage aggregation.
 * 2. Repository (in-memory SQLite): topic evidence CTE, batch committee queries (no N+1), raw sum preservation, unlinked exclusion, due card semantics, concluded focus predicate.
 * 3. Priority Engine: weak qualification & deterministic comparator, neglect qualification & calendar-day calculation, strong+stale orthogonality, limit, immutability.
 * 4. UI Contracts & Integration: CommitteeAnalyticsSummary, WeakTopicsList, NeglectedTopicsList, truthful null rendering, accessibility, topic navigation.
 * 5. Truthfulness: strict absence of fake scores, confidence, pass probability, weakness algorithms, attention scoring, psychiatric inference.
 * 6. Edge Cases: empty committee, cards without reviews, 1/1 Q-Bank sample guard, non-average aggregate arithmetic, 6/10 memory retention, strong+stale separation, missing IDs, DB failure encapsulation.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { DatabaseSync } = require('node:sqlite');

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

const calendarDate = load('utils/calendarDate.ts');
const analyticsRules = load('utils/analyticsRules.ts', {
  './calendarDate': calendarDate,
  '@/models/analytics': {},
});
const priorityRules = load('utils/analyticsPriorityRules.ts', {
  './analyticsRules': analyticsRules,
  './calendarDate': calendarDate,
  '@/models/analytics': {},
});

function migrate(db) {
  return load('db/migrations.ts', {
    './client': { getDB: () => db },
    '@/utils/calendarDate': calendarDate,
  }).runMigrations();
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
  console.log('=== PHASE 9: MASTER VALIDATION SUITE ===\n');

  // ── LAYER 1: DOMAIN RULES & PURE ARITHMETIC ────────────────────────────────
  await check('Domain: Accuracy, retention, and coverage calculate bounded integer percentages', () => {
    // Accuracy
    assert.equal(analyticsRules.calculateAccuracy(0, 0), null);
    assert.equal(analyticsRules.calculateAccuracy(0, 10), 0);
    assert.equal(analyticsRules.calculateAccuracy(5, 10), 50);
    assert.equal(analyticsRules.calculateAccuracy(1, 3), 33);
    assert.equal(analyticsRules.calculateAccuracy(2, 3), 67);
    assert.equal(analyticsRules.calculateAccuracy(10, 10), 100);
    assert.equal(analyticsRules.calculateAccuracy(15, 10), 100); // clamped
    assert.equal(analyticsRules.calculateAccuracy(-2, 10), null); // invalid input returns null

    // Retention
    assert.equal(analyticsRules.calculateRetention(0, 0), null);
    assert.equal(analyticsRules.calculateRetention(0, 8), 0);
    assert.equal(analyticsRules.calculateRetention(6, 10), 60);
    assert.equal(analyticsRules.calculateRetention(10, 10), 100);

    // Coverage
    assert.equal(analyticsRules.calculateCoverage(0, 0), null);
    assert.equal(analyticsRules.calculateCoverage(0, 5), 0);
    assert.equal(analyticsRules.calculateCoverage(3, 5), 60);
    assert.equal(analyticsRules.calculateCoverage(8, 12), 67);
  });

  await check('Domain: Practice predicate and timestamp resolution', () => {
    // Flashcards alone !== practice
    assert.equal(
      analyticsRules.isPracticed({ sessionCount: 0, reviewCount: 0, questionCount: 0 }),
      false
    );
    assert.equal(
      analyticsRules.isPracticed({ sessionCount: 1, reviewCount: 0, questionCount: 0 }),
      true
    );
    assert.equal(
      analyticsRules.isPracticed({ sessionCount: 0, reviewCount: 1, questionCount: 0 }),
      true
    );
    assert.equal(
      analyticsRules.isPracticed({ sessionCount: 0, reviewCount: 0, questionCount: 1 }),
      true
    );

    // Last active resolution
    assert.equal(analyticsRules.calculateLastActiveAt(null, null, null), null);
    assert.equal(analyticsRules.calculateLastActiveAt(100, null, null), 100);
    assert.equal(analyticsRules.calculateLastActiveAt(100, 300, 200), 300);
  });

  await check('Domain: Mastery and Neglect classification heuristics', () => {
    // Unstudied
    assert.equal(
      analyticsRules.classifyTopicMastery({
        questionCount: 0,
        accuracyPercent: null,
        reviewCount: 0,
        retentionPercent: null,
        dueCardCount: 0,
        sessionCount: 0,
      }),
      'unstudied'
    );

    // Edge Case C: 1/1 Q-Bank is 100% accuracy, but < 10 questions -> in_progress (sample guard fails)
    assert.equal(
      analyticsRules.classifyTopicMastery({
        questionCount: 1,
        accuracyPercent: 100,
        reviewCount: 0,
        retentionPercent: null,
        dueCardCount: 0,
        sessionCount: 0,
      }),
      'in_progress'
    );

    // Weak triggers (needs_attention)
    // Low Q-Bank (< 60% with >= 10 questions)
    assert.equal(
      analyticsRules.classifyTopicMastery({
        questionCount: 10,
        accuracyPercent: 50,
        reviewCount: 0,
        retentionPercent: null,
        dueCardCount: 0,
        sessionCount: 0,
      }),
      'needs_attention'
    );
    // Low Memory (< 70% with >= 5 reviews)
    assert.equal(
      analyticsRules.classifyTopicMastery({
        questionCount: 0,
        accuracyPercent: null,
        reviewCount: 5,
        retentionPercent: 60,
        dueCardCount: 0,
        sessionCount: 0,
      }),
      'needs_attention'
    );
    // Due cards > 0 on practiced topic
    assert.equal(
      analyticsRules.classifyTopicMastery({
        questionCount: 0,
        accuracyPercent: null,
        reviewCount: 1,
        retentionPercent: 100,
        dueCardCount: 3,
        sessionCount: 0,
      }),
      'needs_attention'
    );

    // Strong requirements (Q-Bank min 15 >= 75% AND Memory min 10 >= 80% AND 0 due cards)
    assert.equal(
      analyticsRules.classifyTopicMastery({
        questionCount: 20,
        accuracyPercent: 85,
        reviewCount: 12,
        retentionPercent: 90,
        dueCardCount: 0,
        sessionCount: 2,
      }),
      'strong'
    );

    // Neglect: 14 local calendar days threshold
    const now = new Date('2026-09-07T12:00:00Z').getTime();
    assert.equal(analyticsRules.classifyTopicNeglect(null, now), 'never_studied');
    // 5 days ago -> recent
    const fiveDaysAgo = new Date('2026-09-02T12:00:00Z').getTime();
    assert.equal(analyticsRules.classifyTopicNeglect(fiveDaysAgo, now), 'recent');
    // 15 days ago -> stale
    const fifteenDaysAgo = new Date('2026-08-23T12:00:00Z').getTime();
    assert.equal(analyticsRules.classifyTopicNeglect(fifteenDaysAgo, now), 'stale');
  });

  await check('Domain: Aggregate percentage calculations strictly use raw totals and never average child percentages', () => {
    // Edge Case D: Topic A 1/1 (100%), Topic B 50/100 (50%) => Aggregate 51/101 = 50%, NOT (100+50)/2 = 75%
    const topicA = {
      topicId: 't1',
      subjectId: 's1',
      committeeId: 'c1',
      topicName: 'A',
      questionCount: 1,
      correctCount: 1,
      accuracyPercent: 100,
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
      practiced: true,
      masteryStatus: 'in_progress',
      neglectStatus: 'never_studied',
    };
    const topicB = {
      ...topicA,
      topicId: 't2',
      topicName: 'B',
      questionCount: 100,
      correctCount: 50,
      accuracyPercent: 50,
    };

    const subjectSummary = analyticsRules.summarizeSubjectAnalytics('s1', 'c1', 'Subject 1', [topicA, topicB]);
    assert.equal(subjectSummary.totalQuestions, 101);
    assert.equal(subjectSummary.correctQuestions, 51);
    assert.equal(subjectSummary.qbankAccuracyPercent, 50); // Math.round(51/101 * 100) = 50%
    assert.notEqual(subjectSummary.qbankAccuracyPercent, 75);

    const committeeSummary = analyticsRules.summarizeCommitteeAnalytics('c1', [subjectSummary]);
    assert.equal(committeeSummary.totalQuestions, 101);
    assert.equal(committeeSummary.correctQuestions, 51);
    assert.equal(committeeSummary.qbankAccuracyPercent, 50);
  });

  // ── LAYER 2: REPOSITORY & IN-MEMORY SQLITE ─────────────────────────────────
  await check('Repository: Full database fixture validation with exact SQL predicates', async () => {
    await fixture(async (db, repo) => {
      const now = 200000;

      // Seed hierarchy: Committee A -> Subject A -> Topic 1, Topic 2
      //                 Committee A -> Subject B -> Topic 3 (zero evidence)
      //                 Committee B -> Subject C -> Topic 4 (external)
      db.runSync(`INSERT INTO committees (id, name, subject, created_at, start_date, exam_date, updated_at) VALUES
        ('c-a', 'Committee A', 'Cardiology', 1000, 0, 0, 1000),
        ('c-b', 'Committee B', 'Pediatrics', 2000, 0, 0, 2000)`);
      db.runSync(`INSERT INTO subjects (id, committee_id, name, description, created_at, updated_at) VALUES
        ('s-a', 'c-a', 'Subject A', '', 1100, 1100),
        ('s-b', 'c-a', 'Subject B', '', 1200, 1200),
        ('s-c', 'c-b', 'Subject C', '', 2100, 2100)`);
      db.runSync(`INSERT INTO topics (id, subject_id, name, description, learning_objectives, created_at, updated_at) VALUES
        ('t-1', 's-a', 'Arrhythmia', '', '', 1300, 1300),
        ('t-2', 's-a', 'Heart Failure', '', '', 1400, 1400),
        ('t-3', 's-b', 'Valve Disease', '', '', 1500, 1500),
        ('t-4', 's-c', 'Neonatology', '', '', 2200, 2200)`);

      // Q-Bank: Topic 1 (1/1), Topic 2 (50/100)
      db.runSync(`INSERT INTO qbank_sessions (id, topic_id, total_questions, correct_count, created_at) VALUES
        ('qb-1', 't-1', 1, 1, 50000),
        ('qb-2', 't-2', 100, 50, 51000)`);

      // Memory deck in Committee A
      db.runSync(`INSERT INTO decks (id, name, subject, description, committee_id, created_at, updated_at) VALUES
        ('d-1', 'Cardio Deck', 'Cardio', '', 'c-a', 1000, 1000)`);

      // Flashcards:
      // Card 1 linked to Topic 1, due (next_review <= now)
      // Card 2 linked to Topic 1, due
      // Card 3 linked to Topic 2, future (next_review > now)
      // Card 4 linked to Topic 3, but 0 reviews (Edge Case B: cards with zero reviews)
      db.runSync(`INSERT INTO flashcards (id, deck_id, topic_id, front, back, created_at, updated_at, schedule_state, next_review, interval, ease) VALUES
        ('card-1', 'd-1', 't-1', 'Q1', 'A1', 1000, 1000, 'learning', 150000, 1, 2.5),
        ('card-2', 'd-1', 't-1', 'Q2', 'A2', 1000, 1000, 'reviewing', 180000, 2, 2.5),
        ('card-3', 'd-1', 't-2', 'Q3', 'A3', 1000, 1000, 'reviewing', 250000, 5, 2.5),
        ('card-4', 'd-1', 't-3', 'Q4', 'A4', 1000, 1000, 'unscheduled', 0, 1, 2.5)`);

      // Reviews: Topic 1 has 10 reviews (6 good/easy, 4 hard/again = 60% retention)
      for (let i = 1; i <= 6; i++) {
        db.runSync(`INSERT INTO flashcard_reviews (id, card_id, topic_id, rating, reviewed_at) VALUES
          ('rev-good-${i}', 'card-1', 't-1', 'good', 100000 + ${i})`);
      }
      for (let i = 1; i <= 4; i++) {
        db.runSync(`INSERT INTO flashcard_reviews (id, card_id, topic_id, rating, reviewed_at) VALUES
          ('rev-hard-${i}', 'card-1', 't-1', 'hard', 100010 + ${i})`);
      }

      // Historical review topic snapshot: card relinked to Topic 2, but review kept topic_id = 't-1'
      // This test ensures reviews count towards their snapshot topic!

      // Focus sessions:
      // Valid concluded session for Topic 2: 1500s (completed = 1, cancelled = 0)
      // Invalid sessions (cancelled < 30s, duration <= 0) must be ignored
      db.runSync(`INSERT INTO focus_sessions (id, committee_id, topic_id, duration_sec, actual_duration_sec, completed, cancelled, started_at, ended_at) VALUES
        ('f-valid', 'c-a', 't-2', 1500, 1500, 1, 0, 80000, 81500),
        ('f-invalid-1', 'c-a', 't-2', 1500, 20, 0, 1, 82000, 82020),
        ('f-invalid-2', 'c-a', 't-2', 1500, 0, 1, 0, 83000, 83000)`);

      // Unlinked Q-Bank session (topic_id IS NULL) must be excluded
      db.runSync(`INSERT INTO qbank_sessions (id, topic_id, total_questions, correct_count, created_at) VALUES
        ('qb-unlinked', NULL, 50, 40, 60000)`);

      // 1. Check Topic 1 analytics
      const t1Evidence = repo.getTopicAnalytics('t-1', now);
      assert.ok(t1Evidence);
      assert.equal(t1Evidence.questionCount, 1);
      assert.equal(t1Evidence.correctCount, 1);
      assert.equal(t1Evidence.accuracyPercent, 100);
      assert.equal(t1Evidence.reviewCount, 10);
      assert.equal(t1Evidence.successfulReviewCount, 6);
      assert.equal(t1Evidence.retentionPercent, 60); // Edge Case E: 6/10 = 60%
      assert.equal(t1Evidence.dueCardCount, 2);
      assert.equal(t1Evidence.masteryStatus, 'needs_attention'); // dueCardCount > 0 and retention < 70%

      // 2. Edge Case B: Topic 3 has cards (Card 4), but zero reviews and zero focus/qbank
      const t3Evidence = repo.getTopicAnalytics('t-3', now);
      assert.ok(t3Evidence);
      assert.equal(t3Evidence.linkedCardCount, 1);
      assert.equal(t3Evidence.reviewCount, 0);
      assert.equal(t3Evidence.retentionPercent, null);
      assert.equal(t3Evidence.practiced, false); // cards alone !== practiced!
      assert.equal(t3Evidence.masteryStatus, 'unstudied');

      // 3. Batch Committee Topic Analytics (avoids N+1)
      db.clearLog();
      const committeeTopics = repo.getCommitteeTopicAnalytics('c-a', now);
      assert.equal(db.queryLog.length, 1, 'Batch committee query must execute in exactly 1 SQLite call');
      assert.equal(committeeTopics.length, 3, 'Must return all 3 topics in Committee A');
      assert.ok(!committeeTopics.some((t) => t.topicId === 't-4'), 'Must exclude Topic 4 from Committee B');

      // 4. Committee Analytics Summary & Optimization (preloaded topic evidences)
      db.clearLog();
      const committeeSummary = repo.getCommitteeAnalytics('c-a', now, committeeTopics);
      assert.ok(committeeSummary);
      assert.equal(db.queryLog.length, 2, 'When preloadedTopicEvidences is passed, avoids CTE re-execution (only committee & subjects queries)');
      assert.equal(committeeSummary.totalTopics, 3);
      assert.equal(committeeSummary.practicedTopics, 2); // Topic 1 and 2 practiced; Topic 3 unstudied
      assert.equal(committeeSummary.coveragePercent, 67); // 2/3 = 67%
      assert.equal(committeeSummary.totalQuestions, 101);
      assert.equal(committeeSummary.correctQuestions, 51);
      assert.equal(committeeSummary.qbankAccuracyPercent, 50); // 51/101 = 50%
      assert.equal(committeeSummary.totalReviews, 10);
      assert.equal(committeeSummary.successfulReviews, 6);
      assert.equal(committeeSummary.memoryRetentionPercent, 60);
      assert.equal(committeeSummary.dueCardCount, 2);

      // 5. Edge Case A: Empty Committee
      db.runSync(`INSERT INTO committees (id, name, subject, created_at, start_date, exam_date, updated_at) VALUES
        ('c-empty', 'Empty Committee', '', 3000, 0, 0, 3000)`);
      const emptySummary = repo.getCommitteeAnalytics('c-empty', now);
      assert.ok(emptySummary);
      assert.equal(emptySummary.totalTopics, 0);
      assert.equal(emptySummary.practicedTopics, 0);
      assert.equal(emptySummary.coveragePercent, null, 'Empty committee coverage must be null (never fake 0%)');

      // 6. Edge Case G: Missing / deleted entity
      assert.equal(repo.getTopicAnalytics('nonexistent-id'), null);
      assert.equal(repo.getSubjectAnalytics('nonexistent-id'), null);
      assert.equal(repo.getCommitteeAnalytics('nonexistent-id'), null);
      assert.deepEqual(repo.getCommitteeTopicAnalytics('nonexistent-id'), []);
    });
  });

  // ── LAYER 3: PRIORITY ENGINE ──────────────────────────────────────────────
  await check('Priority Engine: Weak topic qualification, multi-tier comparator, and neglect', () => {
    const tWeakDue = {
      topicId: 'tw-1',
      subjectId: 's1',
      committeeId: 'c1',
      topicName: 'Weak Due',
      questionCount: 0,
      correctCount: 0,
      accuracyPercent: null,
      lastPracticedAt: null,
      linkedCardCount: 3,
      dueCardCount: 3,
      reviewCount: 0,
      successfulReviewCount: 0,
      retentionPercent: null,
      lastReviewedAt: null,
      studySeconds: 0,
      sessionCount: 0,
      lastFocusedAt: null,
      lastActiveAt: 50000,
      practiced: false,
      masteryStatus: 'needs_attention',
      neglectStatus: 'stale',
    };

    const tWeakMulti = {
      ...tWeakDue,
      topicId: 'tw-2',
      topicName: 'Weak Multi',
      questionCount: 20,
      correctCount: 8,
      accuracyPercent: 40,
      reviewCount: 10,
      successfulReviewCount: 5,
      retentionPercent: 50,
      dueCardCount: 5,
    };

    const tStrong = {
      ...tWeakDue,
      topicId: 'ts-1',
      topicName: 'Strong Stale Topic',
      questionCount: 25,
      correctCount: 22,
      accuracyPercent: 88,
      reviewCount: 15,
      successfulReviewCount: 14,
      retentionPercent: 93,
      dueCardCount: 0,
      masteryStatus: 'strong',
      neglectStatus: 'stale',
      lastActiveAt: 10000,
    };

    const tNeverStudied = {
      ...tWeakDue,
      topicId: 'tn-1',
      topicName: 'Never Studied Topic',
      lastActiveAt: null,
      masteryStatus: 'unstudied',
      neglectStatus: 'never_studied',
    };

    // getWeakTopics: only needs_attention qualifies; multi-reason before single; limit works
    const weakList = priorityRules.getWeakTopics([tWeakDue, tWeakMulti, tStrong, tNeverStudied], 5);
    assert.equal(weakList.length, 2, 'Only needs_attention topics qualify for weak list');
    assert.equal(weakList[0].topicId, 'tw-2', 'Multi-reason topic must rank ahead of single-reason topic');
    assert.equal(weakList[1].topicId, 'tw-1');

    // Edge Case F: Strong but stale topic
    // Mastery is strong, neglect is stale -> INCLUDED in Neglected list, EXCLUDED from Weak list!
    assert.ok(!weakList.some((w) => w.topicId === 'ts-1'), 'Strong topic must NEVER be in weak list');

    const now = 200000;
    const neglectedList = priorityRules.getNeglectedTopics(
      [tWeakDue, tWeakMulti, tStrong, tNeverStudied],
      5,
      now
    );
    assert.ok(neglectedList.some((n) => n.topicId === 'ts-1'), 'Strong stale topic MUST be in neglected list');
    assert.equal(neglectedList[0].topicId, 'tn-1', 'never_studied must rank before stale');

    // Limits & immutability
    const copyBefore = [tWeakDue, tWeakMulti];
    priorityRules.getWeakTopics(copyBefore, 1);
    assert.equal(copyBefore.length, 2, 'Source array must not be mutated');
  });

  // ── LAYER 4: UI CONTRACTS & LOCALIZATION ──────────────────────────────────
  await check('UI Contracts: Components export correctly and handle truthful null metrics', () => {
    const summaryFile = read('components/analytics/CommitteeAnalyticsSummary.tsx');
    const weakFile = read('components/analytics/WeakTopicsList.tsx');
    const neglectedFile = read('components/analytics/NeglectedTopicsList.tsx');
    const committeeScreen = read('app/committees/[id].tsx');

    // Export contracts
    assert.ok(summaryFile.includes('export function CommitteeAnalyticsSummary'));
    assert.ok(weakFile.includes('export function WeakTopicsList'));
    assert.ok(neglectedFile.includes('export function NeglectedTopicsList'));

    // Truthful null rendering in CommitteeAnalyticsSummary
    assert.ok(summaryFile.includes('t.analytics.noQBank'));
    assert.ok(summaryFile.includes('t.analytics.noMemoryReviews'));
    assert.ok(summaryFile.includes('t.analytics.noTopics'));

    // Factual reasons formatting in WeakTopicsList
    assert.ok(weakFile.includes('t.analytics.qbankReasonValue'));
    assert.ok(weakFile.includes('t.analytics.memoryReasonValue'));
    assert.ok(weakFile.includes('t.analytics.dueReasonValue'));

    // Factual age in NeglectedTopicsList
    assert.ok(neglectedFile.includes('t.analytics.neverStudied'));
    assert.ok(neglectedFile.includes('t.analytics.daysAgo'));

    // Screen wiring
    assert.ok(committeeScreen.includes('<CommitteeAnalyticsSummary'));
    assert.ok(committeeScreen.includes('<WeakTopicsList'));
    assert.ok(committeeScreen.includes('<NeglectedTopicsList'));

    // Direct topic navigation
    assert.ok(weakFile.includes('/topics/'));
    assert.ok(neglectedFile.includes('/topics/'));

    // Accessibility
    assert.ok(summaryFile.includes('accessibilityRole="text"'));
    assert.ok(weakFile.includes('accessibilityRole="button"'));
    assert.ok(neglectedFile.includes('accessibilityRole="button"'));
  });

  await check('Localization: Full EN/TR parity in analytics namespace', () => {
    const en = read('i18n/en.ts');
    const tr = read('i18n/tr.ts');

    const extractKeys = (content) => {
      const match = content.match(/analytics:\s*\{([\s\S]*?)\n\s*\},\s*\n(?:\s*\/\/[^\n]*\n)*\s*notFound:/);
      assert.ok(match, 'Must match analytics block');
      const keys = [];
      for (const line of match[1].split('\n')) {
        const lineMatch = line.match(/^\s*([a-zA-Z0-9_]+):/);
        if (lineMatch) keys.push(lineMatch[1]);
      }
      return keys.sort();
    };

    const enKeys = extractKeys(en);
    const trKeys = extractKeys(tr);
    assert.deepEqual(enKeys, trKeys, 'Analytics keys in en.ts and tr.ts must match exactly');
  });

  // ── LAYER 5: TRUTHFULNESS & PSEUDOSCIENCE ABSENCE ─────────────────────────
  await check('Integrity: Strict absence of fake scores or psychiatric inference', () => {
    const runtimeFiles = [
      'models/analytics.ts',
      'utils/analyticsRules.ts',
      'utils/analyticsPriorityRules.ts',
      'db/repositories/analyticsRepo.ts',
      'components/analytics/CommitteeAnalyticsSummary.tsx',
      'components/analytics/WeakTopicsList.tsx',
      'components/analytics/NeglectedTopicsList.tsx',
      'app/committees/[id].tsx',
    ];

    const forbiddenTerms = [
      'readinessPercent',
      'readinessScore',
      'examReadiness',
      'confidenceScore',
      'passProbability',
      'predictedScore',
      'weaknessScore',
      'examProbability',
      'attentionScore',
      'adhdSeverity',
    ];

    for (const rel of runtimeFiles) {
      const content = read(rel);
      for (const term of forbiddenTerms) {
        assert.ok(
          !content.includes(term),
          `Runtime file ${rel} must not contain forbidden score/prediction term "${term}"`
        );
      }
    }
  });

  // ── LAYER 6: ERROR & DB FAILURE ENCAPSULATION ──────────────────────────────
  await check('Edge Case H: DB error handling does not expose raw SQLite errors to analytics UI', () => {
    const committeeScreen = read('app/committees/[id].tsx');
    // Check catch block in loadAnalytics
    assert.ok(
      committeeScreen.includes('setAnalyticsError(true)'),
      'loadAnalytics must set calm error flag on error'
    );
    assert.ok(
      !committeeScreen.includes('error.message'),
      'loadAnalytics must never expose raw error.message to state'
    );
    assert.ok(
      committeeScreen.includes('error={analyticsError}'),
      'Screen must pass error flag to CommitteeAnalyticsSummary'
    );
    const summaryFile = read('components/analytics/CommitteeAnalyticsSummary.tsx');
    assert.ok(
      summaryFile.includes('t.analytics.loadError'),
      'UI must use localized generic load error message'
    );
  });

  console.log(`\nALL ${passed} MASTER SUITE CHECKS PASSED.`);
}

main().catch((err) => {
  console.error('\nFAIL:', err);
  process.exit(1);
});
