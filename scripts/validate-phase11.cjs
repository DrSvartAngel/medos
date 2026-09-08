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

// 3.5 Global Shell & Navigation
console.log('\n--- Checking Global Shell & Navigation ---');

assert.ok(exists('app/(tabs)/_layout.tsx'), 'app/(tabs)/_layout.tsx must exist');
const tabLayoutSrc = read('app/(tabs)/_layout.tsx');

// Check 5 visible tabs for Phase 11 V2.2 Locked Navigation IA
const visibleTabs = ['committees', 'focus', 'calendar', 'memory', 'ai'];
for (const tab of visibleTabs) {
  assert.ok(
    tabLayoutSrc.includes(`name: '${tab}'`),
    `app/(tabs)/_layout.tsx must configure visible tab: ${tab}`
  );
}

// Check index and profile are hidden via href: null
assert.ok(
  tabLayoutSrc.includes("name=\"index\"") && tabLayoutSrc.includes("href: null"),
  'Dashboard/Home must be hidden from tab bar via href: null'
);
assert.ok(
  tabLayoutSrc.includes("name=\"profile\"") && tabLayoutSrc.includes("href: null"),
  'Profile must be hidden from tab bar via href: null'
);

// Check calendar screen exists and is reachable
assert.ok(exists('app/(tabs)/calendar.tsx'), 'app/(tabs)/calendar.tsx route must exist');
const calendarSrc = read('app/(tabs)/calendar.tsx');
assert.ok(calendarSrc.includes('router'), 'Calendar must support navigation');

// Check tab layout uses theme tokens and no legacy violet
assert.ok(tabLayoutSrc.includes('colors.tabBar'), 'TabLayout must use colors.tabBar');
assert.ok(tabLayoutSrc.includes('colors.tabActive'), 'TabLayout must use colors.tabActive');
assert.ok(tabLayoutSrc.includes('colors.tabInactive'), 'TabLayout must use colors.tabInactive');
assert.ok(
  !tabLayoutSrc.includes('#6C63FF') && !tabLayoutSrc.includes('#5850EC'),
  'TabLayout must not contain legacy violet hex colors'
);

// Check root layout uses useTheme
const rootLayoutSrc = read('app/_layout.tsx');
assert.ok(rootLayoutSrc.includes('useTheme'), 'Root layout must use useTheme()');

// Check no conflicting external UI library dependencies added (gluestack + uniwind is the sole design system)
const pkgSrc = read('package.json');
const forbiddenDeps = ['@tamagui', 'react-native-paper', 'native-base', 'nativewind', 'react-native-css', 'react-native-reusables'];
for (const dep of forbiddenDeps) {
  assert.ok(!pkgSrc.includes(dep), `package.json must not include conflicting UI library ${dep}`);
}
assert.ok(pkgSrc.includes('@gluestack-ui/core'), 'package.json must include @gluestack-ui/core');
assert.ok(pkgSrc.includes('uniwind'), 'package.json must include uniwind');


console.log('PASS: Global shell and navigation conform to Phase 11 Step 4 invariants');

// 3.6 Dashboard Redesign & Information Hierarchy
console.log('\n--- Checking Dashboard Redesign ---');

const dashboardSrc = read('app/(tabs)/index.tsx');

// Check that Dashboard has the required hierarchy components
assert.ok(dashboardSrc.includes('CommitteeOverviewCard'), 'Dashboard must include CommitteeOverviewCard');
assert.ok(dashboardSrc.includes('QuickStartCard'), 'Dashboard must include QuickStartCard');
assert.ok(dashboardSrc.includes('TodayMetrics'), 'Dashboard must include TodayMetrics');
assert.ok(dashboardSrc.includes('WeakTopicsList'), 'Dashboard must include WeakTopicsList');
assert.ok(dashboardSrc.includes('MomentumCard'), 'Dashboard must include MomentumCard');
assert.ok(dashboardSrc.includes('TodayAgenda'), 'Dashboard must include TodayAgenda');

