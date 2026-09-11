// MedOS — Phase 14.2 Validation Suite: Typography System
// Validates locked Neutral Zen Manrope typography scale, semantic tokens, font loading safety, compatibility mappings, and schema v14 integrity.

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');

function loadTs(file) {
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
      if (dep === 'react-native') {
        return {
          Platform: {
            select: (obj) => obj.default ?? obj.ios ?? obj.android,
          },
        };
      }
      throw new Error(`Unexpected dependency in self-contained module: ${dep}`);
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

console.log('=== PHASE 14.2: TYPOGRAPHY SYSTEM VALIDATION ===\n');

// 1. Files existence
test('1. theme/typography.ts exists and compiles', () => {
  assert.ok(fs.existsSync(path.join(root, 'theme/typography.ts')), 'theme/typography.ts must exist');
});

const typoModule = loadTs('theme/typography.ts');
const { Typography, FontFamily, TypographyTokens } = typoModule;

// 2. Canonical exports exist
test('2. Typography, FontFamily, and TypographyTokens are exported', () => {
  assert.ok(Typography, 'Typography must be exported');
  assert.ok(FontFamily, 'FontFamily must be exported');
  assert.ok(TypographyTokens, 'TypographyTokens must be exported');
});

// 3. All 9 semantic styles exist
test('3. All 9 canonical semantic styles exist', () => {
  const expectedTokens = [
    'displayXL',
    'headingL',
    'headingM',
    'headingS',
    'bodyL',
    'bodyM',
    'bodyS',
    'labelM',
    'labelS',
  ];
  for (const token of expectedTokens) {
    assert.ok(token in TypographyTokens, `TypographyTokens missing token: ${token}`);
    assert.ok(token in Typography, `Typography missing token: ${token}`);
    assert.strictEqual(Typography[token], TypographyTokens[token], `Typography.${token} must reference TypographyTokens.${token}`);
  }
});

// 4. Exact locked font sizes match Phase 13.5 specification
test('4. Exact locked font sizes match Phase 13.5 specification', () => {
  assert.strictEqual(TypographyTokens.displayXL.fontSize, 36, 'displayXL fontSize must be 36');
  assert.strictEqual(TypographyTokens.headingL.fontSize, 28, 'headingL fontSize must be 28');
  assert.strictEqual(TypographyTokens.headingM.fontSize, 22, 'headingM fontSize must be 22');
  assert.strictEqual(TypographyTokens.headingS.fontSize, 18, 'headingS fontSize must be 18');
  assert.strictEqual(TypographyTokens.bodyL.fontSize, 16, 'bodyL fontSize must be 16');
  assert.strictEqual(TypographyTokens.bodyM.fontSize, 14, 'bodyM fontSize must be 14');
  assert.strictEqual(TypographyTokens.bodyS.fontSize, 12, 'bodyS fontSize must be 12');
  assert.strictEqual(TypographyTokens.labelM.fontSize, 13, 'labelM fontSize must be 13');
  assert.strictEqual(TypographyTokens.labelS.fontSize, 11, 'labelS fontSize must be 11');
});

// 5. Exact locked line heights match Phase 13.5 specification
test('5. Exact locked line heights match Phase 13.5 specification', () => {
  assert.strictEqual(TypographyTokens.displayXL.lineHeight, 44, 'displayXL lineHeight must be 44');
  assert.strictEqual(TypographyTokens.headingL.lineHeight, 36, 'headingL lineHeight must be 36');
  assert.strictEqual(TypographyTokens.headingM.lineHeight, 30, 'headingM lineHeight must be 30');
  assert.strictEqual(TypographyTokens.headingS.lineHeight, 26, 'headingS lineHeight must be 26');
  assert.strictEqual(TypographyTokens.bodyL.lineHeight, 24, 'bodyL lineHeight must be 24');
  assert.strictEqual(TypographyTokens.bodyM.lineHeight, 21, 'bodyM lineHeight must be 21');
  assert.strictEqual(TypographyTokens.bodyS.lineHeight, 18, 'bodyS lineHeight must be 18');
  assert.strictEqual(TypographyTokens.labelM.lineHeight, 18, 'labelM lineHeight must be 18');
  assert.strictEqual(TypographyTokens.labelS.lineHeight, 16, 'labelS lineHeight must be 16');
});

// 6. Exact locked font weights match Phase 13.5 specification
test('6. Exact locked font weights match Phase 13.5 specification', () => {
  assert.strictEqual(TypographyTokens.displayXL.fontWeight, '700', 'displayXL weight must be 700');
  assert.strictEqual(TypographyTokens.headingL.fontWeight, '600', 'headingL weight must be 600');
  assert.strictEqual(TypographyTokens.headingM.fontWeight, '600', 'headingM weight must be 600');
  assert.strictEqual(TypographyTokens.headingS.fontWeight, '600', 'headingS weight must be 600');
  assert.strictEqual(TypographyTokens.bodyL.fontWeight, '400', 'bodyL weight must be 400');
  assert.strictEqual(TypographyTokens.bodyM.fontWeight, '400', 'bodyM weight must be 400');
  assert.strictEqual(TypographyTokens.bodyS.fontWeight, '400', 'bodyS weight must be 400');
  assert.strictEqual(TypographyTokens.labelM.fontWeight, '500', 'labelM weight must be 500');
  assert.strictEqual(TypographyTokens.labelS.fontWeight, '500', 'labelS weight must be 500');
});

// 7. Manrope font family integration and weights
test('7. Manrope font family integration and weight mapping', () => {
  assert.ok(FontFamily.regular.includes('Manrope'), 'FontFamily.regular must be Manrope');
  assert.ok(FontFamily.medium.includes('Manrope'), 'FontFamily.medium must be Manrope');
  assert.ok(FontFamily.semibold.includes('Manrope'), 'FontFamily.semibold must be Manrope');
  assert.ok(FontFamily.bold.includes('Manrope'), 'FontFamily.bold must be Manrope');

  const pkgJson = JSON.parse(read('package.json'));
  assert.ok(
    pkgJson.dependencies['@expo-google-fonts/manrope'],
    '@expo-google-fonts/manrope must be in dependencies'
  );
});

// 8. Legacy compatibility preservation in Typography and AppText
test('8. Legacy compatibility aliases resolve properly', () => {
  assert.ok(Typography.size, 'Typography.size must be preserved');
  assert.ok(Typography.weight, 'Typography.weight must be preserved');
  assert.ok(Typography.lineHeight, 'Typography.lineHeight must be preserved');
  assert.ok(Typography.variants, 'Typography.variants must be preserved');

  // Verify AppText supports both canonical and legacy variants
  const appTextSrc = read('components/ui/Typography.tsx');
  assert.ok(appTextSrc.includes("'displayXL'"), 'AppText must declare displayXL variant');
  assert.ok(appTextSrc.includes("'headingL'"), 'AppText must declare headingL variant');
  assert.ok(appTextSrc.includes("'bodyM'"), 'AppText must declare bodyM variant');
  assert.ok(appTextSrc.includes("'labelS'"), 'AppText must declare labelS variant');
  assert.ok(appTextSrc.includes("'subhead'"), 'AppText must preserve legacy subhead variant');
  assert.ok(appTextSrc.includes("'caption'"), 'AppText must preserve legacy caption variant');
});

// 9. RootLayout font loading safety
test('9. RootLayout font loading safely integrated into single bootstrap gate', () => {
  const layoutSrc = read('app/_layout.tsx');
  assert.ok(layoutSrc.includes('useFonts'), 'RootLayout must call useFonts');
  assert.ok(layoutSrc.includes('Manrope_400Regular'), 'RootLayout must load Manrope_400Regular');
  assert.ok(layoutSrc.includes('Manrope_600SemiBold'), 'RootLayout must load Manrope_600SemiBold');
  assert.ok(layoutSrc.includes('DatabaseGate'), 'RootLayout must preserve DatabaseGate');
  assert.ok(!layoutSrc.includes('SplashScreen.preventAutoHideAsync'), 'Must not add duplicate splash gates');
});

// 10. Schema remains strictly v14 and canonical architecture unchanged
test('10. SQLite schema remains v14 and architecture hash verified', () => {
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
console.log(`Phase 14.2 Validation: ${passed}/10 passed, 0 failed`);
console.log(`============================================================\n`);
