// MedOS — Phase 14.3 Validation Suite: Spacing, Grid, Radius, Borders & Icons
// Validates locked Neutral Zen geometric and iconographic tokens, semantic aliases, and regression invariants.

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

console.log('=== PHASE 14.3: GEOMETRY & ICON FOUNDATIONS VALIDATION ===\n');

// 1. Files existence
test('1. Geometry and icon modules exist and compile', () => {
  assert.ok(fs.existsSync(path.join(root, 'theme/spacing.ts')), 'theme/spacing.ts must exist');
  assert.ok(fs.existsSync(path.join(root, 'theme/borders.ts')), 'theme/borders.ts must exist');
  assert.ok(fs.existsSync(path.join(root, 'theme/layout.ts')), 'theme/layout.ts must exist');
  assert.ok(fs.existsSync(path.join(root, 'theme/icons.ts')), 'theme/icons.ts must exist');
});

const spacingMod = loadTs('theme/spacing.ts');
const { Spacing, Radius, SpacingTokens, RadiusTokens } = spacingMod;

// 2. Spacing canonical 8 values
test('2. All 8 canonical Spacing values exist with exact locked numbers', () => {
  assert.ok(SpacingTokens, 'SpacingTokens must be exported');
  const canonicalValues = [4, 8, 12, 16, 20, 24, 32, 40];
  for (const val of canonicalValues) {
    assert.strictEqual(SpacingTokens[val], val, `SpacingTokens[${val}] must equal ${val}`);
    assert.strictEqual(Spacing[val], val, `Spacing[${val}] must equal ${val}`);
    assert.strictEqual(Spacing[`space/${val}`], val, `Spacing['space/${val}'] must equal ${val}`);
  }
});

// 3. Spacing canonical 40 accessor and legacy backward-compatible aliases
test('3. Spacing canonical 40 and legacy backward-compatible aliases resolve properly', () => {
  // Canonical 40 accessors
  assert.strictEqual(Spacing[40], 40, 'Spacing[40] must equal 40');
  assert.strictEqual(Spacing['space/40'], 40, 'Spacing["space/40"] must equal 40');
  assert.strictEqual(Spacing.space40, 40, 'Spacing.space40 must equal 40');

  // Legacy compatibility aliases (strictly preserved values)
  assert.strictEqual(Spacing.xxs, 2, 'Spacing.xxs must be 2');
  assert.strictEqual(Spacing.xs, 4, 'Spacing.xs must be 4');
  assert.strictEqual(Spacing.sm, 8, 'Spacing.sm must be 8');
  assert.strictEqual(Spacing.smd, 12, 'Spacing.smd must be 12');
  assert.strictEqual(Spacing.md, 16, 'Spacing.md must be 16');
  assert.strictEqual(Spacing.mlg, 20, 'Spacing.mlg must be 20');
  assert.strictEqual(Spacing.lg, 24, 'Spacing.lg must be 24');
  assert.strictEqual(Spacing.xl, 32, 'Spacing.xl must be 32');
  assert.strictEqual(Spacing.xxl, 48, 'Spacing.xxl must remain 48 for legacy compatibility');
  assert.strictEqual(Spacing.xxxl, 64, 'Spacing.xxxl must remain 64 for legacy compatibility');

  // Regression guards: ensure legacy aliases were not hijacked
  assert.notStrictEqual(Spacing.xxl, 40, 'Spacing.xxl must NOT be hijacked to 40');
  assert.notStrictEqual(Spacing.xxxl, 48, 'Spacing.xxxl must NOT be 48');
});

// 4. Radius canonical 5 values
test('4. All 5 canonical Radius values exist with exact locked numbers', () => {
  assert.ok(RadiusTokens, 'RadiusTokens must be exported');
  const canonicalRadii = [8, 12, 16, 20, 28];
  for (const r of canonicalRadii) {
    assert.strictEqual(RadiusTokens[r], r, `RadiusTokens[${r}] must equal ${r}`);
    assert.strictEqual(Radius[r], r, `Radius[${r}] must equal ${r}`);
    assert.strictEqual(Radius[`radius/${r}`], r, `Radius['radius/${r}'] must equal ${r}`);
  }
});

