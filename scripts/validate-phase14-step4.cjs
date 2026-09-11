// MedOS — Phase 14.4 Validation Suite: Shared UI Primitives
// Validates core primitive implementations, canonical token consumption,
// legacy compatibility, barrel exports, and architectural invariants.

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

console.log('=== PHASE 14.4: SHARED UI PRIMITIVES VALIDATION ===\n');

// 1. Primitives existence
test('1. All canonical shared UI primitive files exist', () => {
  const requiredFiles = [
    'components/ui/Button.tsx',
    'components/ui/IconButton.tsx',
    'components/ui/Card.tsx',
    'components/ui/Surface.tsx',
    'components/ui/ListRow.tsx',
    'components/ui/SectionHeader.tsx',
    'components/ui/Tag.tsx',
    'components/ui/Badge.tsx',
    'components/ui/Input.tsx',
    'components/ui/Search.tsx',
    'components/ui/SegmentedControl.tsx',
    'components/ui/ProgressBar.tsx',
    'components/ui/EmptyState.tsx',
    'components/ui/Modal.tsx',
    'components/ui/Sheet.tsx',
    'components/ui/Divider.tsx',
  ];

  for (const rel of requiredFiles) {
    assert.ok(fs.existsSync(path.join(root, rel)), `${rel} must exist`);
  }
});

// 2. Barrel exports in components/ui/index.ts
test('2. Central barrel components/ui/index.ts exports all canonical primitives', () => {
  const barrel = read('components/ui/index.ts');
  const expectedExports = [
    "'./Button'",
    "'./IconButton'",
    "'./Card'",
    "'./Surface'",
    "'./Badge'",
    "'./Tag'",
    "'./ProgressBar'",
    "'./SectionHeader'",
    "'./SegmentedControl'",
    "'./Divider'",
    "'./ListRow'",
    "'./EmptyState'",
    "'./Input'",
    "'./Search'",
    "'./Modal'",
    "'./Sheet'",
  ];

  for (const exp of expectedExports) {
    assert.ok(
      barrel.includes(`export * from ${exp}`),
      `components/ui/index.ts must export * from ${exp}`
    );
  }
});

// 3. Button token integration and legacy compatibility
test('3. Button consumes canonical tokens and preserves legacy variants', () => {
  const src = read('components/ui/Button.tsx');
  assert.ok(src.includes("import { useTheme } from '@/hooks/useTheme'"), 'Button must use useTheme hook');
  assert.ok(src.includes('FontFamily.semibold'), 'Button must use Manrope Semibold');
  assert.ok(src.includes('radius.control'), 'Button must consume radius.control');
  assert.ok(src.includes('borders.standard'), 'Button must consume borders.standard');

  // Check supported variants including legacy aliases
  assert.ok(src.includes("'primary'"), 'Button must support primary variant');
  assert.ok(src.includes("'secondary'"), 'Button must support secondary variant');
  assert.ok(src.includes("'outline'"), 'Button must support outline variant');
  assert.ok(src.includes("'ghost'"), 'Button must support ghost variant');
  assert.ok(src.includes("'danger'"), 'Button must support danger variant');
  assert.ok(src.includes("'text'"), 'Button must support text variant');
});

// 4. Card and Surface primitives separation and token integration
test('4. Card and Surface provide distinct structural roles and consume canonical tokens', () => {
  const cardSrc = read('components/ui/Card.tsx');
  const surfaceSrc = read('components/ui/Surface.tsx');

  // Surface: generic structural container
  assert.ok(surfaceSrc.includes("import { useTheme } from '@/hooks/useTheme'"), 'Surface must use useTheme');
  assert.ok(surfaceSrc.includes('radius.card'), 'Surface must use radius.card');
  assert.ok(surfaceSrc.includes('colors.borderSubtle'), 'Surface must use colors.borderSubtle');
  assert.ok(surfaceSrc.includes('export function Surface'), 'Surface component must be exported');

  // Card: interactive or grouped content surface
  assert.ok(cardSrc.includes("import { useTheme } from '@/hooks/useTheme'"), 'Card must use useTheme');
  assert.ok(cardSrc.includes('radius.card'), 'Card must use radius.card');
  assert.ok(cardSrc.includes('colors.borderSubtle'), 'Card must use colors.borderSubtle');
  assert.ok(cardSrc.includes('selected?: boolean'), 'Card must support selected prop');
});

// 5. Tag and Chip primitives
test('5. Tag and Chip primitives provide restrained metadata and filter selection', () => {
  const src = read('components/ui/Tag.tsx');
  assert.ok(src.includes('export function Tag'), 'Tag must be exported');
  assert.ok(src.includes('export function Chip'), 'Chip must be exported');
  assert.ok(src.includes('radius.pill'), 'Tag/Chip must use pill radius');
  assert.ok(src.includes('FontFamily.medium'), 'Tag/Chip must use canonical typography');
  assert.ok(src.includes('colors.borderSubtle'), 'Tag/Chip must use borderSubtle');
});