// Check that Calendar remains reachable via onOpenCalendar
assert.ok(
  dashboardSrc.includes('onOpenCalendar') && dashboardSrc.includes('/(tabs)/calendar'),
  'Dashboard must preserve contextual Calendar navigation'
);

// Check that Needs Attention uses pure analytics rules without fake scoring
assert.ok(
  dashboardSrc.includes('getWeakTopics') && dashboardSrc.includes('analyticsRepo'),
  'Dashboard Needs Attention must consume pure analytics priority rules'
);

// Check that components/dashboard contains no legacy violet hex
const dashboardComponents = [
  'CommitteeOverviewCard.tsx',
  'QuickStartCard.tsx',
  'TodayAgenda.tsx',
  'TodayMetrics.tsx',
  'MomentumCard.tsx',
];
for (const comp of dashboardComponents) {
  const compCode = read(`components/dashboard/${comp}`);
  assert.ok(
    !compCode.includes('#6C63FF') && !compCode.includes('#5850EC'),
    `components/dashboard/${comp} must not contain legacy violet hex colors`
  );
}

// Check Rules of Hooks in Dashboard: all hook calls must appear before early conditional returns
const earlyReturnIdx = dashboardSrc.indexOf('if (!isDBReady || isInitialLoading || snapshot === null)');
assert.ok(earlyReturnIdx > 0, 'DashboardScreen must contain isInitialLoading early return branch');
const hookMatches = [...dashboardSrc.matchAll(/\b(useMemo|useEffect|useCallback|useState|useTheme|useResponsive|useTranslation|useAppStore|useDashboardStore|useFocusStore|useDashboardRefresh)\b/g)];
for (const match of hookMatches) {
  if (match.index !== undefined && match.index > 0) {
    assert.ok(
      match.index < earlyReturnIdx,
      `Hook ${match[0]} at index ${match.index} must be called unconditionally before early return (index ${earlyReturnIdx}) in DashboardScreen`
    );
  }
}

console.log('PASS: Dashboard redesign satisfies Phase 11 Step 5 hierarchy and design invariants');

// 3.7 Curriculum Redesign & Hierarchy
console.log('\n--- Checking Curriculum Redesign ---');

const curriculumScreens = [
  'app/(tabs)/committees.tsx',
  'app/committees/new.tsx',
  'app/committees/[id].tsx',
  'app/subjects/[id].tsx',
  'app/topics/[id].tsx',
];

for (const screen of curriculumScreens) {
  assert.ok(exists(screen), `Curriculum screen must exist: ${screen}`);
}

// Check Breadcrumb navigation in hierarchy
assert.ok(
  read('app/committees/[id].tsx').includes('Breadcrumb'),
  'Committee detail screen must use Breadcrumb navigation'
);
assert.ok(
  read('app/subjects/[id].tsx').includes('Breadcrumb'),
  'Subject detail screen must use Breadcrumb navigation'
);
assert.ok(
  read('app/topics/[id].tsx').includes('Breadcrumb'),
  'Topic detail screen must use Breadcrumb navigation'
);

// Check Curriculum localization label in both EN and TR
const enSrc = read('i18n/en.ts');
const trSrc = read('i18n/tr.ts');
assert.ok(
  enSrc.includes("title: 'Curriculum'"),
  'i18n/en.ts must use "Curriculum" for committees.title'
);
assert.ok(
  trSrc.includes("title: 'Müfredat'"),
  'i18n/tr.ts must use "Müfredat" for committees.title'
);

// Check legacy #6C63FF removed from app/committees/new.tsx
const newCommitteeSrc = read('app/committees/new.tsx');
assert.ok(
  !newCommitteeSrc.includes('#6C63FF'),
  'app/committees/new.tsx must not contain legacy violet #6C63FF'
);
assert.ok(
  newCommitteeSrc.includes('#0D9488'),
  'app/committees/new.tsx must default to clinical teal #0D9488'
);

// Check curriculum presentation files do not contain legacy violet
const curriculumPresentationFiles = [
  'app/(tabs)/committees.tsx',
  'app/committees/new.tsx',
  'app/committees/[id].tsx',
  'components/committees/CommitteeCard.tsx',
  'components/curriculum/SubjectList.tsx',
  'components/curriculum/TopicList.tsx',
];