// 5. Radius semantic aliases and legacy keys
test('5. Radius semantic aliases and legacy scale keys resolve properly', () => {
  assert.strictEqual(Radius.controlSmall, 8, 'Radius.controlSmall must be 8');
  assert.strictEqual(Radius.control, 12, 'Radius.control must be 12');
  assert.strictEqual(Radius.card, 16, 'Radius.card must be 16');
  assert.strictEqual(Radius.panel, 20, 'Radius.panel must be 20');
  assert.strictEqual(Radius.modal, 20, 'Radius.modal must be 20');
  assert.strictEqual(Radius.sheet, 28, 'Radius.sheet must be 28');
  assert.strictEqual(Radius.pill, 9999, 'Radius.pill must be 9999');

  // Legacy keys check for validate-phase11 compatibility
  assert.strictEqual(Radius.xs, 4, 'Radius.xs must be 4');
  assert.strictEqual(Radius.sm, 8, 'Radius.sm must be 8');
  assert.strictEqual(Radius.md, 12, 'Radius.md must be 12');
  assert.strictEqual(Radius.lg, 16, 'Radius.lg must be 16');
  assert.strictEqual(Radius.xl, 20, 'Radius.xl must be 20');
  assert.strictEqual(Radius.xxl, 28, 'Radius.xxl must be 28');
  assert.strictEqual(Radius.full, 9999, 'Radius.full must be 9999');
});

// 6. Border foundation
const bordersMod = loadTs('theme/borders.ts');
const { Borders, BorderWidths } = bordersMod;

test('6. Border foundation defines canonical widths with 1px hairline standard', () => {
  assert.ok(BorderWidths, 'BorderWidths must be exported');
  assert.ok(Borders, 'Borders must be exported');
  assert.strictEqual(BorderWidths.none, 0, 'BorderWidths.none must be 0');
  assert.strictEqual(BorderWidths.hairline, 1, 'BorderWidths.hairline must be 1 (restrained)');
  assert.strictEqual(BorderWidths.subtle, 1, 'BorderWidths.subtle must be 1');
  assert.strictEqual(BorderWidths.standard, 1, 'BorderWidths.standard must be 1');
  assert.strictEqual(BorderWidths.thick, 2, 'BorderWidths.thick must be 2');
  assert.strictEqual(BorderWidths.focus, 2, 'BorderWidths.focus must be 2');

  // Verify integration with semantic color token
  const colorsSrc = read('theme/colors.ts');
  assert.ok(colorsSrc.includes("borderSubtle: '#D7DAD5'"), 'Light theme must supply borderSubtle');
  assert.ok(colorsSrc.includes("borderSubtle: '#303832'"), 'Dark theme must supply borderSubtle');
});

// 7. Layout and Page constants
const layoutMod = loadTs('theme/layout.ts');
const { Layout, PageLayout } = layoutMod;

test('7. Layout and PageLayout expose gutters and content gaps', () => {
  assert.ok(PageLayout, 'PageLayout must be exported');
  assert.ok(Layout, 'Layout must be exported');
  assert.strictEqual(PageLayout.gutterPhone, 16, 'gutterPhone must be 16');
  assert.strictEqual(PageLayout.gutterTablet, 24, 'gutterTablet must be 24');
  assert.strictEqual(PageLayout.compactGap, 8, 'compactGap must be 8');
  assert.strictEqual(PageLayout.contentGap, 16, 'contentGap must be 16');
  assert.strictEqual(PageLayout.sectionGap, 24, 'sectionGap must be 24');

  assert.strictEqual(Layout.pagePaddingPhone, 16, 'Layout.pagePaddingPhone must be 16');
  assert.strictEqual(Layout.pagePaddingTablet, 24, 'Layout.pagePaddingTablet must be 24');
  assert.strictEqual(Layout.compactGap, 8, 'Layout.compactGap must be 8');
  assert.strictEqual(Layout.contentGap, 16, 'Layout.contentGap must be 16');
  assert.strictEqual(Layout.sectionGap, 24, 'Layout.sectionGap must be 24');

  // Existing responsive constants preserved
  assert.strictEqual(Layout.breakpoints.tablet, 600, 'tablet breakpoint preserved');
  assert.strictEqual(Layout.contentWidth.tablet, 720, 'tablet contentWidth preserved');
});

