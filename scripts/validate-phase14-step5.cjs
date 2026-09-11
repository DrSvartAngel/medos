// MedOS — Phase 14.5 Validation Suite: Responsive Application Shell
// Validates canonical breakpoint foundation, responsive hook, page container,
// shell layout slots, safe-area coordination, compatibility, and regression invariants.

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');

function loadTs(file, mocks = {}) {
  const source = read(file);
  const output = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
    },
    fileName: file,
  }).outputText;
  const mod = { exports: {} };
  const wrapped = vm.runInThisContext(
    '(function(require,module,exports,__filename,__dirname){' + output + '\n})',
    { filename: file }
  );
  wrapped(
    (dep) => {
      if (mocks[dep]) return mocks[dep];
      if (dep.startsWith('./') || dep.startsWith('../') || dep.startsWith('@/theme/')) {
        const resolvedPath = dep.startsWith('@/theme/')
          ? path.join('theme', dep.replace('@/theme/', '')) + '.ts'
          : path.join(path.dirname(file), dep) + '.ts';
        return loadTs(resolvedPath, mocks);
      }
      throw new Error(`Unexpected dependency in module: ${dep}`);
    },
    mod,
    mod.exports,
    path.join(root, file),
    path.dirname(path.join(root, file))
  );
  return mod.exports;
}

let passed = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(err);
    process.exit(1);
  }
}

console.log('=== PHASE 14.5: RESPONSIVE APPLICATION SHELL VALIDATION ===\n');

// 1. Files existence
test('1. Responsive shell modules and primitives exist and compile', () => {
  assert.ok(fs.existsSync(path.join(root, 'theme/layout.ts')), 'theme/layout.ts must exist');
  assert.ok(fs.existsSync(path.join(root, 'hooks/useResponsive.ts')), 'hooks/useResponsive.ts must exist');
  assert.ok(fs.existsSync(path.join(root, 'components/layout/PageContainer.tsx')), 'components/layout/PageContainer.tsx must exist');
  assert.ok(fs.existsSync(path.join(root, 'components/layout/AppShell.tsx')), 'components/layout/AppShell.tsx must exist');
  assert.ok(fs.existsSync(path.join(root, 'components/layout/ScreenWrapper.tsx')), 'components/layout/ScreenWrapper.tsx must exist');
  assert.ok(fs.existsSync(path.join(root, 'components/ui/Screen.tsx')), 'components/ui/Screen.tsx must exist');
});

// 2. Canonical Breakpoint Foundation
const layoutMod = loadTs('theme/layout.ts');
const { Breakpoints, ContentWidths, ShellLayout, PageLayout, Layout } = layoutMod;

test('2. Canonical Breakpoints and ContentWidths define single responsive source of truth', () => {
  assert.ok(Breakpoints, 'Breakpoints must be exported from theme/layout.ts');
  assert.strictEqual(Breakpoints.phone, 0, 'Breakpoints.phone must be 0');
  assert.strictEqual(Breakpoints.tablet, 600, 'Breakpoints.tablet must be 600');
  assert.strictEqual(Breakpoints.largeTablet, 840, 'Breakpoints.largeTablet must be 840');

  // Layout.breakpoints references canonical Breakpoints
  assert.strictEqual(Layout.breakpoints.tablet, 600, 'Layout.breakpoints.tablet must be 600');
  assert.strictEqual(Layout.breakpoints.largeTablet, 840, 'Layout.breakpoints.largeTablet must be 840');

  // Content widths
  assert.ok(ContentWidths, 'ContentWidths must be exported');
  assert.strictEqual(ContentWidths.content, 720, 'ContentWidths.content must be 720 (readable single column)');
  assert.strictEqual(ContentWidths.wide, 900, 'ContentWidths.wide must be 900 (wide workspace)');
});

// 3. Responsive hook contract
test('3. useResponsive exposes deterministic viewport roles and canonical gutter', () => {
  const useRespSrc = read('hooks/useResponsive.ts');
  assert.ok(useRespSrc.includes('Breakpoints'), 'useResponsive must consume Breakpoints');
  assert.ok(useRespSrc.includes('PageLayout'), 'useResponsive must consume PageLayout');
  assert.ok(useRespSrc.includes('ContentWidths'), 'useResponsive must consume ContentWidths');
  assert.ok(useRespSrc.includes('isPhone'), 'useResponsive must expose isPhone');
  assert.ok(useRespSrc.includes('isTablet'), 'useResponsive must expose isTablet');
  assert.ok(useRespSrc.includes('isLargeTablet'), 'useResponsive must expose isLargeTablet');
  assert.ok(useRespSrc.includes('gutter'), 'useResponsive must expose canonical gutter');
  assert.ok(useRespSrc.includes('contentMaxWidth'), 'useResponsive must expose contentMaxWidth');
});