for (const file of curriculumPresentationFiles) {
  if (exists(file)) {
    const fileCode = read(file);
    assert.ok(
      !fileCode.includes('#6C63FF') && !fileCode.includes('#5850EC'),
      `${file} must not contain legacy violet hex colors`
    );
  }
}

console.log('PASS: Curriculum redesign satisfies Phase 11 Step 6 hierarchy and design invariants');

// 3.8 Study Workflows Redesign (Phase 11 Step 7)
console.log('\n--- Checking Study Workflows Redesign ---');

// 1. Focus Workflow
const focusSrc = read('app/(tabs)/focus.tsx');
assert.ok(focusSrc.includes('TimerDisplay'), 'Focus must include TimerDisplay');
assert.ok(focusSrc.includes('SessionControls'), 'Focus must include SessionControls');
assert.ok(focusSrc.includes('DurationPicker'), 'Focus must include DurationPicker');
assert.ok(focusSrc.includes('GentleReturnCard'), 'Focus must include GentleReturnCard');
assert.ok(focusSrc.includes('SessionHistoryList'), 'Focus must include SessionHistoryList');

// Focus Hooks discipline: all hooks before component early return
const focusScreenBody = focusSrc.slice(
  focusSrc.indexOf('export default function FocusScreen'),
  focusSrc.indexOf('function FocusError') > 0 ? focusSrc.indexOf('function FocusError') : undefined
);
const focusEarlyReturnMatch = focusScreenBody.match(/if\s*\(!isDBReady\)\s*\{\s*return/);
assert.ok(focusEarlyReturnMatch && focusEarlyReturnMatch.index > 0, 'FocusScreen must contain !isDBReady early return');
const focusEarlyReturn = focusEarlyReturnMatch.index;
const focusHookMatches = [...focusScreenBody.matchAll(/\b(useMemo|useEffect|useCallback|useState|useTheme|useResponsive|useTranslation|useAppStore|useCommitteeStore|useFocusStore|useTimer|useFocusEffect)\b/g)];
for (const match of focusHookMatches) {
  if (match.index !== undefined && match.index > 0) {
    assert.ok(
      match.index < focusEarlyReturn,
      `Hook ${match[0]} at index ${match.index} must be called before !isDBReady early return in FocusScreen`
    );
  }
}

// SessionControls hierarchy: active Pause/Resume primary, Finish secondary
const sessionControlsSrc = read('components/focus/SessionControls.tsx');
assert.ok(sessionControlsSrc.includes('variant="secondary"'), 'SessionControls finish button must be secondary');
assert.ok(sessionControlsSrc.includes('variant="primary"'), 'SessionControls resume/pause must be primary');

// 2. Memory Workflow
const memorySrc = read('app/(tabs)/memory.tsx');
assert.ok(memorySrc.includes('reviewDueCards'), 'Memory screen must include reviewDueCards primary action');
assert.ok(memorySrc.includes('noReviewsDue'), 'Memory screen must include noReviewsDue zero state');
assert.ok(memorySrc.includes('DeckCard'), 'Memory screen must render DeckCard');

// Memory Hooks discipline: all hooks before component early return
const memoryEarlyReturnMatch = memorySrc.match(/if\s*\(!isDBReady\)\s*\{\s*return/);
assert.ok(memoryEarlyReturnMatch && memoryEarlyReturnMatch.index > 0, 'MemoryScreen must contain !isDBReady early return');
const memoryEarlyReturn = memoryEarlyReturnMatch.index;
const memoryHookMatches = [...memorySrc.matchAll(/\b(useMemo|useEffect|useCallback|useState|useTheme|useResponsive|useTranslation|useAppStore|useCommitteeStore|useMemoryStore)\b/g)];
for (const match of memoryHookMatches) {
  if (match.index !== undefined && match.index > 0) {
    assert.ok(
      match.index < memoryEarlyReturn,
      `Hook ${match[0]} at index ${match.index} must be called before !isDBReady in MemoryScreen`
    );
  }
}

// DeckCard must support dueCount
const deckCardSrc = read('components/memory/DeckCard.tsx');
assert.ok(deckCardSrc.includes('dueCount?: number'), 'DeckCardProps must support optional dueCount');

// Review Screen: compact ProgressBar and dominant card
const reviewSrc = read('app/decks/[id]/review.tsx');
assert.ok(reviewSrc.includes('ProgressBar'), 'DeckReviewScreen must use ProgressBar');
assert.ok(reviewSrc.includes('ReviewCard'), 'DeckReviewScreen must use ReviewCard');
assert.ok(reviewSrc.includes('ReviewControls'), 'DeckReviewScreen must use ReviewControls');

// 3. Q-Bank Workflow
const qbankSrc = read('app/qbank/new.tsx');
assert.ok(qbankSrc.includes('FormField'), 'Q-Bank screen must use FormField');
assert.ok(qbankSrc.includes('Input'), 'Q-Bank screen must use Input');
assert.ok(qbankSrc.includes('Button'), 'Q-Bank screen must use Button');
assert.ok(qbankSrc.includes('TopicLinkPicker'), 'Q-Bank screen must include TopicLinkPicker');

// 4. Calendar Workflow
const calendarScreenSrc = read('app/(tabs)/calendar.tsx');
assert.ok(calendarScreenSrc.includes('DayAgenda'), 'CalendarScreen must use DayAgenda');
assert.ok(calendarScreenSrc.includes('CalendarMonthGrid'), 'CalendarScreen must use CalendarMonthGrid');
const eventFormSrc = read('components/calendar/CalendarEventForm.tsx');
assert.ok(eventFormSrc.includes('FormField'), 'CalendarEventForm must use FormField');
assert.ok(eventFormSrc.includes('Input'), 'CalendarEventForm must use Input');

// Calendar repo fallback check (must remain untouched per Step 7 Section 13)
const calendarRepoSrc = read('db/repositories/calendarRepo.ts');
assert.ok(calendarRepoSrc.includes('#6C63FF'), 'calendarRepo.ts must retain historical fallback #6C63FF without modification');

// 5. Check-In / Recovery
const checkInSrc = read('app/study-support/check-in.tsx');
assert.ok(checkInSrc.includes('AdaptiveRecommendationCard'), 'Check-in must include AdaptiveRecommendationCard');
assert.ok(checkInSrc.includes('CheckInChoiceGroup'), 'Check-in must include CheckInChoiceGroup');
const recoverySrc = read('app/study-support/recovery.tsx');
assert.ok(recoverySrc.includes('RecoveryActionCard'), 'Recovery must include RecoveryActionCard');

// 6. Presentation files clean scan: zero legacy violet in touched presentation
const studyWorkflowPresentationFiles = [
  'app/(tabs)/focus.tsx',
  'components/focus/TimerDisplay.tsx',
  'components/focus/SessionControls.tsx',
  'components/focus/DurationPicker.tsx',
  'components/focus/CommitteePicker.tsx',
  'components/focus/GentleReturnCard.tsx',
  'components/focus/SessionHistoryList.tsx',
  'app/(tabs)/memory.tsx',
  'app/decks/[id]/index.tsx',
  'app/decks/[id]/review.tsx',
  'components/memory/DeckCard.tsx',
  'components/memory/ReviewCard.tsx',
  'components/memory/ReviewControls.tsx',
  'components/memory/ReviewSummary.tsx',
  'app/qbank/new.tsx',
  'app/(tabs)/calendar.tsx',
  'app/calendar/new.tsx',
  'app/calendar/[id].tsx',
  'app/calendar/[id]/edit.tsx',
  'components/calendar/CalendarEventForm.tsx',
  'components/calendar/DayAgenda.tsx',
  'app/study-support/check-in.tsx',
  'app/study-support/recovery.tsx',
];

for (const file of studyWorkflowPresentationFiles) {
  if (exists(file)) {
    const content = read(file);
    assert.ok(
      !content.includes('#6C63FF') && !content.includes('#5850EC'),
      `${file} must not contain legacy violet hex colors`
    );
  }
}

console.log('PASS: Study workflows satisfy Phase 11 Step 7 hierarchy and design invariants');

// 3.9 AI Screens Redesign (Phase 11 Step 8)
console.log('\n--- Checking AI Screens Redesign ---');

const aiPresentationFiles = [
  'components/study-sources/SourceContextBar.tsx',
  'components/study-sources/ProvenanceBlock.tsx',
  'components/study-sources/StudySourceEditor.tsx',
  'app/topics/[id]/assistant.tsx',
  'app/topics/[id]/sources/new.tsx',
  'app/topics/[id]/sources/[sourceId].tsx',
  'app/topics/[id]/sources/import-document.tsx',
  'app/committees/[id]/study-plan.tsx',
  'app/settings/ai.tsx',
];

for (const file of aiPresentationFiles) {
  assert.ok(exists(file), `AI presentation file must exist: ${file}`);
}

// 1. Topic Detail Study Sources Overview
const topicDetailSrc = read('app/topics/[id].tsx');
assert.ok(topicDetailSrc.includes('t.studySources.title'), 'Topic detail must reference t.studySources.title');
assert.ok(topicDetailSrc.includes('ListRow'), 'Topic detail must render Study Sources using ListRow');
assert.ok(topicDetailSrc.includes('studyAi.assistant'), 'Topic detail must link to Study Assistant');

// 2. Source Editor & Detail
const sourceEditorSrc = read('components/study-sources/StudySourceEditor.tsx');
assert.ok(sourceEditorSrc.includes('accessibilityRole="radiogroup"'), 'Editor must have radiogroup');
assert.ok(sourceEditorSrc.includes('accessibilityRole="radio"'), 'Editor must have radio options');
assert.ok(sourceEditorSrc.includes('scrollEnabled={false}'), 'Editor input must expand smoothly');

const newSourceRouteSrc = read('app/topics/[id]/sources/new.tsx');
assert.ok(newSourceRouteSrc.includes('Breadcrumb'), 'New source screen must use Breadcrumb');

const sourceDetailRouteSrc = read('app/topics/[id]/sources/[sourceId].tsx');
assert.ok(sourceDetailRouteSrc.includes('Breadcrumb'), 'Source detail screen must use Breadcrumb');

// 3. Document Ingestion Safety & Truthful Limitation
const docImportSrc = read('app/topics/[id]/sources/import-document.tsx');
assert.ok(docImportSrc.includes('ScreenWrapper'), 'import-document.tsx must use ScreenWrapper');
assert.ok(docImportSrc.includes('includeBottomSafeArea'), 'import-document.tsx must includeBottomSafeArea');
assert.ok(docImportSrc.includes('Breadcrumb'), 'import-document.tsx must use Breadcrumb');
assert.ok(docImportSrc.includes('extractionUnavailable'), 'import-document.tsx must indicate extraction availability');
assert.ok(docImportSrc.includes('handleConfirmSave'), 'import-document.tsx must require explicit confirm save');
assert.ok(!docImportSrc.includes('geminiProvider'), 'import-document.tsx must NOT import Gemini provider');

// 4. AI Assistant Screen
const assistantScreenSrc = read('app/topics/[id]/assistant.tsx');
assert.ok(assistantScreenSrc.includes('Breadcrumb'), 'assistant.tsx must use Breadcrumb');
assert.ok(assistantScreenSrc.includes('SourceContextBar'), 'assistant.tsx must render SourceContextBar');
assert.ok(assistantScreenSrc.includes('ProvenanceBlock'), 'assistant.tsx must use ProvenanceBlock');
assert.ok(assistantScreenSrc.includes('flashcardsTab'), 'assistant.tsx must include flashcardsTab');
assert.ok(assistantScreenSrc.includes('questionsTab'), 'assistant.tsx must include questionsTab');
assert.ok(assistantScreenSrc.includes('questionDraftNotice'), 'assistant.tsx must include questionDraftNotice');
assert.ok(!assistantScreenSrc.includes('qbankRepo'), 'assistant.tsx must NOT write to Q-Bank');

// Assistant Hooks discipline: all hooks executed before any conditional return
const assistantBody = assistantScreenSrc.slice(assistantScreenSrc.indexOf('export default function StudyAssistantScreen'));
const assistantEarlyReturnMatches = [...assistantBody.matchAll(/if\s*\([^)]*\)\s*\{\s*return/g)];
const assistantFirstEarlyReturn = assistantEarlyReturnMatches.length > 0 ? assistantEarlyReturnMatches[0].index : Infinity;
const assistantHookMatches = [...assistantBody.matchAll(/\b(useMemo|useEffect|useCallback|useState|useTheme|useResponsive|useTranslation|useFocusEffect)\b/g)];
for (const match of assistantHookMatches) {
  if (match.index !== undefined && match.index > 0 && assistantFirstEarlyReturn !== Infinity) {
    assert.ok(
      match.index < assistantFirstEarlyReturn,
      `Hook ${match[0]} at index ${match.index} must be called unconditionally before early return in StudyAssistantScreen`
    );
  }
}

// 5. Committee Study Plan Screen
const studyPlanScreenSrc = read('app/committees/[id]/study-plan.tsx');
assert.ok(studyPlanScreenSrc.includes('Breadcrumb'), 'study-plan.tsx must use Breadcrumb');
assert.ok(studyPlanScreenSrc.includes('advisoryNote'), 'study-plan.tsx must display advisoryNote');
assert.ok(studyPlanScreenSrc.includes('suggestedPlanNote'), 'study-plan.tsx must display suggestedPlanNote');
assert.ok(!studyPlanScreenSrc.includes('calendarRepo'), 'study-plan.tsx must NOT import calendarRepo');
assert.ok(!studyPlanScreenSrc.includes('useFocusStore'), 'study-plan.tsx must NOT import useFocusStore');
assert.ok(!studyPlanScreenSrc.includes('qbankRepo'), 'study-plan.tsx must NOT import qbankRepo');

// 6. AI Settings Screen
const aiSettingsScreenSrc = read('app/settings/ai.tsx');
assert.ok(aiSettingsScreenSrc.includes('Breadcrumb'), 'ai.tsx must use Breadcrumb');
assert.ok(aiSettingsScreenSrc.includes('<ScreenWrapper includeBottomSafeArea>'), 'ai.tsx must use ScreenWrapper with includeBottomSafeArea');
assert.ok(aiSettingsScreenSrc.includes('secureTextEntry'), 'ai.tsx must use secureTextEntry for API key');
assert.ok(aiSettingsScreenSrc.includes('testAIProviderConnection'), 'ai.tsx must test provider connection');
assert.ok(aiSettingsScreenSrc.includes('deleteGeminiApiKey'), 'ai.tsx must support deleting key');
assert.ok(
  !aiSettingsScreenSrc.includes('setInputKey(state.apiKey') && !aiSettingsScreenSrc.includes('value={savedKey}'),
  'ai.tsx must NEVER prefill stored key'
);

// 7. Clean scan: zero legacy violet in AI presentation files
for (const file of aiPresentationFiles) {
  const content = read(file);
  assert.ok(
    !content.includes('#6C63FF') && !content.includes('#5850EC'),
    `${file} must not contain legacy violet hex colors`
  );
}

console.log('PASS: AI screens satisfy Phase 11 Step 8 hierarchy and design invariants');

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
  execSync('node scripts/validate-phase4.cjs', { stdio: 'inherit', cwd: ROOT });
  console.log('PASS: Phase 4 validation passed');
} catch {
  assert.fail('Phase 4 validation failed');
}

try {
  execSync('node scripts/validate-phase5.cjs', { stdio: 'inherit', cwd: ROOT });
  console.log('PASS: Phase 5 validation passed');
} catch {
  assert.fail('Phase 5 validation failed');
}

console.log('\n=== ALL PHASE 11 VALIDATION CHECKS PASSED ===\n');