// 8. Icon foundation
const iconsMod = loadTs('theme/icons.ts');
const { Icons, IconSizes, IconStroke, DEFAULT_ICON_LIBRARY } = iconsMod;

test('8. Icon foundation defines canonical size roles and standardizes on Feather', () => {
  assert.ok(IconSizes, 'IconSizes must be exported');
  assert.ok(IconStroke, 'IconStroke must be exported');
  assert.ok(Icons, 'Icons must be exported');
  assert.strictEqual(DEFAULT_ICON_LIBRARY, 'Feather', 'Standard library must be Feather');

  assert.strictEqual(IconSizes.xs, 12, 'IconSizes.xs must be 12');
  assert.strictEqual(IconSizes.sm, 16, 'IconSizes.sm must be 16');
  assert.strictEqual(IconSizes.md, 20, 'IconSizes.md must be 20');
  assert.strictEqual(IconSizes.lg, 24, 'IconSizes.lg must be 24');
  assert.strictEqual(IconSizes.xl, 32, 'IconSizes.xl must be 32');
  assert.strictEqual(IconSizes.xxl, 48, 'IconSizes.xxl must be 48');

  assert.strictEqual(IconStroke.standard, 2, 'Standard icon stroke must be 2');

  // No competing icon packages added
  const pkgJson = JSON.parse(read('package.json'));
  assert.ok(pkgJson.dependencies['@expo/vector-icons'], '@expo/vector-icons must be in dependencies');
  assert.ok(!pkgJson.dependencies['lucide-react-native'], 'Must not add competing lucide package');
});

// 9. Unified theme index export and useTheme integration
test('9. Unified theme export and useTheme hook expose all foundations', () => {
  const themeIndexSrc = read('theme/index.ts');
  assert.ok(themeIndexSrc.includes('SpacingTokens'), 'theme/index.ts must export SpacingTokens');
  assert.ok(themeIndexSrc.includes('RadiusTokens'), 'theme/index.ts must export RadiusTokens');
  assert.ok(themeIndexSrc.includes('Borders'), 'theme/index.ts must export Borders');
  assert.ok(themeIndexSrc.includes('BorderWidths'), 'theme/index.ts must export BorderWidths');
  assert.ok(themeIndexSrc.includes('PageLayout'), 'theme/index.ts must export PageLayout');
  assert.ok(themeIndexSrc.includes('Icons'), 'theme/index.ts must export Icons');
  assert.ok(themeIndexSrc.includes('IconSizes'), 'theme/index.ts must export IconSizes');

  const useThemeSrc = read('hooks/useTheme.ts');
  assert.ok(useThemeSrc.includes('borders: Borders'), 'useTheme must expose borders');
  assert.ok(useThemeSrc.includes('layout: Layout'), 'useTheme must expose layout');
  assert.ok(useThemeSrc.includes('icons: Icons'), 'useTheme must expose icons');
});

// 10. Regression safety: Schema v14 and canonical architecture SHA256
test('10. SQLite schema remains strictly v14 and architecture hash verified', () => {
  const migrationsSrc = read('db/migrations.ts');
  assert.ok(migrationsSrc.includes("db.runSync('UPDATE _schema_version SET version = ?', [14]);"), 'Migration must target schema v14');
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
console.log(`Phase 14.3 Validation: ${passed}/10 passed, 0 failed`);
console.log(`============================================================\n`);
