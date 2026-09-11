// MedOS — Phase 14.1 Validation Suite: Visual Foundations & Semantic Tokens
// Validates locked Neutral Zen light/dark semantic tokens, status roles, compatibility aliases, and schema v14 integrity.

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

console.log('=== PHASE 14.1: VISUAL FOUNDATIONS & SEMANTIC TOKENS VALIDATION ===\n');

// 1. Files existence
test('1. theme/colors.ts exists and compiles', () => {
  assert.ok(fs.existsSync(path.join(root, 'theme/colors.ts')), 'theme/colors.ts must exist');
});

const colorsModule = loadTs('theme/colors.ts');
const { LightColors, DarkColors, Colors } = colorsModule;

test('2. LightColors, DarkColors, and Colors are exported', () => {
  assert.ok(LightColors, 'LightColors must be exported');
  assert.ok(DarkColors, 'DarkColors must be exported');
  assert.ok(Colors, 'Colors must be exported');
});

// 3. Required canonical Light semantic tokens exist
test('3. Required canonical Light semantic tokens exist', () => {
  const canonicalTokens = [
    'canvas',
    'surface',
    'surfaceSubtle',
    'surfaceRaised',
    'textPrimary',
    'textSecondary',
    'textMuted',
    'textInverse',
    'borderSubtle',
    'accent',
    'accentStrong',
    'accentSoft',
    'accentSage',
    'accentMoss',
    'success',
    'successMuted',
    'warning',
    'warningMuted',
    'error',
    'errorMuted',
    'info',
    'infoMuted',
  ];
  for (const token of canonicalTokens) {
    assert.ok(token in LightColors, `LightColors missing canonical token: ${token}`);
  }
});

// 4. Required canonical Dark semantic tokens exist
test('4. Required canonical Dark semantic tokens exist', () => {
  const canonicalTokens = [
    'canvas',
    'surface',
    'surfaceSubtle',
    'surfaceRaised',
    'textPrimary',
    'textSecondary',
    'textMuted',
    'textInverse',
    'borderSubtle',
    'accent',
    'accentStrong',
    'accentSoft',
    'accentSage',
    'accentMoss',
    'success',
    'successMuted',
    'warning',
    'warningMuted',
    'error',
    'errorMuted',
    'info',
    'infoMuted',
  ];
  for (const token of canonicalTokens) {
    assert.ok(token in DarkColors, `DarkColors missing canonical token: ${token}`);
  }
});

// 5. Exact locked Light token hex values
test('5. Exact locked Light token values match Phase 13.5 specification', () => {
  assert.strictEqual(LightColors.canvas, '#F1F1EE', 'Light canvas must be #F1F1EE');
  assert.strictEqual(LightColors.surface, '#F8F8F5', 'Light surface must be #F8F8F5');
  assert.strictEqual(LightColors.surfaceSubtle, '#E8E9E4', 'Light surfaceSubtle must be #E8E9E4');
  assert.strictEqual(LightColors.surfaceRaised, '#FFFFFF', 'Light surfaceRaised must be #FFFFFF');
  assert.strictEqual(LightColors.textPrimary, '#171917', 'Light textPrimary must be #171917');
  assert.strictEqual(LightColors.textSecondary, '#5C625E', 'Light textSecondary must be #5C625E');
  assert.strictEqual(LightColors.textMuted, '#838A85', 'Light textMuted must be #838A85');
  assert.strictEqual(LightColors.borderSubtle, '#D7DAD5', 'Light borderSubtle must be #D7DAD5');
  assert.strictEqual(LightColors.accentSage, '#87968C', 'Light accentSage must be #87968C');
  assert.strictEqual(LightColors.accentMoss, '#4F5E55', 'Light accentMoss must be #4F5E55');
  assert.strictEqual(LightColors.accentSoft, '#DCE3DE', 'Light accentSoft must be #DCE3DE');
  assert.strictEqual(LightColors.success, '#2E6B4A', 'Light success must be #2E6B4A');
  assert.strictEqual(LightColors.warning, '#9B6B28', 'Light warning must be #9B6B28');
  assert.strictEqual(LightColors.error, '#A13B35', 'Light error must be #A13B35');
  assert.strictEqual(LightColors.info, '#3B627A', 'Light info must be #3B627A');
});

