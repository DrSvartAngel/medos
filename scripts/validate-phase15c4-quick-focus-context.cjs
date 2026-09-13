const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=== PHASE 15C.4: TODAY QUICK FOCUS & EDITABLE SESSION CONTEXT VALIDATION ===\n');

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

test('1. focusRepo.updateAcademicContext exists and validates hierarchy', () => {
  const focusRepoSrc = fs.readFileSync(path.join(root, 'db/repositories/focusRepo.ts'), 'utf8');
  assert.ok(focusRepoSrc.includes('updateAcademicContext('), 'focusRepo must define updateAcademicContext');
  assert.ok(focusRepoSrc.includes('getTopicContext('), 'focusRepo must look up topic context');
  assert.ok(focusRepoSrc.includes('getSubjectContext('), 'focusRepo must look up subject context');
  assert.ok(focusRepoSrc.includes('Inconsistent hierarchy'), 'focusRepo must reject inconsistent hierarchy');
  assert.ok(focusRepoSrc.includes('UPDATE focus_sessions'), 'focusRepo must run UPDATE query');
  assert.ok(
    !focusRepoSrc.match(/UPDATE focus_sessions\s+SET[^;]*actual_duration_sec/),
    'updateAcademicContext must not modify actual_duration_sec'
  );
  assert.ok(
    !focusRepoSrc.match(/UPDATE focus_sessions\s+SET[^;]*started_at/),
    'updateAcademicContext must not modify started_at'
  );
  assert.ok(
    !focusRepoSrc.match(/UPDATE focus_sessions\s+SET[^;]*completed/),
    'updateAcademicContext must not modify completed'
  );
});

test('2. Historical safety preserved: no automatic backfill in migrations', () => {
  const migrationsSrc = fs.readFileSync(path.join(root, 'db/migrations.ts'), 'utf8');
  assert.ok(
    !migrationsSrc.match(/UPDATE focus_sessions SET subject_id\s*=/i),
    'Strictly NO automatic backfill of focus_sessions.subject_id'
  );
  assert.ok(
    !migrationsSrc.match(/UPDATE focus_sessions SET topic_id\s*=/i),
    'Strictly NO automatic backfill of focus_sessions.topic_id'
  );
});

test('3. AcademicContextSelector supports compact hero mode', () => {
  const selectorSrc = fs.readFileSync(path.join(root, 'components/curriculum/AcademicContextSelector.tsx'), 'utf8');
  assert.ok(selectorSrc.includes('compact?: boolean;'), 'AcademicContextSelector must have compact prop');
  assert.ok(selectorSrc.includes('breadcrumbText'), 'AcademicContextSelector must compute breadcrumb text');
  assert.ok(selectorSrc.includes('compactTrigger'), 'AcademicContextSelector must style compact trigger');
});

test('4. QuickStartCard embeds compact AcademicContextSelector inside hero', () => {
  const cardSrc = fs.readFileSync(path.join(root, 'components/dashboard/QuickStartCard.tsx'), 'utf8');
  assert.ok(cardSrc.includes('AcademicContextSelector'), 'QuickStartCard must import AcademicContextSelector');
  assert.ok(cardSrc.includes('compact'), 'QuickStartCard must render AcademicContextSelector with compact');
  assert.ok(cardSrc.includes('academicContext?: AcademicContextValue;'), 'QuickStartCardProps must accept academicContext');
  assert.ok(cardSrc.includes('onAcademicContextChange?:'), 'QuickStartCardProps must accept onAcademicContextChange');
});

test('5. TODAY screen wires academic context to QuickStartCard and timer start', () => {
  const todaySrc = fs.readFileSync(path.join(root, 'app/(tabs)/index.tsx'), 'utf8');
  assert.ok(todaySrc.includes('selectedCommitteeId'), 'TODAY must select selectedCommitteeId');
  assert.ok(todaySrc.includes('selectedSubjectId'), 'TODAY must select selectedSubjectId');
  assert.ok(todaySrc.includes('selectedTopicId'), 'TODAY must select selectedTopicId');
  assert.ok(todaySrc.includes('onAcademicContextChange='), 'TODAY must pass onAcademicContextChange to QuickStartCard');
  assert.ok(todaySrc.includes('academicContext='), 'TODAY must pass academicContext to QuickStartCard');
});

test('6. SessionHistoryList renders context breadcrumb and edit context action', () => {
  const historySrc = fs.readFileSync(path.join(root, 'components/focus/SessionHistoryList.tsx'), 'utf8');
  assert.ok(historySrc.includes('resolveBreadcrumb'), 'SessionHistoryList must resolve academic breadcrumb');
  assert.ok(historySrc.includes('focusRepo.updateAcademicContext'), 'SessionHistoryList must call updateAcademicContext');
  assert.ok(historySrc.includes('editContext'), 'SessionHistoryList must include edit context translation');
  assert.ok(historySrc.includes('AcademicContextSelector'), 'SessionHistoryList must use AcademicContextSelector for editing');
});

test('7. i18n contains Turkish and English translations for edit context and select context', () => {
  const trSrc = fs.readFileSync(path.join(root, 'i18n/tr.ts'), 'utf8');
  const enSrc = fs.readFileSync(path.join(root, 'i18n/en.ts'), 'utf8');
  assert.ok(trSrc.includes("editContext: 'Bağlamı düzenle'"), 'tr.ts must define editContext');
  assert.ok(enSrc.includes("editContext: 'Edit context'"), 'en.ts must define editContext');
  assert.ok(trSrc.includes("selectContext: 'Ders / Konu seç'"), 'tr.ts must define selectContext');
  assert.ok(enSrc.includes("selectContext: 'Select Subject / Topic'"), 'en.ts must define selectContext');
});

console.log(`\n============================================================`);
console.log(`Phase 15C.4 Validation: ${passed}/${passed + failed} passed, ${failed} failed`);
console.log(`============================================================\n`);

if (failed > 0) {
  process.exit(1);
}
