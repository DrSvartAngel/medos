// MedOS — Phase 15D.1 Validation Suite: Tablet Responsive + Overflow Correction
// Validates tablet workspace width, DailyStateCard safe wrapping, QuickStartCard secondary actions,
// TODAY 2-pane balanced layout, ATLAS master bounded width and metadata wrapping.

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');

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

console.log('=== PHASE 15D.1: TABLET RESPONSIVE & OVERFLOW CORRECTION VALIDATION ===\n');

test('1. ContentWidths defines workspace width (1200dp) while preserving content and wide', () => {
  const layoutSrc = read('theme/layout.ts');
  assert.ok(layoutSrc.includes('workspace: 1200'), 'ContentWidths must define workspace: 1200');
  assert.ok(layoutSrc.includes('content: 720'), 'ContentWidths must preserve content: 720');
  assert.ok(layoutSrc.includes('wide: 900'), 'ContentWidths must preserve wide: 900');
});

test('2. useResponsive exposes workspace width for largeTablet and landscape tablet', () => {
  const respSrc = read('hooks/useResponsive.ts');
  assert.ok(
    respSrc.includes('isLargeTablet ? ContentWidths.workspace') ||
    respSrc.includes('ContentWidths.workspace'),
    'useResponsive must resolve workspace width for large tablet viewports'
  );
});

test('3. PageContainer supports workspace role and resolves default tablet width responsively', () => {
  const pageContainerSrc = read('components/layout/PageContainer.tsx');
  assert.ok(pageContainerSrc.includes("'workspace'"), "PageMaxWidthRole must include 'workspace'");
  assert.ok(pageContainerSrc.includes('ContentWidths.workspace'), 'PageContainer must reference ContentWidths.workspace');
  assert.ok(
    pageContainerSrc.includes('isLargeTablet') && pageContainerSrc.includes('isLandscape'),
    'PageContainer must account for tablet orientation and size when resolving default max width'
  );
});

test('4. ScreenWrapper accepts and forwards maxWidth to PageContainer', () => {
  const screenWrapperSrc = read('components/layout/ScreenWrapper.tsx');
  assert.ok(screenWrapperSrc.includes('maxWidth?: PageMaxWidthRole'), 'ScreenWrapperProps must accept maxWidth');
  assert.ok(screenWrapperSrc.includes('maxWidth={maxWidth}'), 'ScreenWrapper must forward maxWidth to PageContainer');
});

test('5. DailyStateCard prompt layout is intrinsically safe: text never squeezed by horizontal actions', () => {
  const dailyStateSrc = read('components/dashboard/DailyStateCard.tsx');
  // Must NOT do side-by-side flex row on tablet that squeezes prompt content
  assert.ok(
    !dailyStateSrc.includes("flexDirection: isTablet ? 'row' : 'column'"),
    'DailyStateCard prompt must not use rigid isTablet row that squeezes text into character column'
  );
  assert.ok(dailyStateSrc.includes('promptActions'), 'DailyStateCard must define promptActions');
  assert.ok(dailyStateSrc.includes('flexWrap'), 'DailyStateCard promptActions must support wrapping');
});

test('6. QuickStartCard secondary actions support wrapping and bounded width to prevent clipping', () => {
  const quickStartSrc = read('components/dashboard/QuickStartCard.tsx');
  assert.ok(quickStartSrc.includes('secondaryActions'), 'QuickStartCard must define secondaryActions');
  assert.ok(quickStartSrc.includes("flexWrap: 'wrap'"), 'QuickStartCard secondary actions must wrap safely');
  assert.ok(quickStartSrc.includes("maxWidth: '100%'"), 'QuickStartCard secondary buttons must enforce maxWidth constraint');
});

test('7. TODAY tablet layout uses twoPane with balanced columns, minimum viable widths, and workspace width', () => {
  const indexSrc = read('app/(tabs)/index.tsx');
  assert.ok(indexSrc.includes('isTwoPane'), 'TODAY must define responsive isTwoPane logic');
  assert.ok(indexSrc.includes('twoPaneGap'), 'TODAY must define responsive twoPaneGap');
  assert.ok(indexSrc.includes('minWidth: 290') || indexSrc.includes('minWidth: 280'), 'TODAY columns must declare minimum readable widths');
  assert.ok(indexSrc.includes('maxWidth='), 'TODAY must declare responsive ScreenWrapper maxWidth');
});

test('8. ATLAS tablet layout provides bounded master width, wrapping metadata, and fluid detail workspace', () => {
  const atlasSrc = read('app/(tabs)/committees.tsx');
  assert.ok(!atlasSrc.includes('flex: 0.36'), 'ATLAS must NOT use fragile flex: 0.36 that collapses on tablet');
  assert.ok(atlasSrc.includes('minWidth: 280'), 'ATLAS master must enforce minimum readable width of at least 280dp');
  assert.ok(atlasSrc.includes('flexWrap: \'wrap\'') || atlasSrc.includes('gap: 4'), 'ATLAS masterCommitteeMeta must wrap badges cleanly');
  assert.ok(atlasSrc.includes('maxWidth="workspace"'), 'ATLAS ScreenWrapper must leverage workspace width');
});

console.log(`\n============================================================`);
console.log(`Phase 15D.1 Validation: ${passed}/${passed + failed} passed, ${failed} failed`);
console.log(`============================================================\n`);

if (failed > 0) {
  process.exit(1);
}