// 6. Exact locked Dark token hex values
test('6. Exact locked Dark token values match Phase 13.5 specification', () => {
  assert.strictEqual(DarkColors.canvas, '#111412', 'Dark canvas must be #111412');
  assert.strictEqual(DarkColors.surface, '#171B18', 'Dark surface must be #171B18');
  assert.strictEqual(DarkColors.surfaceSubtle, '#1E2420', 'Dark surfaceSubtle must be #1E2420');
  assert.strictEqual(DarkColors.surfaceRaised, '#202621', 'Dark surfaceRaised must be #202621');
  assert.strictEqual(DarkColors.textPrimary, '#F3F3EE', 'Dark textPrimary must be #F3F3EE');
  assert.strictEqual(DarkColors.textSecondary, '#B7BDB8', 'Dark textSecondary must be #B7BDB8');
  assert.strictEqual(DarkColors.textMuted, '#858D87', 'Dark textMuted must be #858D87');
  assert.strictEqual(DarkColors.borderSubtle, '#303832', 'Dark borderSubtle must be #303832');
  assert.strictEqual(DarkColors.accentSage, '#95A59B', 'Dark accentSage must be #95A59B');
  assert.strictEqual(DarkColors.accentMoss, '#A8B7AE', 'Dark accentMoss must be #A8B7AE');
  assert.strictEqual(DarkColors.accentSoft, '#253029', 'Dark accentSoft must be #253029');
  assert.strictEqual(DarkColors.success, '#5FA87D', 'Dark success must be #5FA87D');
  assert.strictEqual(DarkColors.warning, '#D4A359', 'Dark warning must be #D4A359');
  assert.strictEqual(DarkColors.error, '#D96B64', 'Dark error must be #D96B64');
  assert.strictEqual(DarkColors.info, '#689EC0', 'Dark info must be #689EC0');
});

// 7. Structural compatibility between LightColors and DarkColors
test('7. LightColors and DarkColors have identical keys and valid formats', () => {
  const lightKeys = Object.keys(LightColors).sort();
  const darkKeys = Object.keys(DarkColors).sort();
  assert.deepStrictEqual(lightKeys, darkKeys, 'LightColors and DarkColors must have identical keys');

  for (const key of lightKeys) {
    assert.strictEqual(typeof LightColors[key], 'string', `LightColors.${key} must be string`);
    assert.strictEqual(typeof DarkColors[key], 'string', `DarkColors.${key} must be string`);
    assert.ok(LightColors[key].length > 0, `LightColors.${key} must not be empty`);
    assert.ok(DarkColors[key].length > 0, `DarkColors.${key} must not be empty`);
  }
});

// 8. Backward-compatible aliases resolve correctly
test('8. Legacy compatibility aliases resolve properly', () => {
  const legacyTokens = [
    'background',
    'surfaceElevated',
    'surfaceHighlight',
    'border',
    'borderFaint',
    'borderMuted',
    'cardBorder',
    'cardBorderHover',
    'primary',
    'primaryPressed',
    'primaryMuted',
    'accentMuted',
    'focus',
    'focusRing',
    'tabActive',
    'tabInactive',
    'tabBar',
  ];
  for (const token of legacyTokens) {
    assert.ok(token in LightColors, `LightColors missing legacy alias: ${token}`);
    assert.ok(token in DarkColors, `DarkColors missing legacy alias: ${token}`);
  }
  // Verify alias mappings
  assert.strictEqual(LightColors.background, LightColors.canvas);
  assert.strictEqual(DarkColors.background, DarkColors.canvas);
  assert.strictEqual(LightColors.border, LightColors.borderSubtle);
  assert.strictEqual(DarkColors.border, DarkColors.borderSubtle);
});

// 9. Schema remains strictly v14
test('9. SQLite schema remains strictly v14', () => {
  const migrationsSrc = read('db/migrations.ts');
  assert.ok(migrationsSrc.includes("db.runSync('UPDATE _schema_version SET version = ?', [14]);"), 'Migration must target schema v14');
  assert.ok(!migrationsSrc.includes("SET version = ?', [15]"), 'Schema must not advance past v14');
});

// 10. Canonical architecture hash is verified
test('10. Canonical architecture SHA256 matches 1813243a...', () => {
  const docBuffer = fs.readFileSync(path.join(root, 'docs/MEDOS_FINAL_ARCHITECTURE.md'));
  const hash = crypto.createHash('sha256').update(docBuffer).digest('hex');
  assert.strictEqual(
    hash,
    '1813243a537df6678a65638e1a86438c36851cf680cda7f0ef3a6f5b1c930d0b',
    'Canonical architecture SHA256 must match byte-for-byte'
  );
});

console.log(`\n============================================================`);
console.log(`Phase 14.1 Validation: ${passed}/10 passed, 0 failed`);
console.log(`============================================================\n`);
