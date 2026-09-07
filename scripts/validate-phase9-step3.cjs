/**
 * MedOS — Phase 9 Step 3 Validation Script
 *
 * Validates the Learning Analytics Priority Engine:
 * 1. Weak Topic qualification (only `needs_attention` qualifies).
 * 2. Multi-reason detection and priority (3 reasons before 2, 2 before 1).
 * 3. Transparent deterministic weak sorting (reasons, due cards, qualified accuracy/retention, older activity, tie-break).
 * 4. Safe null handling (unstudied/small samples are NOT treated as 0% accuracy or 0% retention).
 * 5. Neglected Topic qualification (`never_studied` and `stale`, excluding `recent`; independence from mastery).
 * 6. Neglected Topic priority (never_studied first, then stale oldest-activity first, canonical tie-break).
 * 7. Canonical local calendar day calculation for `daysSinceActive`.
 * 8. Immutability of inputs and safe limit handling.
 * 9. Absolute absence of pseudo-scientific scores, confidence, or pass probabilities.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');

let passed = 0;
function check(name, run) {
  run();
  passed++;
  console.log('PASS ' + name);
}

function load(file, mocks = {}) {
  const code = ts.transpileModule(read(file), {
    fileName: file,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
    },
  }).outputText;
  const module = { exports: {} };
  vm.runInThisContext('(function(require,module,exports,__filename,__dirname){' + code + '\n})', {
    filename: file,
  })(
    (key) => (Object.hasOwn(mocks, key) ? mocks[key] : require(key)),
    module,
    module.exports,
    file,
    path.dirname(file)
  );
  return module.exports;
}

// Load dependencies
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

function makeTopic(overrides = {}) {
  return {
    topicId: 't-default',
    subjectId: 's-default',
    committeeId: 'c-default',
    topicName: 'Default Topic',
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
    ...overrides,
  };
}

console.log('=== PHASE 9 STEP 3: PRIORITY ENGINE VALIDATION ===\n');

check('Weak Qualification: only topics with needs_attention qualify', () => {
  const tUnstudied = makeTopic({ topicId: 't1', topicName: 'Unstudied', masteryStatus: 'unstudied' });
  const tInProgress = makeTopic({ topicId: 't2', topicName: 'In Progress', masteryStatus: 'in_progress', practiced: true, sessionCount: 2 });
  const tStrong = makeTopic({ topicId: 't3', topicName: 'Strong', masteryStatus: 'strong', practiced: true, questionCount: 20, accuracyPercent: 90, reviewCount: 15, retentionPercent: 85 });
  const tWeak = makeTopic({ topicId: 't4', topicName: 'Weak', masteryStatus: 'needs_attention', dueCardCount: 2 });

  const weakList = priorityRules.getWeakTopics([tUnstudied, tInProgress, tStrong, tWeak]);
  assert.equal(weakList.length, 1);
  assert.equal(weakList[0].topicId, 't4');
  assert.equal(weakList[0].topicName, 'Weak');
});

check('Multiple Reasons: topics with multiple failure signals sort before single-reason topics', () => {
  // Topic A: 3 reasons (low Q-Bank accuracy, low Memory retention, due reviews)
  const topicA = makeTopic({
    topicId: 't-multi',
    topicName: 'Topic A Multi',
    masteryStatus: 'needs_attention',
    questionCount: 20,
    correctCount: 8,
    accuracyPercent: 40, // < 60% with >= 10 questions => low_qbank_accuracy
    reviewCount: 10,
    successfulReviewCount: 4,
    retentionPercent: 40, // < 70% with >= 5 reviews => low_memory_retention
    dueCardCount: 3, // > 0 => due_reviews
  });

  // Topic B: 1 reason (low Q-Bank accuracy only, no due cards, 0 reviews)
  const topicB = makeTopic({
    topicId: 't-single',
    topicName: 'Topic B Single',
    masteryStatus: 'needs_attention',
    questionCount: 20,
    correctCount: 8,
    accuracyPercent: 40,
    reviewCount: 0,
    dueCardCount: 0,
  });

  const result = priorityRules.getWeakTopics([topicB, topicA]);
  assert.equal(result.length, 2);
  assert.equal(result[0].topicId, 't-multi');
  assert.equal(result[0].reasons.length, 3);
  assert.deepEqual(result[0].reasons, ['low_qbank_accuracy', 'low_memory_retention', 'due_reviews']);
  assert.equal(result[1].topicId, 't-single');
  assert.equal(result[1].reasons.length, 1);
  assert.deepEqual(result[1].reasons, ['low_qbank_accuracy']);
});

check('Null & Sample-Size Handling: small/null samples are not treated as 0% failure', () => {
  // Topic A: 15 questions with 45% accuracy (sample-size qualified weakness, 1 reason)
  const topicA = makeTopic({
    topicId: 't-qbank-weak',
    topicName: 'Topic A',
    masteryStatus: 'needs_attention',
    questionCount: 15,
    accuracyPercent: 45,
    reviewCount: 0,
    dueCardCount: 0,
  });

  // Topic B: 2 questions with 0% accuracy (NOT sample-size qualified for Q-Bank; has due reviews instead, 1 reason)
  const topicB = makeTopic({
    topicId: 't-due-weak',
    topicName: 'Topic B',
    masteryStatus: 'needs_attention',
    questionCount: 2,
    accuracyPercent: 0,
    reviewCount: 0,
    dueCardCount: 1, // 1 reason: due_reviews
  });

  // Since Topic B has due cards, it gets due-card priority;
  // but let's test comparing Q-Bank accuracy when due-card status is equal:
  // Topic C: 15 questions with 50% accuracy (qualified, no due cards, 1 reason)
  const topicC = makeTopic({
    topicId: 't-qualified-50',
    topicName: 'Topic C',
    masteryStatus: 'needs_attention',
    questionCount: 15,
    accuracyPercent: 50,
    reviewCount: 0,
    dueCardCount: 0,
  });

  // Topic D: 3 questions with 0% accuracy, but flagged because of Memory (6 reviews, 40% retention, 1 reason)
  const topicD = makeTopic({
    topicId: 't-unqualified-qbank',
    topicName: 'Topic D',
    masteryStatus: 'needs_attention',
    questionCount: 3,
    accuracyPercent: 0, // 0%, but questionCount < 10 so NOT qualified
    reviewCount: 6,
    retentionPercent: 40,
    dueCardCount: 0,
  });

  // When comparing Topic C (qualified 50%) vs Topic D (unqualified Q-Bank, but qualified Memory):
  // Topic C has a qualified Q-Bank weakness, so it precedes Topic D in Q-Bank evaluation,
  // proving that Topic D's 0% was NOT treated as worse than 50%!
  const sorted = priorityRules.getWeakTopics([topicD, topicC]);
  assert.equal(sorted[0].topicId, 't-qualified-50');
  assert.equal(sorted[1].topicId, 't-unqualified-qbank');
});

check('Deterministic Weak Sorting: verifies all hierarchy tiers', () => {
  // Tier 1: Multiple reasons beats single reason
  const t3Reasons = makeTopic({
    topicId: 't-3r',
    topicName: 'Zzz 3 Reasons',
    masteryStatus: 'needs_attention',
    questionCount: 15, accuracyPercent: 50,
    reviewCount: 10, retentionPercent: 50,
    dueCardCount: 2,
  });

  // Tier 2: Due reviews present beats no due reviews (within same reason count)
  const tDue = makeTopic({
    topicId: 't-due',
    topicName: 'Zzz Due Only',
    masteryStatus: 'needs_attention',
    dueCardCount: 5,
  });

  const tNoDueHighAccuracy = makeTopic({
    topicId: 't-nodue-high',
    topicName: 'Zzz No Due 55%',
    masteryStatus: 'needs_attention',
    questionCount: 15, accuracyPercent: 55,
    dueCardCount: 0,
  });

  const tNoDueLowAccuracy = makeTopic({
    topicId: 't-nodue-low',
    topicName: 'Zzz No Due 30%',
    masteryStatus: 'needs_attention',
    questionCount: 15, accuracyPercent: 30,
    dueCardCount: 0,
  });

  // Tier 3: Lower Q-Bank accuracy beats higher Q-Bank accuracy
  const orderQBank = priorityRules.getWeakTopics([tNoDueHighAccuracy, tNoDueLowAccuracy]);
  assert.equal(orderQBank[0].topicId, 't-nodue-low');
  assert.equal(orderQBank[1].topicId, 't-nodue-high');

  // Tier 4: Lower Memory retention beats higher retention
  const tLowRetention = makeTopic({
    topicId: 't-ret-30',
    topicName: 'Zzz Retention 30%',
    masteryStatus: 'needs_attention',
    reviewCount: 10, retentionPercent: 30,
    dueCardCount: 0,
  });
  const tHighRetention = makeTopic({
    topicId: 't-ret-60',
    topicName: 'Zzz Retention 60%',
    masteryStatus: 'needs_attention',
    reviewCount: 10, retentionPercent: 60,
    dueCardCount: 0,
  });
  const orderRet = priorityRules.getWeakTopics([tHighRetention, tLowRetention]);
  assert.equal(orderRet[0].topicId, 't-ret-30');
  assert.equal(orderRet[1].topicId, 't-ret-60');

  // Tier 5: Older activity beats newer activity
  const tOld = makeTopic({
    topicId: 't-old',
    topicName: 'Topic Same',
    masteryStatus: 'needs_attention',
    dueCardCount: 1,
    lastActiveAt: 1000,
  });
  const tNew = makeTopic({
    topicId: 't-new',
    topicName: 'Topic Same',
    masteryStatus: 'needs_attention',
    dueCardCount: 1,
    lastActiveAt: 5000,
  });
  const orderAge = priorityRules.getWeakTopics([tNew, tOld]);
  assert.equal(orderAge[0].topicId, 't-old');
  assert.equal(orderAge[1].topicId, 't-new');

  // Tier 6: Deterministic tie-break by name then ID
  const tNameA = makeTopic({ topicId: 'id-2', topicName: 'Alpha', masteryStatus: 'needs_attention', dueCardCount: 1, lastActiveAt: 1000 });
  const tNameB = makeTopic({ topicId: 'id-1', topicName: 'Beta', masteryStatus: 'needs_attention', dueCardCount: 1, lastActiveAt: 1000 });
  const orderName = priorityRules.getWeakTopics([tNameB, tNameA]);
  assert.equal(orderName[0].topicId, 'id-2'); // 'Alpha' comes before 'Beta'

  // Full composite tier check
  const fullOrder = priorityRules.getWeakTopics([tNoDueLowAccuracy, tDue, t3Reasons]);
  assert.equal(fullOrder[0].topicId, 't-3r'); // 3 reasons first
  assert.equal(fullOrder[1].topicId, 't-due'); // due reviews present
  assert.equal(fullOrder[2].topicId, 't-nodue-low'); // no due reviews
});

check('Neglect Qualification: never_studied and stale included; recent excluded; independent of mastery', () => {
  const tNever = makeTopic({ topicId: 't-never', topicName: 'Never', neglectStatus: 'never_studied', masteryStatus: 'unstudied', lastActiveAt: null });
  const tStaleWeak = makeTopic({ topicId: 't-stale-weak', topicName: 'Stale Weak', neglectStatus: 'stale', masteryStatus: 'needs_attention', lastActiveAt: 100000 });
  const tStaleStrong = makeTopic({ topicId: 't-stale-strong', topicName: 'Stale Strong', neglectStatus: 'stale', masteryStatus: 'strong', lastActiveAt: 200000 });
  const tRecent = makeTopic({ topicId: 't-recent', topicName: 'Recent', neglectStatus: 'recent', masteryStatus: 'in_progress', lastActiveAt: 900000 });

  const result = priorityRules.getNeglectedTopics([tRecent, tStaleStrong, tNever, tStaleWeak]);
  assert.equal(result.length, 3);
  const ids = result.map((r) => r.topicId);
  assert.ok(!ids.includes('t-recent'), 'Recent topics must be excluded');
  assert.ok(ids.includes('t-stale-strong'), 'Strong topics that are stale must be included');

  // Priority: never_studied first, then stale oldest-activity first
  assert.equal(result[0].topicId, 't-never');
  assert.equal(result[1].topicId, 't-stale-weak'); // 100000 is older than 200000
  assert.equal(result[2].topicId, 't-stale-strong');
});

check('Neglect Days Calculation: daysSinceActive respects local calendar days and is null for never_studied', () => {
  const now = new Date(2026, 8, 20, 12, 0).getTime(); // Sep 20, 2026
  const past20Days = new Date(2026, 7, 31, 10, 0).getTime(); // Aug 31, 2026 (20 days prior)

  const tNever = makeTopic({ topicId: 't-never', neglectStatus: 'never_studied', lastActiveAt: null });
  const tStale = makeTopic({ topicId: 't-stale', neglectStatus: 'stale', lastActiveAt: past20Days });

  const result = priorityRules.getNeglectedTopics([tNever, tStale], undefined, now);
  assert.equal(result[0].daysSinceActive, null, 'never_studied daysSinceActive must be null');
  assert.equal(result[1].daysSinceActive, 20, 'stale daysSinceActive must match calendar day difference');
});

check('Limits & Boundary Conditions: handles limits, empty inputs, and invalid numbers safely', () => {
  const topics = [
    makeTopic({ topicId: 't1', topicName: 'A', masteryStatus: 'needs_attention', dueCardCount: 1 }),
    makeTopic({ topicId: 't2', topicName: 'B', masteryStatus: 'needs_attention', dueCardCount: 1 }),
    makeTopic({ topicId: 't3', topicName: 'C', masteryStatus: 'needs_attention', dueCardCount: 1 }),
    makeTopic({ topicId: 't4', topicName: 'D', masteryStatus: 'needs_attention', dueCardCount: 1 }),
  ];

  // Limit = 2
  assert.equal(priorityRules.getWeakTopics(topics, 2).length, 2);
  assert.equal(priorityRules.getNeglectedTopics(topics, 2).length, 2);

  // Limit = undefined
  assert.equal(priorityRules.getWeakTopics(topics).length, 4);

  // Limit <= 0 or invalid
  assert.equal(priorityRules.getWeakTopics(topics, 0).length, 0);
  assert.equal(priorityRules.getWeakTopics(topics, -5).length, 0);
  assert.equal(priorityRules.getWeakTopics(topics, NaN).length, 0);

  // Empty array or non-array
  assert.deepEqual(priorityRules.getWeakTopics([]), []);
  assert.deepEqual(priorityRules.getWeakTopics(null), []);
  assert.deepEqual(priorityRules.getNeglectedTopics([]), []);
  assert.deepEqual(priorityRules.getNeglectedTopics(undefined), []);
});

check('Immutability: does not mutate source topics array', () => {
  const topics = [
    makeTopic({ topicId: 't-b', topicName: 'B', masteryStatus: 'needs_attention', dueCardCount: 1 }),
    makeTopic({ topicId: 't-a', topicName: 'A', masteryStatus: 'needs_attention', dueCardCount: 1 }),
  ];
  const copy = [...topics];

  priorityRules.getWeakTopics(topics);
  assert.deepEqual(topics, copy, 'Source topics array must not be reordered or mutated');

  priorityRules.getNeglectedTopics(topics);
  assert.deepEqual(topics, copy, 'Source topics array must not be mutated by getNeglectedTopics');
});

check('No Fake Scores: items contain strictly factual fields and zero prediction scores', () => {
  const t = makeTopic({
    topicId: 't-eval',
    topicName: 'Eval Topic',
    masteryStatus: 'needs_attention',
    neglectStatus: 'stale',
    dueCardCount: 2,
    lastActiveAt: 1000,
  });

  const weak = priorityRules.getWeakTopics([t])[0];
  const neglected = priorityRules.getNeglectedTopics([t])[0];

  const forbiddenKeys = [
    'score', 'readiness', 'probability', 'passRate', 'confidence',
    'predictedScore', 'weaknessScore', 'neglectScore', 'weight',
  ];

  for (const key of forbiddenKeys) {
    assert.equal(key in weak, false, `WeakTopicItem must not contain forbidden key '${key}'`);
    assert.equal(key in neglected, false, `NeglectedTopicItem must not contain forbidden key '${key}'`);
  }
});

check('Committee Helpers: getCommitteeWeakTopics and getCommitteeNeglectedTopics produce identical results', () => {
  const topics = [
    makeTopic({ topicId: 't1', topicName: 'T1', masteryStatus: 'needs_attention', dueCardCount: 1 }),
    makeTopic({ topicId: 't2', topicName: 'T2', neglectStatus: 'stale', lastActiveAt: 1000 }),
  ];

  assert.deepEqual(
    priorityRules.getCommitteeWeakTopics(topics),
    priorityRules.getWeakTopics(topics)
  );
  assert.deepEqual(
    priorityRules.getCommitteeNeglectedTopics(topics),
    priorityRules.getNeglectedTopics(topics)
  );
});

console.log(`\n=== ALL ${passed} PHASE 9 STEP 3 TESTS PASSED ===\n`);
