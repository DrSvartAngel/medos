/**
 * MedOS — Phase 10 Step 3 Validation Suite
 *
 * Validates Study Source Ingestion + Management UI:
 * - TOPIC INTEGRATION: Study Sources section exists in app/topics/[id].tsx, Add Source action exists,
 *   source list uses studySourceRepo.getByTopic, focus refresh lifecycle exists, no N+1 query loop.
 * - CREATE: app/topics/[id]/sources/new.tsx exists, title & content required, insert called,
 *   source type selectable, safe back fallback, bottom safe area enabled.
 * - EDIT: app/topics/[id]/sources/[sourceId].tsx exists, source loaded by ID, update works,
 *   missing source truthful state, createdAt not manually changed.
 * - DELETE: Alert confirmation exists, delete called, navigation returns safely.
 * - REUSABLE EDITOR: StudySourceEditor component handles title, source type radio selector, multiline content.
 * - ERRORS: Localized safe messages, raw SQLite error strings never exposed.
 * - LOCALIZATION: Strict EN/TR parity in studySources dictionary.
 * - ACCESSIBILITY: Meaningful accessibilityLabel, accessibilityRole, and accessibilityState on controls.
 * - ISOLATION: No network fetch, no real AI providers, no API keys, no PDF parsers, no AI generation calls.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { DatabaseSync } = require('node:sqlite');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');

function load(file, mocks = {}, source = read(file)) {
  const output = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
    },
    fileName: file,
  }).outputText;
  const module = { exports: {} };
  const wrapped = vm.runInThisContext(
    '(function(require,module,exports,__filename,__dirname){' + output + '\n})',
    { filename: file }
  );
  wrapped(
    (key) => (Object.hasOwn(mocks, key) ? mocks[key] : require(key)),
    module,
    module.exports,
    file,
    path.dirname(file)
  );
  return module.exports;
}

class SQLiteAdapter {
  constructor() {
    this.db = new DatabaseSync(':memory:');
  }
  execSync(sql) {
    this.db.exec(sql);
  }
  runSync(sql, values = []) {
    return this.db.prepare(sql).run(...values);
  }
  getFirstSync(sql, values = []) {
    return this.db.prepare(sql).get(...values);
  }
  getAllSync(sql, values = []) {
    return this.db.prepare(sql).all(...values);
  }
  withTransactionSync(work) {
    this.db.exec('BEGIN');
    try {
      work();
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }
  closeSync() {
    this.db.close();
  }
}

const calendarDate = load('utils/calendarDate.ts');

function migrate(db) {
  return load('db/migrations.ts', {
    './client': { getDB: () => db },
    '@/utils/calendarDate': calendarDate,
  }).runMigrations();
}

function createStudySourceRepo(db) {
  return load('db/repositories/studySourceRepo.ts', {
    '../client': { getDB: () => db },
    '@/models/studySource': {},
  }).studySourceRepo;
}

let passed = 0;
async function check(name, fn) {
  try {
    await fn();
    console.log(`PASS ${name}`);
    passed++;
  } catch (err) {
    console.error(`\nFAIL: ${name}\n${err.stack || err}`);
    process.exit(1);
  }
}

async function main() {
  console.log('=== PHASE 10 STEP 3: STUDY SOURCE INGESTION + MANAGEMENT UI SUITE ===\n');

  const topicDetailCode = read('app/topics/[id].tsx');
  const newSourceCode = read('app/topics/[id]/sources/new.tsx');
  const detailSourceCode = read('app/topics/[id]/sources/[sourceId].tsx');
  const editorCode = read('components/study-sources/StudySourceEditor.tsx');
  const enCode = read('i18n/en.ts');
  const trCode = read('i18n/tr.ts');

  // ── 1. TOPIC DETAIL INTEGRATION ──────────────────────────────────────────────
  await check('Topic Integration: Section, Add action, getByTopic, and focus refresh exist', () => {
    // Check Study Sources section title and Add Source button
    assert.match(topicDetailCode, /t\.studySources\.title/, 'Topic detail must reference t.studySources.title');
    assert.match(topicDetailCode, /t\.studySources\.addSource/, 'Topic detail must have Add Source button');
    assert.match(topicDetailCode, /\/sources\/new/, 'Topic detail must link to /sources/new route');

    // Check studySourceRepo.getByTopic is used
    assert.match(topicDetailCode, /studySourceRepo\.getByTopic\(id\)/, 'Topic detail must load sources via studySourceRepo.getByTopic(id)');

    // Check empty state handled
    assert.match(topicDetailCode, /t\.studySources\.empty/, 'Topic detail must handle empty sources state');

    // Check load error handled
    assert.match(topicDetailCode, /t\.studySources\.loadError/, 'Topic detail must handle load error state');

    // Check focus refresh behavior: loadSources is invoked inside load, which is triggered by useFocusEffect
    assert.match(topicDetailCode, /loadSources\(\)/, 'loadSources must be called inside load callback');
    assert.match(topicDetailCode, /useFocusEffect/, 'useFocusEffect must be active on Topic detail');

    // Verify no N+1 secondary query loop over individual sources
    assert.ok(!topicDetailCode.includes('studySourceRepo.getById'), 'Topic detail should not loop getById calls');
  });

  // ── 2. CREATE SOURCE ROUTE ───────────────────────────────────────────────────
  await check('Create Route: new.tsx exists with required fields, insert call, safe back, and safe area', () => {
    assert.ok(fs.existsSync(path.join(root, 'app/topics/[id]/sources/new.tsx')), 'new.tsx must exist');

    // Title and content required validation in StudySourceEditor
    assert.match(editorCode, /t\.studySources\.titleRequired/, 'Editor must validate title is required');
    assert.match(editorCode, /t\.studySources\.contentRequired/, 'Editor must validate content is required');

    // Insert call in new.tsx
    assert.match(newSourceCode, /studySourceRepo\.insert\(/, 'new.tsx must call studySourceRepo.insert');

    // Safe back navigation with fallback
    assert.match(newSourceCode, /router\.canGoBack\(\)/, 'new.tsx must check router.canGoBack()');
    assert.match(newSourceCode, /router\.back\(\)/, 'new.tsx must navigate router.back()');
    assert.match(newSourceCode, /router\.replace\(/, 'new.tsx must provide fallback replace navigation');

    // ScreenWrapper with bottom safe area
    assert.match(newSourceCode, /<ScreenWrapper[^>]*includeBottomSafeArea/, 'new.tsx must includeBottomSafeArea');
  });

  // ── 3. DETAIL / EDIT ROUTE ───────────────────────────────────────────────────
  await check('Detail / Edit Route: [sourceId].tsx exists with getById, update, truthful not-found, and delete', () => {
    assert.ok(fs.existsSync(path.join(root, 'app/topics/[id]/sources/[sourceId].tsx')), '[sourceId].tsx must exist');

    // Source loaded by ID
    assert.match(detailSourceCode, /studySourceRepo\.getById\(sourceId\)/, '[sourceId].tsx must load source by ID');

    // Update called on save
    assert.match(detailSourceCode, /studySourceRepo\.update\(/, '[sourceId].tsx must call studySourceRepo.update');

    // Truthful not found state
    assert.match(detailSourceCode, /t\.studySources\.notFound/, '[sourceId].tsx must render t.studySources.notFound when missing');

    // Delete confirmation alert and call
    assert.match(detailSourceCode, /Alert\.alert\(/, '[sourceId].tsx must show confirmation alert on delete');
    assert.match(detailSourceCode, /studySourceRepo\.delete\(/, '[sourceId].tsx must call studySourceRepo.delete');
    assert.match(detailSourceCode, /t\.studySources\.deleteConfirm/, '[sourceId].tsx must reference localized deleteConfirm');

    // ScreenWrapper with bottom safe area
    assert.match(detailSourceCode, /<ScreenWrapper[^>]*includeBottomSafeArea/, '[sourceId].tsx must includeBottomSafeArea');
  });

  // ── 4. REUSABLE EDITOR COMPONENT ─────────────────────────────────────────────
  await check('StudySourceEditor: Controls for title, source type radio options, multiline content, and submit', () => {
    assert.ok(fs.existsSync(path.join(root, 'components/study-sources/StudySourceEditor.tsx')), 'StudySourceEditor.tsx must exist');

    // Source types: text, note, document
    assert.match(editorCode, /'text'/, 'Editor must support text type');
    assert.match(editorCode, /'note'/, 'Editor must support note type');
    assert.match(editorCode, /'document'/, 'Editor must support document type');

    // Source type selector has accessible radio semantics
    assert.match(editorCode, /accessibilityRole="radiogroup"/, 'Editor must have radiogroup container');
    assert.match(editorCode, /accessibilityRole="radio"/, 'Editor options must have radio role');
    assert.match(editorCode, /accessibilityState=\{\{\s*selected:/, 'Editor options must express selected state');

    // Content input is multiline without fixed clipping
    assert.match(editorCode, /multiline/, 'Content input must be multiline');
    assert.match(editorCode, /scrollEnabled=\{false\}/, 'Content input should expand smoothly inside parent scrollview');
  });

  // ── 5. RUNTIME DATABASE & REPOSITORY BEHAVIOR ────────────────────────────────
  await check('Runtime Database: Ingest, list, edit, and delete lifecycle verifies createdAt integrity', () => {
    const db = new SQLiteAdapter();
    try {
      db.execSync('PRAGMA foreign_keys = ON');
      migrate(db);
      const repo = createStudySourceRepo(db);

      // Setup hierarchy
      db.runSync("INSERT INTO committees (id, name, subject, created_at) VALUES ('c1', 'Pathology', 'Medicine', 1000)");
      db.runSync("INSERT INTO subjects (id, committee_id, name, created_at, updated_at) VALUES ('s1', 'c1', 'Cell Injury', 1000, 1000)");
      db.runSync("INSERT INTO topics (id, subject_id, name, created_at, updated_at) VALUES ('t1', 's1', 'Necrosis vs Apoptosis', 1000, 1000)");

      // 1. Create source
      const created = repo.insert({
        topicId: 't1',
        title: 'Robbins Chapter 2',
        content: 'Coagulative necrosis occurs in ischemic tissue except brain.',
        sourceType: 'document',
      });
      assert.ok(created.id);
      assert.equal(created.sourceType, 'document');
      const originalCreatedAt = created.createdAt;

      // 2. Read back
      const fetched = repo.getById(created.id);
      assert.ok(fetched);
      assert.equal(fetched.title, 'Robbins Chapter 2');

      // 3. List
      const list = repo.getByTopic('t1');
      assert.equal(list.length, 1);
      assert.equal(list[0].id, created.id);

      // 4. Update
      const updated = repo.update(created.id, {
        title: 'Robbins Chapter 2 Summary',
        content: 'Coagulative necrosis: ischemia in all organs except brain (liquefactive).',
        sourceType: 'note',
      });
      assert.ok(updated);
      assert.equal(updated.title, 'Robbins Chapter 2 Summary');
      assert.equal(updated.sourceType, 'note');
      assert.equal(updated.createdAt, originalCreatedAt, 'createdAt must NOT be modified on update');
      assert.ok(updated.updatedAt >= originalCreatedAt, 'updatedAt must be >= createdAt');

      // 5. Delete
      const deleted = repo.delete(created.id);
      assert.equal(deleted, true);
      assert.equal(repo.getById(created.id), null);
      assert.equal(repo.getByTopic('t1').length, 0);
    } finally {
      db.closeSync();
    }
  });

  // ── 6. ERROR HANDLING AND SAFE STRINGS ───────────────────────────────────────
  await check('Error Handling: UI components catch errors safely without exposing raw SQLite strings', () => {
    // Ensure raw SQLite error markers are not exposed in UI files
    const forbiddenPatterns = [
      'SQLITE_ERROR',
      'SQLITE_CONSTRAINT',
      'no such table',
      'FOREIGN KEY constraint failed',
      'CHECK constraint failed',
    ];

    for (const pattern of forbiddenPatterns) {
      assert.ok(!topicDetailCode.includes(pattern), `topicDetailCode must not expose ${pattern}`);
      assert.ok(!newSourceCode.includes(pattern), `newSourceCode must not expose ${pattern}`);
      assert.ok(!detailSourceCode.includes(pattern), `detailSourceCode must not expose ${pattern}`);
      assert.ok(!editorCode.includes(pattern), `editorCode must not expose ${pattern}`);
    }

    // UI catch blocks use localized error strings
    assert.match(newSourceCode, /t\.studySources\.saveError/, 'new.tsx catch must use localized saveError');
    assert.match(detailSourceCode, /t\.studySources\.saveError/, '[sourceId].tsx catch must use localized saveError');
    assert.match(detailSourceCode, /t\.studySources\.deleteError/, '[sourceId].tsx catch must use localized deleteError');
  });

  // ── 7. LOCALIZATION PARITY ───────────────────────────────────────────────────
  await check('Localization: Full EN and TR parity for studySources dictionary', () => {
    const en = load('i18n/en.ts').default;
    const tr = load('i18n/tr.ts').default;

    assert.ok(en.studySources, 'i18n/en.ts must have studySources');
    assert.ok(tr.studySources, 'i18n/tr.ts must have studySources');

    const requiredKeys = [
      'title',
      'addSource',
      'editSource',
      'sourceTitle',
      'sourceTitlePlaceholder',
      'content',
      'contentPlaceholder',
      'sourceType',
      'text',
      'note',
      'document',
      'save',
      'delete',
      'deleteTitle',
      'deleteConfirm',
      'empty',
      'notFound',
      'loadError',
      'saveError',
      'deleteError',
      'titleRequired',
      'contentRequired',
      'openSource',
      'updatedAt',
    ];

    for (const key of requiredKeys) {
      assert.ok(key in en.studySources, `en.studySources missing key: ${key}`);
      assert.ok(key in tr.studySources, `tr.studySources missing key: ${key}`);
      assert.equal(
        typeof en.studySources[key],
        typeof tr.studySources[key],
        `Type mismatch for key: ${key}`
      );
    }

    // Test functional strings
    assert.equal(typeof en.studySources.deleteConfirm('X'), 'string');
    assert.equal(typeof tr.studySources.deleteConfirm('X'), 'string');
    assert.equal(typeof en.studySources.openSource('X'), 'string');
    assert.equal(typeof tr.studySources.openSource('X'), 'string');
    assert.equal(typeof en.studySources.updatedAt('2026-09-07'), 'string');
    assert.equal(typeof tr.studySources.updatedAt('2026-09-07'), 'string');
  });

  // ── 8. ACCESSIBILITY SEMANTICS ───────────────────────────────────────────────
  await check('Accessibility: Controls, inputs, and list rows provide meaningful roles and labels', () => {
    // Topic detail row accessibility
    assert.match(topicDetailCode, /accessibilityRole="button"/, 'Topic source rows must have button role');
    assert.match(topicDetailCode, /accessibilityLabel=\{t\.studySources\.openSource\(source\.title\)\}/, 'Source rows must have accessible open label');

    // Editor inputs
    assert.match(editorCode, /accessibilityLabel=\{t\.studySources\.sourceTitle\}/, 'Title input must have accessible label');
    assert.match(editorCode, /accessibilityLabel=\{t\.studySources\.content\}/, 'Content input must have accessible label');
    assert.match(editorCode, /accessibilityRole="radiogroup"/, 'Radio group container role');
    assert.match(editorCode, /accessibilityRole="radio"/, 'Radio item role');

    // Detail actions
    assert.match(detailSourceCode, /label=\{t\.common\.edit\}/, 'Edit button must have label');
    assert.match(detailSourceCode, /label=\{t\.studySources\.delete\}/, 'Delete button must have label');
  });

  // ── 9. ISOLATION & SECURITY ──────────────────────────────────────────────────
  await check('Isolation: Zero network fetch, real AI providers, API keys, or PDF parsers', () => {
    const inspectedFiles = [
      'app/topics/[id].tsx',
      'app/topics/[id]/sources/new.tsx',
      'app/topics/[id]/sources/[sourceId].tsx',
      'components/study-sources/StudySourceEditor.tsx',
    ];

    const forbidden = [
      'fetch(',
      'axios',
      'XMLHttpRequest',
      '@google/generative-ai',
      'openai',
      'anthropic',
      'pdf-parse',
      'pdfjs',
      'expo-document-picker',
      'process.env.GEMINI_API_KEY',
      'process.env.OPENAI_API_KEY',
    ];

    for (const file of inspectedFiles) {
      const code = read(file);
      for (const token of forbidden) {
        assert.ok(!code.includes(token), `${file} must not contain ${token}`);
      }
    }
  });

  console.log(`\nAll ${passed} Phase 10 Step 3 validation checks passed successfully!`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
