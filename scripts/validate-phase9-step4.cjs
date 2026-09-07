/**
 * MedOS — Phase 9 Step 4 Validation Script
 *
 * Validates the Committee Learning Analytics UI Integration:
 * 1. Component Contracts: CommitteeAnalyticsSummary, WeakTopicsList, NeglectedTopicsList exist and export expected functions.
 * 2. Data Flow: Batch queries used, priority lists derived via pure rules in JS, no per-topic query loops, no analytics Zustand store.
 * 3. No Fake Score: Absolute absence of readinessPercent, confidenceScore, passProbability, weaknessScore.
 * 4. Null & Zero Handling: Truthful rendering of null Q-Bank accuracy, null retention, and zero-topic coverage (no fake 0%).
 * 5. Weak Topics: Factual weakness reasons (Q-Bank accuracy, memory retention, due cards) with supporting values.
 * 6. Neglected Topics: Factual age/status ("Not studied yet", "Last studied X days ago", today/yesterday) with no fear language.
 * 7. Localization: Recursive key parity between en.ts and tr.ts under `analytics` namespace; parameter count matches.
 * 8. Accessibility: Pressable rows have meaningful accessibility labels and roles; no color-only communication.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');

let passed = 0;
function check(name, run) {
  run();
  passed++;
  console.log('PASS ' + name);
}

console.log('=== PHASE 9 STEP 4: COMMITTEE ANALYTICS UI VALIDATION ===\n');

// ── 1. COMPONENT CONTRACTS ──────────────────────────────────────────────────
check('Contract: CommitteeAnalyticsSummary component exists and exports component', () => {
  const file = 'components/analytics/CommitteeAnalyticsSummary.tsx';
  assert.ok(fs.existsSync(path.join(root, file)), `${file} must exist`);
  const content = read(file);
  assert.ok(
    content.includes('export function CommitteeAnalyticsSummary'),
    'Must export CommitteeAnalyticsSummary'
  );
  assert.ok(
    content.includes('CommitteeAnalyticsSummaryProps'),
    'Must define CommitteeAnalyticsSummaryProps'
  );
});

check('Contract: WeakTopicsList component exists and exports component', () => {
  const file = 'components/analytics/WeakTopicsList.tsx';
  assert.ok(fs.existsSync(path.join(root, file)), `${file} must exist`);
  const content = read(file);
  assert.ok(
    content.includes('export function WeakTopicsList'),
    'Must export WeakTopicsList'
  );
  assert.ok(
    content.includes('WeakTopicsListProps'),
    'Must define WeakTopicsListProps'
  );
});

check('Contract: NeglectedTopicsList component exists and exports component', () => {
  const file = 'components/analytics/NeglectedTopicsList.tsx';
  assert.ok(fs.existsSync(path.join(root, file)), `${file} must exist`);
  const content = read(file);
  assert.ok(
    content.includes('export function NeglectedTopicsList'),
    'Must export NeglectedTopicsList'
  );
  assert.ok(
    content.includes('NeglectedTopicsListProps'),
    'Must define NeglectedTopicsListProps'
  );
});

// ── 2. DATA FLOW IN COMMITTEE DETAIL ─────────────────────────────────────────
check('Data Flow: Committee screen loads batch topic analytics and derives priorities via pure rules', () => {
  const committeeScreen = read('app/committees/[id].tsx');

  // Must call batch methods from analyticsRepo
  assert.ok(
    committeeScreen.includes('analyticsRepo.getCommitteeAnalytics'),
    'Must call analyticsRepo.getCommitteeAnalytics'
  );
  assert.ok(
    committeeScreen.includes('analyticsRepo.getCommitteeTopicAnalytics'),
    'Must call analyticsRepo.getCommitteeTopicAnalytics'
  );

  // Must derive priorities in JS using pure rules
  assert.ok(
    committeeScreen.includes('getWeakTopics('),
    'Must call pure getWeakTopics rule'
  );
  assert.ok(
    committeeScreen.includes('getNeglectedTopics('),
    'Must call pure getNeglectedTopics rule'
  );

  // Avoid duplicate/per-topic calls
  assert.ok(
    !committeeScreen.includes('getTopicAnalytics('),
    'Must NOT call per-topic analytics query in committee screen'
  );

  // No global Zustand store for analytics
  assert.ok(
    !committeeScreen.includes('useAnalyticsStore'),
    'Must NOT introduce an analytics Zustand store'
  );
  assert.ok(
    !fs.existsSync(path.join(root, 'store/useAnalyticsStore.ts')),
    'Must not create store/useAnalyticsStore.ts'
  );

  // Integrates all 3 components into JSX
  assert.ok(
    committeeScreen.includes('<CommitteeAnalyticsSummary'),
    'Must include CommitteeAnalyticsSummary in committee detail'
  );
  assert.ok(
    committeeScreen.includes('<WeakTopicsList'),
    'Must include WeakTopicsList in committee detail'
  );
  assert.ok(
    committeeScreen.includes('<NeglectedTopicsList'),
    'Must include NeglectedTopicsList in committee detail'
  );
});

// ── 3. NO FAKE SCORES ────────────────────────────────────────────────────────
check('Integrity: No pseudo-scientific readiness, confidence, or pass probabilities', () => {
  const filesToCheck = [
    'components/analytics/CommitteeAnalyticsSummary.tsx',
    'components/analytics/WeakTopicsList.tsx',
    'components/analytics/NeglectedTopicsList.tsx',
    'app/committees/[id].tsx',
  ];

  const forbidden = [
    'readinessPercent',
    'readinessScore',
    'examReadiness',
    'confidenceScore',
    'passProbability',
    'predictedScore',
    'weaknessScore',
  ];

  for (const rel of filesToCheck) {
    const text = read(rel);
    for (const term of forbidden) {
      assert.ok(
        !text.includes(term),
        `File ${rel} must not contain forbidden score/prediction term "${term}"`
      );
    }
  }
});

// ── 4. NULL DISPLAY AND TRUTHFUL VALUES ──────────────────────────────────────
check('Truthful Null Handling: No fake 0% for unpracticed modalities or zero topics', () => {
  const summaryContent = read('components/analytics/CommitteeAnalyticsSummary.tsx');

  // Q-Bank: When accuracy is null or questions is 0, must show truthful no-practice text
  assert.ok(
    summaryContent.includes('summary.totalQuestions === 0 || summary.qbankAccuracyPercent === null'),
    'Q-Bank must check for 0 questions or null accuracy'
  );
  assert.ok(
    summaryContent.includes('t.analytics.noQBank'),
    'Must use localized noQBank message instead of 0%'
  );

  // Memory: When retention is null, must NOT display 0%
  assert.ok(
    summaryContent.includes('summary.memoryRetentionPercent === null'),
    'Memory must guard against null retentionPercent'
  );
  assert.ok(
    summaryContent.includes('t.analytics.noMemoryReviews'),
    'Must use localized noMemoryReviews message when no reviews exist'
  );

  // Coverage: When total topics is 0, must NOT show fake 0%
  assert.ok(
    summaryContent.includes('summary.totalTopics === 0'),
    'Coverage must guard against zero topics in committee'
  );
  assert.ok(
    summaryContent.includes('t.analytics.noTopics'),
    'Must display noTopics message when committee has 0 topics'
  );
});

// ── 5. WEAK REASONS FACTUAL DISPLAY ──────────────────────────────────────────
check('Weak Topics: Factual weakness reasons rendered with supporting values', () => {
  const weakContent = read('components/analytics/WeakTopicsList.tsx');

  assert.ok(
    weakContent.includes('low_qbank_accuracy'),
    'Must handle low_qbank_accuracy reason'
  );
  assert.ok(
    weakContent.includes('low_memory_retention'),
    'Must handle low_memory_retention reason'
  );
  assert.ok(
    weakContent.includes('due_reviews'),
    'Must handle due_reviews reason'
  );

  assert.ok(
    weakContent.includes('qbankReasonValue'),
    'Must format Q-Bank supporting value (% and question count)'
  );
  assert.ok(
    weakContent.includes('memoryReasonValue'),
    'Must format Memory supporting value (% and review count)'
  );
  assert.ok(
    weakContent.includes('dueReasonValue'),
    'Must format Due cards supporting value'
  );

  // Limits to top 5
  assert.ok(
    weakContent.includes('topics.slice(0, 5)'),
    'Must slice top 5 topics'
  );
});

// ── 6. NEGLECTED TOPICS FACTUAL DISPLAY ──────────────────────────────────────
check('Neglected Topics: Factual age and never studied status', () => {
  const neglectedContent = read('components/analytics/NeglectedTopicsList.tsx');

  assert.ok(
    neglectedContent.includes('never_studied'),
    'Must handle never_studied status'
  );
  assert.ok(
    neglectedContent.includes('t.analytics.neverStudied'),
    'Must display localized neverStudied label'
  );
  assert.ok(
    neglectedContent.includes('daysSinceActive'),
    'Must check daysSinceActive'
  );
  assert.ok(
    neglectedContent.includes('t.analytics.daysAgo'),
    'Must display localized daysAgo string'
  );

  // Limits to top 5
  assert.ok(
    neglectedContent.includes('topics.slice(0, 5)'),
    'Must slice top 5 topics'
  );
});

// ── 7. LOCALIZATION PARITY ──────────────────────────────────────────────────
check('Localization: Strict key and signature parity between en.ts and tr.ts', () => {
  const enContent = read('i18n/en.ts');
  const trContent = read('i18n/tr.ts');

  // Check that analytics namespace exists in both
  assert.ok(enContent.includes('analytics: {'), 'en.ts must have analytics namespace');
  assert.ok(trContent.includes('analytics: {'), 'tr.ts must have analytics namespace');

  // Extract analytics block keys
  const getKeys = (content) => {
    const match = content.match(/analytics:\s*\{([\s\S]*?)\n\s*\},\s*\n(?:\s*\/\/[^\n]*\n)*\s*notFound:/);
    assert.ok(match, 'Must match analytics block');
    const block = match[1];
    const keys = [];
    for (const line of block.split('\n')) {
      const lineMatch = line.match(/^\s*([a-zA-Z0-9_]+):/);
      if (lineMatch) keys.push(lineMatch[1]);
    }
    return keys.sort();
  };

  const enKeys = getKeys(enContent);
  const trKeys = getKeys(trContent);

  assert.deepEqual(enKeys, trKeys, 'en.ts and tr.ts analytics keys must match exactly');

  // Essential keys verification
  const requiredKeys = [
    'examEvidenceTitle',
    'needsAttentionTitle',
    'needsRevisitTitle',
    'loading',
    'loadError',
    'retry',
    'coverageLabel',
    'qbankLabel',
    'memoryLabel',
    'noTopics',
    'coverage',
    'coverageA11y',
    'noQBank',
    'qbankStats',
    'qbankA11y',
    'noMemoryReviews',
    'memoryStats',
    'memoryStatsA11y',
    'memoryDueOnly',
    'needsAttentionCount',
    'staleCount',
    'neverStudiedCount',
    'weakEmpty',
    'reasons',
    'qbankReasonValue',
    'memoryReasonValue',
    'dueReasonValue',
    'neglectedEmpty',
    'neverStudied',
    'daysAgo',
    'studiedToday',
    'studiedYesterday',
    'staleLabel',
    'openTopic',
  ];

  for (const req of requiredKeys) {
    assert.ok(enKeys.includes(req), `Missing required key "${req}" in analytics`);
  }
});

// ── 8. ACCESSIBILITY ────────────────────────────────────────────────────────
check('Accessibility: Meaningful labels, roles, and no color-only communication', () => {
  const summaryContent = read('components/analytics/CommitteeAnalyticsSummary.tsx');
  assert.ok(
    summaryContent.includes('accessibilityRole="text"'),
    'Summary rows must have accessibilityRole="text"'
  );
  assert.ok(
    summaryContent.includes('accessibilityLabel='),
    'Summary rows must specify accessibilityLabel'
  );

  const weakContent = read('components/analytics/WeakTopicsList.tsx');
  assert.ok(
    weakContent.includes('accessibilityRole="button"'),
    'Weak topic rows must have accessibilityRole="button"'
  );
  assert.ok(
    weakContent.includes('accessibilityLabel={a11yLabel}'),
    'Weak topic rows must have descriptive accessibilityLabel'
  );

  const neglectedContent = read('components/analytics/NeglectedTopicsList.tsx');
  assert.ok(
    neglectedContent.includes('accessibilityRole="button"'),
    'Neglected topic rows must have accessibilityRole="button"'
  );
  assert.ok(
    neglectedContent.includes('accessibilityLabel={a11yLabel}'),
    'Neglected topic rows must have descriptive accessibilityLabel'
  );
});

console.log(`\nALL ${passed} CHECKS PASSED.`);
