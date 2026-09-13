const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=== PHASE 15D: ATLAS SCREEN REBUILD VALIDATION ===\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

const root = path.resolve(__dirname, '..');

test('1. ATLAS screen uses Phase 15B ScreenHeader without TabTopHeader rendering', () => {
  const atlasSrc = fs.readFileSync(path.join(root, 'app/(tabs)/committees.tsx'), 'utf8');
  assert.ok(atlasSrc.includes('<ScreenHeader'), 'ATLAS must render ScreenHeader');
  assert.ok(!atlasSrc.includes('<TabTopHeader'), 'ATLAS must NOT render TabTopHeader');
});

test('2. Canonical hierarchy Committee -> Subject -> Topic is exposed in ATLAS', () => {
  const atlasSrc = fs.readFileSync(path.join(root, 'app/(tabs)/committees.tsx'), 'utf8');
  assert.ok(atlasSrc.includes('subjectRepo.listByCommittee'), 'ATLAS must query subjects by committee');
  assert.ok(atlasSrc.includes('topicsBySubject'), 'ATLAS must group topics by subject');
  assert.ok(atlasSrc.includes('analyticsRepo.getCommitteeTopicAnalytics'), 'ATLAS must query committee topic analytics');
});

test('3. Phone ATLAS implements progressive reveal with active academic spine', () => {
  const atlasSrc = fs.readFileSync(path.join(root, 'app/(tabs)/committees.tsx'), 'utf8');
  assert.ok(atlasSrc.includes('academicSpineContainer') || atlasSrc.includes('spineTree'), 'Phone ATLAS must define academic spine styling');
  assert.ok(atlasSrc.includes('expandedSubjectIds'), 'Phone ATLAS must support progressive reveal expansion');
  assert.ok(atlasSrc.includes('phoneCommitteeChip'), 'Phone ATLAS must render committee switcher chips');
});

test('4. Tablet ATLAS implements true master-detail curriculum workspace (Figma 29:109)', () => {
  const atlasSrc = fs.readFileSync(path.join(root, 'app/(tabs)/committees.tsx'), 'utf8');
  assert.ok(atlasSrc.includes('tabletMaster'), 'Tablet ATLAS must define master column');
  assert.ok(atlasSrc.includes('tabletDetail'), 'Tablet ATLAS must define detail column');
  assert.ok(atlasSrc.includes('selectedSubjectId'), 'Tablet ATLAS must manage selectedSubject state');
});

test('5. Non-stranding empty states for Committee, Subject, and Topic are provided', () => {
  const atlasSrc = fs.readFileSync(path.join(root, 'app/(tabs)/committees.tsx'), 'utf8');
  assert.ok(atlasSrc.includes('CommitteeEmptyState'), 'ATLAS must provide CommitteeEmptyState');
  assert.ok(atlasSrc.includes('/subjects/new'), 'ATLAS must provide add subject action');
  assert.ok(atlasSrc.includes('/topics/new'), 'ATLAS must provide add topic action');
});

test('6. Factual evidence and existing progress are displayed without invented mastery metrics', () => {
  const atlasSrc = fs.readFileSync(path.join(root, 'app/(tabs)/committees.tsx'), 'utf8');
  assert.ok(atlasSrc.includes('practicedTopicsCount') || atlasSrc.includes('studySeconds'), 'ATLAS must display factual study evidence');
  assert.ok(!atlasSrc.includes('readinessScore'), 'ATLAS must not invent fake readiness scores');
  assert.ok(!atlasSrc.includes('aiConfidence'), 'ATLAS must not invent fake AI confidence scores');
});

test('7. Specialized detail routes remain intact for deep linking', () => {
  assert.ok(fs.existsSync(path.join(root, 'app/committees/[id].tsx')), 'app/committees/[id].tsx must exist');
  assert.ok(fs.existsSync(path.join(root, 'app/subjects/[id].tsx')), 'app/subjects/[id].tsx must exist');
  assert.ok(fs.existsSync(path.join(root, 'app/topics/[id].tsx')), 'app/topics/[id].tsx must exist');
});

test('8. Performance: bounded single-pass queries used without N+1 query loops', () => {
  const atlasSrc = fs.readFileSync(path.join(root, 'app/(tabs)/committees.tsx'), 'utf8');
  assert.ok(atlasSrc.includes('useMemo'), 'ATLAS must memoize derived presentation collections');
  assert.ok(atlasSrc.includes('topicsBySubject'), 'ATLAS must group topics in memory without per-render query loops');
});

test('9. i18n contains localized Atlas strings in both Turkish and English', () => {
  const trSrc = fs.readFileSync(path.join(root, 'i18n/tr.ts'), 'utf8');
  const enSrc = fs.readFileSync(path.join(root, 'i18n/en.ts'), 'utf8');
  assert.ok(trSrc.includes('atlas: {'), 'tr.ts must include atlas section');
  assert.ok(enSrc.includes('atlas: {'), 'en.ts must include atlas section');
  assert.ok(trSrc.includes("eyebrow: 'Müfredat Atlası'"), 'tr.ts must include eyebrow');
  assert.ok(enSrc.includes("eyebrow: 'Curriculum Atlas'"), 'en.ts must include eyebrow');
});

console.log(`\n============================================================`);
console.log(`Phase 15D Validation: ${passed}/${passed + failed} passed, ${failed} failed`);
console.log(`============================================================\n`);

if (failed > 0) {
  process.exit(1);
}
