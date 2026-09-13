// MedOS - Phase 14.6G Independent Structural Validation Harness
// This script intentionally distinguishes locked invariant passes, feature readiness,
// and failures in the validator itself. It does not execute application code or write files.

'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const results = [];
const validatorErrors = [];

class ValidationFailure extends Error {}

function read(relativePath) {
  const absolutePath = path.join(root, relativePath);
  try {
    return fs.readFileSync(absolutePath, 'utf8').replace(/\r\n/g, '\n');
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Cannot read ${relativePath}: ${detail}`);
  }
}

function listFiles(relativeDirectory, extensions = new Set(['.ts', '.tsx', '.cjs'])) {
  const start = path.join(root, relativeDirectory);
  const files = [];

  function visit(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(absolutePath);
      else if (extensions.has(path.extname(entry.name))) files.push(absolutePath);
    }
  }

  visit(start);
  return files;
}

function combinedSource(relativeDirectories) {
  return relativeDirectories
    .flatMap((directory) => listFiles(directory))
    .map((absolutePath) => fs.readFileSync(absolutePath, 'utf8').replace(/\r\n/g, '\n'))
    .join('\n');
}

function tableBody(source, tableName) {
  const match = source.match(new RegExp(`CREATE TABLE(?: IF NOT EXISTS)?\\s+${tableName}\\s*\\(([\\s\\S]*?)\\n\\s*\\);`, 'i'));
  requireCondition(match, `${tableName} table declaration was not found`);
  return match[1];
}

function invariant(name, validate) {
  run('invariant', name, validate);
}

function feature(name, validate) {
  run('feature', name, validate);
}

function run(kind, name, validate) {
  try {
    const detail = validate();
    results.push({ kind, name, status: 'pass', detail: detail || '' });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    if (error instanceof ValidationFailure) results.push({ kind, name, status: 'fail', detail });
    else validatorErrors.push(`${name}: ${detail}`);
  }
}

function requireCondition(condition, message) {
  if (!condition) throw new ValidationFailure(message);
}

function extractArrayBody(source, declarationName) {
  const declaration = new RegExp(`(?:const|let|var)\\s+${declarationName}(?:\\s*:[^=]+)?\\s*=\\s*\\[([\\s\\S]*?)\\]\\s*(?:as\\s+const\\s*)?;`);
  const match = source.match(declaration);
  requireCondition(match, `${declarationName} array declaration was not found`);
  return match[1];
}

try {
  const migrations = read('db/migrations.ts');
  const curriculumModels = read('models/curriculum.ts');
  const topicRepo = read('db/repositories/topicRepo.ts');
  const subjectRepo = read('db/repositories/subjectRepo.ts');
  const topicEditor = read('components/curriculum/TopicEditor.tsx');
  const newTopicRoute = read('app/topics/new.tsx');
  const topicList = read('components/curriculum/TopicList.tsx');
  const subjectList = read('components/curriculum/SubjectList.tsx');
  const studySourceRepo = read('db/repositories/studySourceRepo.ts');
  const tabLayout = read('app/(tabs)/_layout.tsx');
  const tabletRail = read('components/layout/TabletNavRail.tsx');
  const focusRoute = read('app/(tabs)/focus.tsx');
  const todayIndex = read('app/(tabs)/index.tsx');
  const todayDashboardImports = [...todayIndex.matchAll(/from\s+['"]@\/components\/dashboard\/([^'"]+)['"]/g)]
    .map((match) => `components/dashboard/${match[1]}.tsx`)
    .filter((relativePath) => fs.existsSync(path.join(root, relativePath)))
    .map(read);
  const todaySurface = [todayIndex, ...todayDashboardImports].join('\n');
  const entitySource = combinedSource(['models', 'db', 'store']);
  const entityAndRoutePaths = ['models', 'db', 'store', 'app']
    .flatMap((directory) => listFiles(directory, new Set(['.ts', '.tsx', '.js', '.cjs', '.sql'])))
    .map((absolutePath) => path.relative(root, absolutePath).replace(/\\/g, '/'));

  invariant('Canonical hierarchy remains Committee -> Subject -> Topic', () => {
    const subjectsTable = tableBody(migrations, 'subjects');
    const topicsTable = tableBody(migrations, 'topics');
    requireCondition(/committee_id\s+TEXT\s+NOT NULL[\s\S]*?REFERENCES committees\(id\)/.test(subjectsTable), 'subjects must belong to committees');
    requireCondition(/subject_id\s+TEXT\s+NOT NULL[\s\S]*?REFERENCES subjects\(id\)/.test(topicsTable), 'topics must belong to subjects');
    requireCondition(/interface Subject\s*\{[\s\S]*?committeeId\s*:\s*string/.test(curriculumModels), 'Subject.committeeId is missing');
    requireCondition(/interface Topic\s*\{[\s\S]*?subjectId\s*:\s*string/.test(curriculumModels), 'Topic.subjectId is missing');
    return 'Subject derives from Committee and Topic derives from Subject in schema and models.';
  });

  invariant('No Concept entity is introduced', () => {
    requireCondition(!/CREATE TABLE(?: IF NOT EXISTS)?\s+["'`]?concepts?["'`]?\b/i.test(migrations), 'Concept table detected');
    requireCondition(!/\b(?:interface|class|type)\s+Concept\b/.test(entitySource), 'Concept model/type detected');
    requireCondition(!/conceptRepo/i.test(entitySource), 'Concept repository detected');
    requireCondition(!entityAndRoutePaths.some((file) => /(?:^|\/)concepts?(?:\/|\.|$)/i.test(file)), 'Concept entity file or route detected');
    return 'No Concept table, model, type, or repository exists.';
  });

  feature('Topic creation works without a pre-supplied subjectId', () => {
    requireCondition(/subjectId\?\s*:/.test(newTopicRoute), 'new Topic route must accept an omitted subjectId');
    requireCondition(!/if\s*\(\s*!id\s*\)\s*\{?\s*setLoaded\(\{\s*status:\s*['\"]missing['\"]/.test(topicEditor), 'TopicEditor still rejects create mode when no parent id is supplied');
    const hasSubjectResolution = /subjectRepo\.(?:listByCommittee|listAll|list)\s*\(/.test(topicEditor)
      || /(?:selected|resolved|chosen)Subject(?:Id)?/i.test(topicEditor);
    requireCondition(hasSubjectResolution, 'unscoped creation has no structural subject-selection/resolution path');
    return 'The create route accepts no subjectId and the editor can resolve a Subject interactively.';
  });

  invariant('Existing subject-scoped Topic creation remains supported', () => {
    requireCondition(/useLocalSearchParams<\{\s*subjectId\?/.test(newTopicRoute), 'subjectId route parameter is not accepted');
    requireCondition(/<TopicEditor[\s\S]*?(?:subjectId\s*=|topicRouteId\(subjectId\))/.test(newTopicRoute), 'subjectId is not forwarded to TopicEditor');
    const scopedLinks = `${topicList}\n${subjectList}`.match(/\/topics\/new\?subjectId=/g) || [];
    requireCondition(scopedLinks.length >= 1, 'existing Subject-scoped add Topic entry point is missing');
    return `${scopedLinks.length} Subject-scoped create links remain wired.`;
  });

  feature('Topic Subject relationship is no longer artificially immutable', () => {
    const updateStatements = [...topicRepo.matchAll(/['"`]UPDATE topics SET[\s\S]*?['"`]/gi)].map((match) => match[0]);
    const mutableStatement = updateStatements.find((statement) => /subject_id\s*=\s*\?/i.test(statement));
    requireCondition(mutableStatement, 'Topic repository has no update or move operation that sets subject_id');
    const hasEditableSubject = /(?:selected|resolved|chosen)Subject(?:Id)?/i.test(topicEditor)
      || /subjectId[\s\S]*on(?:Change|Select)/i.test(topicEditor);
    requireCondition(hasEditableSubject, 'Topic edit flow exposes no structural Subject reassignment control');
    return 'Repository and edit flow both support reassignment to a valid Subject.';
  });

  invariant('Committee is derived from Subject', () => {
    const topicInterface = curriculumModels.match(/interface Topic\s*\{([\s\S]*?)\}/)?.[1] || '';
    const topicsTable = tableBody(migrations, 'topics');
    requireCondition(!/\bcommitteeId\s*:/.test(topicInterface), 'Topic duplicates committeeId');
    requireCondition(!/\bcommittee_id\b/.test(topicsTable), 'topics table duplicates committee_id');
    requireCondition(/subject\.committeeId/.test(topicEditor), 'TopicEditor does not derive Committee from Subject');
    requireCondition(/committee_id/.test(subjectRepo), 'Subject repository has no Committee relationship');
    return 'Topic carries subjectId only; Committee context is resolved through Subject.';
  });

  feature('Today quick-create resolves to the newly created Topic Detail', () => {
    const todayStartsCreate = /\/topics\/new(?:\?|['"`])/.test(todaySurface)
      || /topicRepo\.insert\s*\(/.test(todaySurface);
    requireCondition(todayStartsCreate, 'Today exposes no Topic quick-create entry point');
    const creationSources = `${todaySurface}\n${topicEditor}\n${newTopicRoute}`;
    const routeExpressions = [...creationSources.matchAll(/router\.(?:push|replace|dismissTo)\s*\(\s*`\/topics\/\$\{([^}]+)\}`/g)]
      .map((match) => match[1].trim());
    const routesToCreatedTopic = routeExpressions.some((expression) => {
      const rootIdentifier = expression.match(/^[A-Za-z_$][\w$]*/)?.[0];
      if (!rootIdentifier) return false;
      const escaped = rootIdentifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(`topicRepo\\.insert\\s*\\([\\s\\S]{0,500}\\b${escaped}\\b|\\b${escaped}\\b[\\s\\S]{0,500}topicRepo\\.insert\\s*\\(`).test(creationSources);
    });
    requireCondition(routesToCreatedTopic, 'successful quick-create does not structurally route to the created /topics/{id} detail');
    return 'Today starts creation and success targets the newly created Topic Detail.';
  });

  invariant('Optional material flow remains Topic-owned', () => {
    const studySourcesTable = tableBody(migrations, 'study_sources');
    requireCondition(/topic_id\s+TEXT\s+NOT NULL[\s\S]*?REFERENCES topics\(id\)/.test(studySourcesTable), 'study_sources.topic_id is not a required Topic foreign key');
    requireCondition(!/\b(?:subject_id|committee_id)\b/.test(studySourcesTable), 'study_sources duplicates Subject or Committee ownership');
    requireCondition(/input\.topicId/.test(studySourceRepo) && /topic_id_required/.test(studySourceRepo), 'study source creation does not require Topic ownership');
    requireCondition(/SELECT id FROM topics WHERE id = \?/.test(studySourceRepo), 'study source creation does not verify its Topic');
    return 'Materials remain optional child records keyed to an existing Topic.';
  });

  invariant('Phase 14.6F primary destinations remain exactly TODAY / ATLAS / PRACTICE / PLAN', () => {
    const primaryBody = extractArrayBody(tabLayout, 'PRIMARY_TABS');
    const primaryPairs = [...primaryBody.matchAll(/\{\s*name\s*:\s*['"]([^'"]+)['"][\s\S]*?titleKey\s*:\s*['"]([^'"]+)['"][\s\S]*?\}/g)]
      .map((match) => [match[1], match[2]]);
    const expectedPrimaryPairs = [['index', 'today'], ['committees', 'atlas'], ['practice', 'practice'], ['calendar', 'plan']];
    requireCondition(JSON.stringify(primaryPairs) === JSON.stringify(expectedPrimaryPairs), `phone primary destinations are ${JSON.stringify(primaryPairs)}`);

    const railBody = extractArrayBody(tabletRail, 'destinations');
    const railPairs = [...railBody.matchAll(/\{[\s\S]*?href\s*:\s*['"]([^'"]+)['"][\s\S]*?label\s*:\s*t\.tabs\.([A-Za-z0-9_]+)[\s\S]*?\}/g)]
      .map((match) => [match[1], match[2]]);
    const expectedRailPairs = [['/(tabs)', 'today'], ['/(tabs)/committees', 'atlas'], ['/(tabs)/practice', 'practice'], ['/(tabs)/calendar', 'plan']];
    requireCondition(JSON.stringify(railPairs) === JSON.stringify(expectedRailPairs), `tablet primary destinations are ${JSON.stringify(railPairs)}`);
    return 'Phone tabs and tablet rail expose the same four locked destinations in order.';
  });

  invariant('Focus remains non-primary and immersive', () => {
    const primaryBody = extractArrayBody(tabLayout, 'PRIMARY_TABS');
    requireCondition(!/['\"]focus['\"]/.test(primaryBody), 'Focus appears in PRIMARY_TABS');
    const hiddenBody = extractArrayBody(tabLayout, 'HIDDEN_ROUTES');
    requireCondition(/name\s*:\s*['\"]focus['\"]/.test(hiddenBody), 'Focus is not declared as a hidden route');
    requireCondition(/name\s*:\s*['\"]ai['\"]/.test(hiddenBody), 'Ask MedOS is not declared as a contextual hidden route');
    requireCondition(/options=\{\{\s*href:\s*null\s*\}\}/.test(tabLayout), 'hidden routes are not suppressed with href:null');
    requireCondition(/isTablet\s*\|\|\s*isFocusRoute\s*\?\s*['"]none['"]\s*:\s*['"]flex['"]/.test(tabLayout), 'Focus does not suppress the phone tab bar');
    requireCondition(/visible=\{!isFocusRoute\}/.test(tabLayout), 'Focus does not suppress the tablet rail');
    requireCondition(/returnTo\s*=\s*['"]\/\(tabs\)\/practice['"]/.test(focusRoute), 'Focus does not return to Practice by default');
    return 'Focus is hidden from primary tabs and suppresses navigation while active.';
  });
} catch (error) {
  const detail = error instanceof Error ? error.stack || error.message : String(error);
  validatorErrors.push(detail);
}

console.log('=== PHASE 14.6G: INDEPENDENT STRUCTURAL VALIDATION ===\n');

for (const result of results) {
  if (result.status === 'pass') {
    const label = result.kind === 'invariant' ? 'EXISTING INVARIANT PASS' : 'FEATURE PASS';
    console.log(`[${label}] ${result.name}`);
  } else {
    const label = result.kind === 'feature' ? 'EXPECTED PRE-IMPLEMENTATION FAILURE' : 'INVARIANT FAILURE';
    console.log(`[${label}] ${result.name}`);
    console.log(`  ${result.detail}`);
  }
}

for (const error of validatorErrors) {
  console.error('[VALIDATOR ERROR] Independent harness could not complete');
  console.error(`  ${error}`);
}

const invariantPasses = results.filter((result) => result.kind === 'invariant' && result.status === 'pass').length;
const invariantFailures = results.filter((result) => result.kind === 'invariant' && result.status === 'fail').length;
const featurePasses = results.filter((result) => result.kind === 'feature' && result.status === 'pass').length;
const featureFailures = results.filter((result) => result.kind === 'feature' && result.status === 'fail').length;

console.log('\n------------------------------------------------------------');
console.log(`Existing invariant pass: ${invariantPasses}`);
console.log(`Invariant failure: ${invariantFailures}`);
console.log(`Feature pass: ${featurePasses}`);
console.log(`Expected pre-implementation failure: ${featureFailures}`);
console.log(`Validator error: ${validatorErrors.length}`);
console.log('------------------------------------------------------------');

if (validatorErrors.length > 0) process.exitCode = 2;
else if (invariantFailures > 0) process.exitCode = 3;
else if (featureFailures > 0) process.exitCode = 1;