// 6. Badge, ListRow, SectionHeader, and SegmentedControl
test('6. Badge, ListRow, SectionHeader, and SegmentedControl consume canonical tokens', () => {
  const badgeSrc = read('components/ui/Badge.tsx');
  assert.ok(badgeSrc.includes('radius.pill'), 'Badge must use pill radius');
  assert.ok(badgeSrc.includes('colors.borderSubtle'), 'Badge must use borderSubtle');

  const listRowSrc = read('components/ui/ListRow.tsx');
  assert.ok(listRowSrc.includes('selected?: boolean'), 'ListRow must support selected prop');
  assert.ok(listRowSrc.includes('IconSizes.sm'), 'ListRow must use canonical icon size');
  assert.ok(listRowSrc.includes('FontFamily.semibold'), 'ListRow must use Manrope Semibold');

  const secSrc = read('components/ui/SectionHeader.tsx');
  assert.ok(secSrc.includes('count?:'), 'SectionHeader must support count prop');
  assert.ok(secSrc.includes('FontFamily.semibold'), 'SectionHeader must use Manrope Semibold');

  const segSrc = read('components/ui/SegmentedControl.tsx');
  assert.ok(segSrc.includes('radius.control'), 'SegmentedControl must use radius.control');
  assert.ok(segSrc.includes('FontFamily.semibold'), 'SegmentedControl must use canonical typography');
});

// 7. Input, Search, Progress, and EmptyState
test('7. Input, Search, Progress, and EmptyState implement canonical UI vocabulary', () => {
  const inputSrc = read('components/ui/Input.tsx');
  assert.ok(inputSrc.includes('radius.control'), 'Input must use radius.control');
  assert.ok(inputSrc.includes('borders.standard'), 'Input must use borders.standard');
  assert.ok(inputSrc.includes('colors.borderSubtle'), 'Input must use borderSubtle');

  const searchSrc = read('components/ui/Search.tsx');
  assert.ok(
    searchSrc.includes('export const Search') || searchSrc.includes('export function Search'),
    'Search must be exported'
  );
  assert.ok(searchSrc.includes('from \'./Input\''), 'Search must extend/reuse Input primitive');

  const progSrc = read('components/ui/ProgressBar.tsx');
  assert.ok(progSrc.includes('export const Progress = ProgressBar;'), 'ProgressBar must export Progress alias');
  assert.ok(progSrc.includes('radius.pill'), 'ProgressBar must use radius.pill');

  const emptySrc = read('components/ui/EmptyState.tsx');
  assert.ok(emptySrc.includes('body?: string'), 'EmptyState must support body prop');
  assert.ok(emptySrc.includes('secondaryAction?:'), 'EmptyState must support secondaryAction');
  assert.ok(emptySrc.includes('colors.surfaceSubtle'), 'EmptyState must use quiet surface');
});

// 8. Modal and Sheet foundation
test('8. Modal and Sheet foundation provide responsive sheet/modal container', () => {
  const modalSrc = read('components/ui/Modal.tsx');
  assert.ok(modalSrc.includes('radius.sheet'), 'Modal must consume radius.sheet (28px) for mobile sheet');
  assert.ok(modalSrc.includes('radius.modal'), 'Modal must consume radius.modal (20px) for tablet modal');
  assert.ok(modalSrc.includes('useResponsive'), 'Modal must consume useResponsive for adaptive presentation');
  assert.ok(modalSrc.includes('SafeAreaView'), 'Modal must handle safe area insets');

  const sheetSrc = read('components/ui/Sheet.tsx');
  assert.ok(sheetSrc.includes('export function Sheet'), 'Sheet must be exported');
  assert.ok(sheetSrc.includes('presentation="sheet"'), 'Sheet must wrap Modal with presentation="sheet"');
});

// 9. Dependency safety: No new component library or UI framework added
test('9. No prohibited UI component libraries or extra packages added', () => {
  const pkgJson = JSON.parse(read('package.json'));
  const deps = Object.keys(pkgJson.dependencies || {});
  assert.ok(!deps.includes('@gorhom/bottom-sheet'), 'Must not add third-party bottom-sheet library');
  assert.ok(!deps.includes('react-native-paper'), 'Must not add react-native-paper');
  assert.ok(!deps.includes('native-base'), 'Must not add native-base');
  assert.ok(!deps.includes('tamagui'), 'Must not add tamagui');
  assert.ok(!deps.includes('@rneui/themed'), 'Must not add react-native-elements');
});

// 10. Regression safety: Schema v14 and canonical architecture SHA256
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

// 11. Regression safety: Phase 14.3 canonical spacing & legacy aliases
test('11. Spacing canonical 40 and legacy xxl=48/xxxl=64 are preserved', () => {
  const spacingMod = loadTs('theme/spacing.ts');
  const { Spacing } = spacingMod;

  assert.strictEqual(Spacing[40], 40, 'Canonical 40 must equal 40');
  assert.strictEqual(Spacing.xxl, 48, 'Legacy xxl must remain 48');
  assert.strictEqual(Spacing.xxxl, 64, 'Legacy xxxl must remain 64');
});

console.log(`\n============================================================`);
console.log(`Phase 14.4 Validation: ${passed}/11 passed, 0 failed`);
console.log(`============================================================\n`);