// 4. PageContainer primitive
test('4. PageContainer implements responsive gutters and readable content width constraints', () => {
  assert.strictEqual(PageLayout.gutterPhone, 16, 'Phone gutter must be 16dp');
  assert.strictEqual(PageLayout.gutterTablet, 24, 'Tablet gutter must be 24dp');
  assert.strictEqual(PageLayout.gutterLargeTablet, 32, 'Large tablet gutter must be 32dp');

  const pageContainerSrc = read('components/layout/PageContainer.tsx');
  assert.ok(pageContainerSrc.includes('export function PageContainer'), 'PageContainer must be exported');
  assert.ok(pageContainerSrc.includes('useResponsive'), 'PageContainer must consume useResponsive');
  assert.ok(pageContainerSrc.includes('useTheme'), 'PageContainer must consume useTheme');
  assert.ok(pageContainerSrc.includes('SafeAreaView'), 'PageContainer must use SafeAreaView');
  assert.ok(pageContainerSrc.includes('maxWidth'), 'PageContainer must support maxWidth constraint');
  assert.ok(pageContainerSrc.includes('scrollable'), 'PageContainer must support scrollable prop');
});

// 5. AppShell primitive and structural slots
test('5. AppShell defines responsive shell with rail slot, main content, and inspector slot', () => {
  assert.ok(ShellLayout, 'ShellLayout must be exported');
  assert.strictEqual(ShellLayout.railWidth, 72, 'ShellLayout.railWidth must be 72dp');
  assert.strictEqual(ShellLayout.inspectorWidth, 360, 'ShellLayout.inspectorWidth must be 360dp');

  const appShellSrc = read('components/layout/AppShell.tsx');
  assert.ok(appShellSrc.includes('export function AppShell'), 'AppShell must be exported');
  assert.ok(appShellSrc.includes('export function ShellRail'), 'ShellRail slot component must be exported');
  assert.ok(appShellSrc.includes('export function ShellMain'), 'ShellMain slot component must be exported');
  assert.ok(appShellSrc.includes('export function ShellInspector'), 'ShellInspector slot component must be exported');

  // Verify responsive slot behavior
  assert.ok(appShellSrc.includes('rail'), 'AppShell must support rail slot');
  assert.ok(appShellSrc.includes('inspector'), 'AppShell must support inspector slot');
  assert.ok(appShellSrc.includes('bottomNav'), 'AppShell must support bottomNav slot');
  assert.ok(appShellSrc.includes('isTablet'), 'AppShell must adapt via isTablet');
  assert.ok(appShellSrc.includes('borderSubtle'), 'AppShell slots must use borderSubtle');
  assert.ok(appShellSrc.includes('hairline'), 'AppShell slot dividers must use hairline border');
});

// 6. Safe area foundation
test('6. Safe area coordination relies on react-native-safe-area-context without third-party bloat', () => {
  const pkgJson = JSON.parse(read('package.json'));
  assert.ok(
    pkgJson.dependencies['react-native-safe-area-context'],
    'react-native-safe-area-context must be used'
  );
  assert.ok(
    !pkgJson.dependencies['react-native-screens-safe-area'],
    'Must not add competing safe-area libraries'
  );

  const appShellSrc = read('components/layout/AppShell.tsx');
  const pageContainerSrc = read('components/layout/PageContainer.tsx');
  assert.ok(appShellSrc.includes('react-native-safe-area-context'), 'AppShell must use react-native-safe-area-context');
  assert.ok(pageContainerSrc.includes('react-native-safe-area-context'), 'PageContainer must use react-native-safe-area-context');
});

// 7. Backward compatibility for Screen and ScreenWrapper
test('7. Screen and ScreenWrapper preserve 100% backward compatibility and re-export cleanly', () => {
  const screenWrapperSrc = read('components/layout/ScreenWrapper.tsx');
  assert.ok(screenWrapperSrc.includes('export function ScreenWrapper'), 'ScreenWrapper must be exported');
  assert.ok(screenWrapperSrc.includes('PageContainer'), 'ScreenWrapper must unify with PageContainer');
  assert.ok(screenWrapperSrc.includes('scrollable'), 'ScreenWrapper must preserve scrollable prop');
  assert.ok(screenWrapperSrc.includes('includeBottomSafeArea'), 'ScreenWrapper must preserve includeBottomSafeArea prop');

  const screenSrc = read('components/ui/Screen.tsx');
  assert.ok(screenSrc.includes('export function Screen'), 'Screen must be exported');
  assert.ok(screenSrc.includes('ScreenWrapper'), 'Screen must delegate to ScreenWrapper');

  const uiIndexSrc = read('components/ui/index.ts');
  assert.ok(uiIndexSrc.includes('PageContainer'), 'components/ui/index.ts must export PageContainer');
  assert.ok(uiIndexSrc.includes('AppShell'), 'components/ui/index.ts must export AppShell');
  assert.ok(uiIndexSrc.includes('Screen'), 'components/ui/index.ts must export Screen');
});

