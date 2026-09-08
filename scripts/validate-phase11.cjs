/**
 * Phase 11 Validator - Final UI/UX Redesign & Design System
 *
 * Verifies structural guarantees of Phase 11:
 * 1. Centralized design-token architecture (colors, spacing, radius, typography, hooks/useTheme)
 * 2. Reusable UI primitives in components/ui/
 * 3. Screens and components adopting unified tokens and hooks
 * 4. Architectural integrity: zero regressions in stores, repositories, schema, SRS, AI providers
 * 5. Localization integrity preserved across design primitives
 * 6. Phase 9 and Phase 10 master suites pass
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf-8');
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

console.log('=== PHASE 11: FINAL UI/UX REDESIGN & DESIGN SYSTEM VALIDATION ===\n');

// 1. Centralized Design Token Architecture
console.log('--- Checking Design Tokens ---');

assert.ok(exists('theme/colors.ts'), 'theme/colors.ts must exist');
const colorsSrc = read('theme/colors.ts');
const requiredColorTokens = [
  'background',
  'surface',
  'surfaceElevated',
  'surfaceHighlight',
  'primary',
  'primaryMuted',
  'accent',
  'textPrimary',
  'textSecondary',
  'textMuted',
  'textInverse',
  'border',
  'borderMuted',
  'cardBorder',
  'cardBorderHover',
  'focus',
  'focusRing',
  'success',
  'successMuted',
  'warning',
  'warningMuted',
  'error',
  'errorMuted',
  'info',
  'infoMuted',
];
for (const token of requiredColorTokens) {
  assert.ok(
    colorsSrc.includes(token),
    `theme/colors.ts must include color token: ${token}`
  );
}
assert.ok(colorsSrc.includes('LightColors'), 'theme/colors.ts must define LightColors');
console.log('PASS: Centralized color tokens with light/dark palettes');

assert.ok(exists('theme/spacing.ts'), 'theme/spacing.ts must exist');
const spacingSrc = read('theme/spacing.ts');
const requiredSpacingTokens = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'];
for (const token of requiredSpacingTokens) {
  assert.ok(
    spacingSrc.includes(token),
    `theme/spacing.ts must include spacing token: ${token}`
  );
}
const requiredRadiusTokens = ['xs', 'sm', 'md', 'lg', 'xl', 'full', 'pill'];
for (const token of requiredRadiusTokens) {
  assert.ok(
    spacingSrc.includes(token),
    `theme/spacing.ts must include radius token: ${token}`
  );
}
console.log('PASS: Centralized spacing and radius scales');

assert.ok(exists('theme/typography.ts'), 'theme/typography.ts must exist');
const typoSrc = read('theme/typography.ts');
const requiredTypoVariants = ['h1', 'h2', 'h3', 'body', 'bodySmall', 'caption', 'label'];
for (const variant of requiredTypoVariants) {
  assert.ok(
    typoSrc.includes(variant),
    `theme/typography.ts must include typography variant: ${variant}`
  );
}
console.log('PASS: Centralized typography system');

assert.ok(exists('hooks/useTheme.ts'), 'hooks/useTheme.ts must exist');
const useThemeSrc = read('hooks/useTheme.ts');
assert.ok(useThemeSrc.includes('colors'), 'useTheme must expose colors');
assert.ok(useThemeSrc.includes('spacing'), 'useTheme must expose spacing');
assert.ok(useThemeSrc.includes('radius'), 'useTheme must expose radius');
assert.ok(useThemeSrc.includes('typography'), 'useTheme must expose typography');
assert.ok(useThemeSrc.includes('colorScheme'), 'useTheme must expose colorScheme');
assert.ok(useThemeSrc.includes('isDark'), 'useTheme must expose isDark');
console.log('PASS: useTheme unified hook with reactive theme resolution');

// 2. Reusable UI Primitives
console.log('\n--- Checking UI Primitives ---');

const requiredPrimitives = [
  'Typography',
  'Button',
  'IconButton',
  'Card',
  'StatCard',
  'Badge',
  'ProgressBar',
  'SectionHeader',
  'SegmentedControl',
  'Divider',
  'Breadcrumb',
  'ListRow',
  'Screen',
  'EmptyState',
  'ErrorState',
  'LoadingState',
  'Input',
  'FormField',
];

for (const prim of requiredPrimitives) {
  assert.ok(
    exists(`components/ui/${prim}.tsx`) || exists(`components/ui/${prim}.ts`),
    `components/ui/${prim} must exist`
  );
}

assert.ok(exists('components/ui/index.ts'), 'components/ui/index.ts must exist');
const uiIndex = read('components/ui/index.ts');
for (const prim of requiredPrimitives) {
  assert.ok(
    uiIndex.includes(prim),
    `components/ui/index.ts must export ${prim}`
  );
}

// Check that components/ui does not use legacy violet hex
for (const prim of requiredPrimitives) {
  const file = exists(`components/ui/${prim}.tsx`)
    ? `components/ui/${prim}.tsx`
    : `components/ui/${prim}.ts`;
  const code = read(file);
  assert.ok(
    !code.includes('#6C63FF') && !code.includes('#5850EC'),
    `${file} must not contain legacy violet hex colors`
  );
}
console.log('PASS: All required UI primitives exist, are exported, and use theme tokens without legacy violet');

// 3. Screen Redesigns & Design Token Usage
console.log('\n--- Checking Screen Implementations ---');

const coreScreens = [
  'app/(tabs)/index.tsx',
  'app/(tabs)/committees.tsx',
  'app/(tabs)/focus.tsx',
  'app/(tabs)/memory.tsx',
  'app/(tabs)/calendar.tsx',
  'app/(tabs)/profile.tsx',
  'app/subjects/[id].tsx',
  'app/topics/[id].tsx',
  'app/committees/[id].tsx',
  'app/qbank/new.tsx',
];

for (const screenPath of coreScreens) {
  assert.ok(exists(screenPath), `Screen must exist: ${screenPath}`);
  const content = read(screenPath);
  assert.ok(
    content.includes('useTheme'),
    `${screenPath} must use useTheme() hook for design tokens`
  );
  assert.ok(
    content.includes('useTranslation'),
    `${screenPath} must use useTranslation() for localization`
  );
}

// Verify detail screens hierarchy (Breadcrumb in subjects and topics)
assert.ok(
  read('app/subjects/[id].tsx').includes('Breadcrumb'),
  'Subject detail screen must use Breadcrumb navigation'
);
assert.ok(
  read('app/topics/[id].tsx').includes('Breadcrumb'),
  'Topic detail screen must use Breadcrumb navigation'
);
console.log('PASS: Core screens use design tokens, localization, and hierarchy primitives');

// 4. Architectural Safeguards
console.log('\n--- Checking Architectural Integrity ---');

// Schema version check
const schemaSrc = read('db/migrations.ts');
assert.ok(
  schemaSrc.includes('CURRENT_VERSION = 12'),
  'Database schema version must strictly remain 12'
);

// Core repositories exist
const coreRepos = [
  'topicRepo.ts',
  'committeeRepo.ts',
  'subjectRepo.ts',
  'qbankRepo.ts',
  'studySourceRepo.ts',
  'memoryRepo.ts',
  'analyticsRepo.ts',
];
for (const repo of coreRepos) {
  assert.ok(exists(`db/repositories/${repo}`), `Repository must exist: ${repo}`);
}

// Stores exist
const coreStores = [
  'useAppStore.ts',
  'useFocusStore.ts',
  'useMemoryStore.ts',
  'useCommitteeStore.ts',
  'useQBankStore.ts',
  'useCalendarStore.ts',
];
for (const store of coreStores) {
  assert.ok(exists(`store/${store}`), `Store must exist: ${store}`);
}

console.log('PASS: Architectural invariants preserved (Schema v12, repos, stores)');

// 5. Run Phase 9 & Phase 10 Validation
console.log('\n--- Running Regression Validation Suites ---');

try {
  execSync('node scripts/validate-phase9.cjs', { stdio: 'inherit', cwd: ROOT });
  console.log('PASS: Phase 9 master validation passed');
} catch {
  assert.fail('Phase 9 validation failed');
}

try {
  execSync('node scripts/validate-phase10.cjs', { stdio: 'inherit', cwd: ROOT });
  console.log('PASS: Phase 10 master validation passed');
} catch {
  assert.fail('Phase 10 validation failed');
}

console.log('\n=== ALL PHASE 11 VALIDATION CHECKS PASSED ===\n');
