/**
 * MedOS — Phase 9 Step 1 Validation
 *
 * Validates analytics domain models and pure deterministic rules:
 * - Accuracy and retention calculation
 * - Practiced predicate (flashcards alone !== practiced)
 * - Topic mastery classification (heuristics with sample size guards)
 * - Topic neglect classification (local calendar days)
 * - Raw aggregate calculations (no averaging of percentages)
 * - Exam evidence summary structure (no composite readiness score)
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

// 1. Load calendarDate for deterministic local calendar calculations
const calendarDate = load('utils/calendarDate.ts');

// 2. Load analyticsRules
const analyticsRules = load('utils/analyticsRules.ts', {
  './calendarDate': calendarDate,
  '@/models/analytics': {},
});

console.log('=== PHASE 9 STEP 1: LEARNING ANALYTICS RULES TEST ===\n');

// ---------------------------------------------------------------------------
// 1. ACCURACY CALCULATION
// ---------------------------------------------------------------------------
{
  assert.equal(analyticsRules.calculateAccuracy(8, 10), 80, '8/10 must equal 80%');
  assert.equal(analyticsRules.calculateAccuracy(0, 10), 0, '0/10 must equal 0%');
  assert.equal(analyticsRules.calculateAccuracy(10, 10), 100, '10/10 must equal 100%');
  assert.equal(analyticsRules.calculateAccuracy(0, 0), null, '0 total questions must return null');
  assert.equal(analyticsRules.calculateAccuracy(5, 0), null, 'Zero total must return null');
  assert.equal(analyticsRules.calculateAccuracy(-1, 10), null, 'Negative correct must return null');
  assert.equal(analyticsRules.calculateAccuracy(5, -10), null, 'Negative total must return null');
  assert.equal(analyticsRules.calculateAccuracy(12, 10), 100, 'Correct > total clamps to 100%');
  assert.equal(analyticsRules.calculateAccuracy(51, 101), 50, '51/101 rounds to 50%');
  console.log('PASS: Accuracy calculation and bounds');
}

// ---------------------------------------------------------------------------
// 2. RETENTION CALCULATION
// ---------------------------------------------------------------------------
{
  assert.equal(analyticsRules.calculateRetention(8, 10), 80, '8/10 must equal 80%');
  assert.equal(analyticsRules.calculateRetention(0, 10), 0, '0/10 must equal 0%');
  assert.equal(analyticsRules.calculateRetention(5, 5), 100, '5/5 must equal 100%');
  assert.equal(analyticsRules.calculateRetention(0, 0), null, '0 total reviews must return null');
  assert.equal(analyticsRules.calculateRetention(-1, 5), null, 'Negative successful must return null');
  assert.equal(analyticsRules.calculateRetention(5, -5), null, 'Negative total reviews must return null');
  console.log('PASS: Retention calculation and bounds');
}

// ---------------------------------------------------------------------------
// 3. LAST ACTIVE AT
// ---------------------------------------------------------------------------
{
  assert.equal(analyticsRules.calculateLastActiveAt(null, null, null), null, 'All null timestamps must return null');
  assert.equal(analyticsRules.calculateLastActiveAt(100, null, null), 100, 'Single focus timestamp');
  assert.equal(analyticsRules.calculateLastActiveAt(100, 500, 200), 500, 'Derives maximum active timestamp');
  assert.equal(analyticsRules.calculateLastActiveAt(-10, null, 300), 300, 'Ignores invalid negative timestamps');
  console.log('PASS: Last active timestamp resolution');
}

// ---------------------------------------------------------------------------
// 4. PRACTICED PREDICATE
// ---------------------------------------------------------------------------
{
  // Merely having flashcards does NOT count as practice
  assert.equal(
    analyticsRules.isPracticed({ sessionCount: 0, reviewCount: 0, questionCount: 0 }),
    false,
    'Zero sessions, reviews, questions must NOT be practiced'
  );
  assert.equal(
    analyticsRules.isPracticed({ sessionCount: 1, reviewCount: 0, questionCount: 0 }),
    true,
    'Concluded focus session counts as practiced'
  );
  assert.equal(
    analyticsRules.isPracticed({ sessionCount: 0, reviewCount: 1, questionCount: 0 }),
    true,
    'Memory review counts as practiced'
  );
  assert.equal(
    analyticsRules.isPracticed({ sessionCount: 0, reviewCount: 0, questionCount: 1 }),
    true,
    'Q-Bank question counts as practiced'
  );
  console.log('PASS: Practiced predicate (flashcards alone !== practiced)');
}

// ---------------------------------------------------------------------------
// 5. TOPIC MASTERY CLASSIFICATION
// ---------------------------------------------------------------------------
{
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
    'unstudied',
    'No evidence must be unstudied'
  );

  // Focus time alone never grants Strong
  assert.equal(
    analyticsRules.classifyTopicMastery({
      questionCount: 0,
      accuracyPercent: null,
      reviewCount: 0,
      retentionPercent: null,
      dueCardCount: 0,
      sessionCount: 10,
    }),
    'in_progress',
    'Focus investment without Q-Bank/Memory tests is in_progress, never strong'
  );

  // Attention: Q-Bank low accuracy (>= 10 questions and < 60%)
  assert.equal(
    analyticsRules.classifyTopicMastery({
      questionCount: 10,
      accuracyPercent: 50,
      reviewCount: 0,
      retentionPercent: null,
      dueCardCount: 0,
      sessionCount: 0,
    }),
    'needs_attention',
    '10 questions @ 50% must trigger needs_attention'
  );

  // Low questions (< 10) does NOT trigger low-accuracy alert prematurely
  assert.equal(
    analyticsRules.classifyTopicMastery({
      questionCount: 4,
      accuracyPercent: 25,
      reviewCount: 0,
      retentionPercent: null,
      dueCardCount: 0,
      sessionCount: 0,
    }),
    'in_progress',
    'Low question count with poor accuracy stays in_progress to avoid small-sample false alarms'
  );

  // Attention: Memory low retention (>= 5 reviews and < 70%)
  assert.equal(
    analyticsRules.classifyTopicMastery({
      questionCount: 0,
      accuracyPercent: null,
      reviewCount: 5,
      retentionPercent: 60,
      dueCardCount: 0,
      sessionCount: 0,
    }),
    'needs_attention',
    '5 reviews @ 60% must trigger needs_attention'
  );

  // Attention: Due cards > 0
  assert.equal(
    analyticsRules.classifyTopicMastery({
      questionCount: 20,
      accuracyPercent: 90,
      reviewCount: 20,
      retentionPercent: 95,
      dueCardCount: 2,
      sessionCount: 5,
    }),
    'needs_attention',
    'Due cards > 0 triggers needs_attention even if historical accuracy and retention were high'
  );

  // Strong: ALL criteria met (>= 15 Q-Bank, accuracy >= 75%, >= 10 reviews, retention >= 80%, dueCardCount === 0)
  assert.equal(
    analyticsRules.classifyTopicMastery({
      questionCount: 15,
      accuracyPercent: 75,
      reviewCount: 10,
      retentionPercent: 80,
      dueCardCount: 0,
      sessionCount: 1,
    }),
    'strong',
    'Exact threshold criteria satisfied yields strong'
  );

  // High Q-Bank but insufficient Memory reviews => in_progress
  assert.equal(
    analyticsRules.classifyTopicMastery({
      questionCount: 30,
      accuracyPercent: 90,
      reviewCount: 4, // needs 10
      retentionPercent: 100,
      dueCardCount: 0,
      sessionCount: 2,
    }),
    'in_progress',
    'High Q-Bank with insufficient Memory reviews is in_progress'
  );

  // High Memory but insufficient Q-Bank questions => in_progress
  assert.equal(
    analyticsRules.classifyTopicMastery({
      questionCount: 8, // needs 15
      accuracyPercent: 100,
      reviewCount: 25,
      retentionPercent: 92,
      dueCardCount: 0,
      sessionCount: 2,
    }),
    'in_progress',
    'High Memory with insufficient Q-Bank questions is in_progress'
  );

  console.log('PASS: Topic mastery classification heuristics');
}

// ---------------------------------------------------------------------------
// 6. TOPIC NEGLECT CLASSIFICATION
// ---------------------------------------------------------------------------
{
  const now = new Date(2026, 8, 7, 12, 0, 0).getTime(); // 2026-09-07 12:00
  const oneDayMs = 24 * 60 * 60 * 1000;

  // Never studied
  assert.equal(
    analyticsRules.classifyTopicNeglect(null, now),
    'never_studied',
    'Null lastActiveAt is never_studied'
  );

  // Same day (0 days) => recent
  assert.equal(
    analyticsRules.classifyTopicNeglect(now, now),
    'recent',
    'Active today is recent'
  );

  // 13 days ago => recent (< 14 days)
  const thirteenDaysAgo = now - 13 * oneDayMs;
  assert.equal(
    analyticsRules.classifyTopicNeglect(thirteenDaysAgo, now),
    'recent',
    '13 days ago is recent'
  );

  // 14 days ago => stale (>= 14 days)
  const fourteenDaysAgo = now - 14 * oneDayMs;
  assert.equal(
    analyticsRules.classifyTopicNeglect(fourteenDaysAgo, now),
    'stale',
    '14 days ago is stale'
  );

  // 30 days ago => stale
  const thirtyDaysAgo = now - 30 * oneDayMs;
  assert.equal(
    analyticsRules.classifyTopicNeglect(thirtyDaysAgo, now),
    'stale',
    '30 days ago is stale'
  );

  console.log('PASS: Topic neglect classification (local calendar days)');
}

// ---------------------------------------------------------------------------
// 7. AGGREGATION WITHOUT AVERAGING PERCENTAGES
// ---------------------------------------------------------------------------
{
  // User Prompt Example:
  // Topic A: 1/1 (100%)
  // Topic B: 50/100 (50%)
  // Aggregate => 51/101 ≈ 50%, NOT 75%
  const topicA = {
    topicId: 't1',
    subjectId: 's1',
    committeeId: 'c1',
    topicName: 'Topic A',
    questionCount: 1,
    correctCount: 1,
    accuracyPercent: 100,
    lastPracticedAt: 100,
    linkedCardCount: 1,
    dueCardCount: 0,
    reviewCount: 1,
    successfulReviewCount: 1,
    retentionPercent: 100,
    lastReviewedAt: 100,
    studySeconds: 100,
    sessionCount: 1,
    lastFocusedAt: 100,
    lastActiveAt: 100,
    practiced: true,
    masteryStatus: 'in_progress',
    neglectStatus: 'recent',
  };

  const topicB = {
    topicId: 't2',
    subjectId: 's1',
    committeeId: 'c1',
    topicName: 'Topic B',
    questionCount: 100,
    correctCount: 50,
    accuracyPercent: 50,
    lastPracticedAt: 200,
    linkedCardCount: 50,
    dueCardCount: 0,
    reviewCount: 9,
    successfulReviewCount: 1,
    retentionPercent: 11,
    lastReviewedAt: 200,
    studySeconds: 200,
    sessionCount: 1,
    lastFocusedAt: 200,
    lastActiveAt: 200,
    practiced: true,
    masteryStatus: 'needs_attention',
    neglectStatus: 'recent',
  };

  const subjectSummary = analyticsRules.summarizeSubjectAnalytics(
    's1',
    'c1',
    'Subject 1',
    [topicA, topicB]
  );

  // Verify Q-Bank Accuracy is 50%, NOT 75%
  assert.equal(
    subjectSummary.qbankAccuracyPercent,
    50,
    'Aggregated accuracy must be 51/101 ≈ 50%, NOT the 75% average of percentages'
  );
  assert.equal(subjectSummary.totalQuestions, 101);
  assert.equal(subjectSummary.correctQuestions, 51);

  // Verify Retention is 2/10 = 20%, NOT the 55.5% average of percentages
  assert.equal(
    subjectSummary.memoryRetentionPercent,
    20,
    'Aggregated retention must be 2/10 = 20%, NOT the average of percentages'
  );
  assert.equal(subjectSummary.totalReviews, 10);
  assert.equal(subjectSummary.successfulReviews, 2);

  // Verify Committee aggregation over subjects
  const committeeSummary = analyticsRules.summarizeCommitteeAnalytics(
    'c1',
    [subjectSummary]
  );
  assert.equal(committeeSummary.qbankAccuracyPercent, 50);
  assert.equal(committeeSummary.memoryRetentionPercent, 20);
  assert.equal(committeeSummary.totalTopics, 2);
  assert.equal(committeeSummary.practicedTopics, 2);
  assert.equal(committeeSummary.coveragePercent, 100);

  console.log('PASS: Aggregation rules strictly preserve raw sums and never average percentages');
}

// ---------------------------------------------------------------------------
// 8. COVERAGE CALCULATION
// ---------------------------------------------------------------------------
{
  assert.equal(analyticsRules.calculateCoverage(0, 0), null, '0/0 total topics yields null');
  assert.equal(analyticsRules.calculateCoverage(4, 10), 40, '4/10 topics yields 40%');
  assert.equal(analyticsRules.calculateCoverage(10, 10), 100, '10/10 topics yields 100%');
  assert.equal(analyticsRules.calculateCoverage(0, 10), 0, '0/10 topics yields 0%');
  console.log('PASS: Coverage calculation');
}

// ---------------------------------------------------------------------------
// 9. EXAM EVIDENCE SUMMARY (NO FAKE SCORE)
// ---------------------------------------------------------------------------
{
  const committeeSummary = {
    committeeId: 'c1',
    totalSubjects: 2,
    totalTopics: 50,
    practicedTopics: 35,
    coveragePercent: 70,
    totalQuestions: 400,
    correctQuestions: 300,
    qbankAccuracyPercent: 75,
    linkedCardCount: 120,
    dueCardCount: 15,
    totalReviews: 250,
    successfulReviews: 200,
    memoryRetentionPercent: 80,
    totalStudySeconds: 18000,
    totalFocusSessions: 12,
    needsAttentionTopicCount: 4,
    strongTopicCount: 18,
    inProgressTopicCount: 13,
    unstudiedTopicCount: 15,
    staleTopicCount: 6,
    neverStudiedTopicCount: 15,
  };

  const examEvidence = analyticsRules.summarizeExamEvidence(committeeSummary, 12);

  assert.equal(examEvidence.totalTopics, 50);
  assert.equal(examEvidence.practicedTopics, 35);
  assert.equal(examEvidence.coveragePercent, 70);
  assert.equal(examEvidence.qbankQuestions, 400);
  assert.equal(examEvidence.qbankAccuracyPercent, 75);
  assert.equal(examEvidence.memoryRetentionPercent, 80);
  assert.equal(examEvidence.dueCards, 15);
  assert.equal(examEvidence.needsAttentionTopics, 4);
  assert.equal(examEvidence.staleTopics, 6);
  assert.equal(examEvidence.neverStudiedTopics, 15);
  assert.equal(examEvidence.daysToExam, 12);

  // Assert absence of any fake composite readiness score
  assert.equal('readinessPercent' in examEvidence, false, 'No fake readinessPercent field');
  assert.equal('confidenceScore' in examEvidence, false, 'No fake confidenceScore field');
  assert.equal('masteryPercent' in examEvidence, false, 'No fake masteryPercent field');

  console.log('PASS: Factual multi-dimensional exam evidence summary (zero fake readiness score)');
}

console.log('\n=== ALL PHASE 9 STEP 1 TESTS PASSED ===\n');