// 8. Phase 14.6 Boundary: No premature primary navigation buttons in shell
test('8. AppShell does not prematurely hard-code Phase 14.6 Today/Study/Review/Plan buttons', () => {
  const appShellSrc = read('components/layout/AppShell.tsx');
  assert.ok(!appShellSrc.includes('Today'), 'AppShell must not hardcode Today tab');
  assert.ok(!appShellSrc.includes('Çalış'), 'AppShell must not hardcode Çalış tab');
  assert.ok(!appShellSrc.includes('Review'), 'AppShell must not hardcode Review tab');
  assert.ok(!appShellSrc.includes('Tekrar'), 'AppShell must not hardcode Tekrar tab');
  assert.ok(!appShellSrc.includes('Bugün'), 'AppShell must not hardcode Bugün tab');
});

// 9. Regression safety: Phase 14.1, 14.2, 14.3, 14.4 invariants
test('9. Phase 14.1..14.4 design foundations and spacing scale remain intact', () => {
  // 14.1
  const colorsSrc = read('theme/colors.ts');
  assert.ok(colorsSrc.includes("borderSubtle: '#D7DAD5'"), 'Phase 14.1 Light borderSubtle intact');
  assert.ok(colorsSrc.includes("borderSubtle: '#303832'"), 'Phase 14.1 Dark borderSubtle intact');

  // 14.2
  const typoSrc = read('theme/typography.ts');
  assert.ok(typoSrc.includes('displayXL'), 'Phase 14.2 displayXL intact');
  assert.ok(typoSrc.includes('labelS'), 'Phase 14.2 labelS intact');

  // 14.3
  const spacingMod = loadTs('theme/spacing.ts');
  const { Spacing } = spacingMod;
  assert.strictEqual(Spacing[40], 40, 'Canonical 40 must equal 40');
  assert.strictEqual(Spacing.xxl, 48, 'Legacy xxl must remain 48');
  assert.strictEqual(Spacing.xxxl, 64, 'Legacy xxxl must remain 64');

  // 14.4
  const uiIndex = read('components/ui/index.ts');
  assert.ok(uiIndex.includes("'./Button'"), 'Button primitive exported');
  assert.ok(uiIndex.includes("'./Card'"), 'Card primitive exported');
  assert.ok(uiIndex.includes("'./Surface'"), 'Surface primitive exported');
  assert.ok(uiIndex.includes("'./Tag'"), 'Tag primitive exported');
  assert.ok(uiIndex.includes("'./Input'"), 'Input primitive exported');
  assert.ok(uiIndex.includes("'./Search'"), 'Search primitive exported');
  assert.ok(uiIndex.includes("'./Modal'"), 'Modal primitive exported');
  assert.ok(uiIndex.includes("'./Sheet'"), 'Sheet primitive exported');
});

// 10. Regression safety: SQLite schema v14 and canonical architecture SHA256
test('10. SQLite schema remains strictly v14 and architecture hash verified', () => {
  const migrationsSrc = read('db/migrations.ts');
  assert.ok(
    migrationsSrc.includes("db.runSync('UPDATE _schema_version SET version = ?', [14]);"),
    'Migration must target schema v14'
  );
  assert.ok(!migrationsSrc.includes("SET version = ?', [15]"), 'Schema must not advance past v14');

  const docBuffer = fs.readFileSync(path.join(root, 'docs/MEDOS_FINAL_ARCHITECTURE.md'));
  const hash = crypto.createHash('sha256').update(docBuffer).digest('hex');
  assert.strictEqual(
    hash,
    '1813243a537df6678a65638e1a86438c36851cf680cda7f0ef3a6f5b1c930d0b',
    'Canonical architecture SHA256 must match byte-for-byte'
  );
});

console.log(`\n============================================================`);
console.log(`Phase 14.5 Validation: ${passed}/10 passed, 0 failed`);
console.log(`============================================================\n`);
