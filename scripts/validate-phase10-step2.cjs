/**
 * MedOS — Phase 10 Step 2 Validation Suite
 *
 * Validates Study Sources Data Layer (Schema v12):
 * - Schema v12 migration: study_sources table, columns, check constraints, topic FK, index
 * - Repository CRUD operations (insert, getById, getByTopic, countByTopic, update, delete)
 * - Validation rules (trimmed non-empty title/content, allowed source_types, topic existence)
 * - Deletion cascade semantics (Topic deletion cascades to study_sources; Committee cascades down)
 * - AI source context adapter (toAISourceContext pure mapping)
 * - Absence of draft persistence tables (MVP keeps drafts in-memory)
 * - Security & network isolation
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
    console.error(`\nFAIL: ${err}`);
    process.exit(1);
  }
}

async function main() {
  console.log('=== PHASE 10 STEP 2: STUDY SOURCES DATA LAYER SUITE ===\n');

  // ── 1. SCHEMA INTEGRITY & CONSTRAINTS ────────────────────────────────────────
  await check('Schema: CURRENT_VERSION is 12, study_sources table exists with strict constraints and index', () => {
    const db = new SQLiteAdapter();
    try {
      db.execSync('PRAGMA foreign_keys = ON');
      migrate(db);

      // Verify schema version is 12
      const versionRow = db.getFirstSync('SELECT version FROM _schema_version LIMIT 1');
      assert.equal(versionRow.version, 12, 'Schema version must advance to 12');

      const migrations = load('db/migrations.ts', {
        './client': { getDB: () => db },
        '@/utils/calendarDate': calendarDate,
      });
      assert.equal(migrations.CURRENT_VERSION, 12, 'CURRENT_VERSION constant must be 12');

      // Verify columns in study_sources
      const cols = db.getAllSync('PRAGMA table_info(study_sources)');
      const colMap = new Map(cols.map((c) => [c.name, c.type]));
      assert.ok(colMap.has('id'), 'study_sources must have id');
      assert.ok(colMap.has('topic_id'), 'study_sources must have topic_id');
      assert.ok(colMap.has('title'), 'study_sources must have title');
      assert.ok(colMap.has('content'), 'study_sources must have content');
      assert.ok(colMap.has('source_type'), 'study_sources must have source_type');
      assert.ok(colMap.has('created_at'), 'study_sources must have created_at');
      assert.ok(colMap.has('updated_at'), 'study_sources must have updated_at');

      // Verify index exists
      const indexRow = db.getFirstSync(
        "SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'idx_study_sources_topic_created'"
      );
      assert.ok(indexRow, 'idx_study_sources_topic_created index must exist');

      // Setup curriculum row for DB constraint testing
      db.runSync("INSERT INTO committees (id, name, subject, created_at) VALUES ('c1', 'Cardiology', 'Medicine', 1000)");
      db.runSync("INSERT INTO subjects (id, committee_id, name, created_at, updated_at) VALUES ('s1', 'c1', 'Physiology', 1000, 1000)");
      db.runSync("INSERT INTO topics (id, subject_id, name, created_at, updated_at) VALUES ('t1', 's1', 'Action Potentials', 1000, 1000)");

      // Check constraint: invalid source_type rejected by DB
      assert.throws(() => {
        db.runSync(
          "INSERT INTO study_sources (id, topic_id, title, content, source_type, created_at, updated_at) VALUES ('ss1', 't1', 'Title', 'Content', 'video', 1000, 1000)"
        );
      }, /CHECK constraint failed/);

      // Check constraint: empty/whitespace title rejected by DB
      assert.throws(() => {
        db.runSync(
          "INSERT INTO study_sources (id, topic_id, title, content, source_type, created_at, updated_at) VALUES ('ss2', 't1', '   ', 'Content', 'text', 1000, 1000)"
        );
      }, /CHECK constraint failed/);

      // Check constraint: empty/whitespace content rejected by DB
      assert.throws(() => {
        db.runSync(
          "INSERT INTO study_sources (id, topic_id, title, content, source_type, created_at, updated_at) VALUES ('ss3', 't1', 'Title', '   ', 'text', 1000, 1000)"
        );
      }, /CHECK constraint failed/);

      // Foreign key constraint: orphan topic_id rejected by DB
      assert.throws(() => {
        db.runSync(
          "INSERT INTO study_sources (id, topic_id, title, content, source_type, created_at, updated_at) VALUES ('ss4', 'unknown_topic', 'Title', 'Content', 'text', 1000, 1000)"
        );
      }, /FOREIGN KEY constraint failed/);
    } finally {
      db.closeSync();
    }
  });

  // ── 2. REPOSITORY INSERT & VALIDATION ────────────────────────────────────────
  await check('Repository: Insert valid sources with default and explicit types, and input validation', () => {
    const db = new SQLiteAdapter();
    try {
      db.execSync('PRAGMA foreign_keys = ON');
      migrate(db);
      const repo = createStudySourceRepo(db);

      db.runSync("INSERT INTO committees (id, name, subject, created_at) VALUES ('c1', 'Cardiology', 'Medicine', 1000)");
      db.runSync("INSERT INTO subjects (id, committee_id, name, created_at, updated_at) VALUES ('s1', 'c1', 'Physiology', 1000, 1000)");
      db.runSync("INSERT INTO topics (id, subject_id, name, created_at, updated_at) VALUES ('t1', 's1', 'Action Potentials', 1000, 1000)");

      // 1. Insert with default sourceType ('text')
      const s1 = repo.insert({
        topicId: 't1',
        title: 'Lecture 1 Notes',
        content: 'Phase 0 sodium influx causes depolarization.',
      });
      assert.ok(s1.id, 'Inserted source must have an id');
      assert.equal(s1.topicId, 't1');
      assert.equal(s1.title, 'Lecture 1 Notes');
      assert.equal(s1.content, 'Phase 0 sodium influx causes depolarization.');
      assert.equal(s1.sourceType, 'text', 'Default sourceType must be text');
      assert.equal(typeof s1.createdAt, 'number');
      assert.equal(s1.createdAt, s1.updatedAt);

      // 2. Insert with explicit 'note' type
      const s2 = repo.insert({
        topicId: 't1',
        title: 'Quick Note',
        content: 'Remember L-type calcium channels in Phase 2.',
        sourceType: 'note',
      });
      assert.equal(s2.sourceType, 'note');

      // 3. Insert with explicit 'document' type
      const s3 = repo.insert({
        topicId: 't1',
        title: 'Chapter Excerpt',
        content: 'Guyton Physiology chapter on cardiac muscle.',
        sourceType: 'document',
      });
      assert.equal(s3.sourceType, 'document');

      // 4. Reject invalid sourceType
      assert.throws(() => {
        repo.insert({
          topicId: 't1',
          title: 'Title',
          content: 'Content',
          sourceType: 'podcast',
        });
      }, /invalid_source_type/);

      // 5. Reject empty title
      assert.throws(() => {
        repo.insert({
          topicId: 't1',
          title: '   ',
          content: 'Content',
        });
      }, /title_required/);

      // 6. Reject empty content
      assert.throws(() => {
        repo.insert({
          topicId: 't1',
          title: 'Title',
          content: '   ',
        });
      }, /content_required/);

      // 7. Reject non-existent topic
      assert.throws(() => {
        repo.insert({
          topicId: 'non_existent_topic',
          title: 'Title',
          content: 'Content',
        });
      }, /topic_not_found/);
    } finally {
      db.closeSync();
    }
  });

  // ── 3. REPOSITORY QUERY OPERATIONS ──────────────────────────────────────────
  await check('Repository: Query methods (getById, getByTopic, countByTopic) with deterministic ordering', () => {
    const db = new SQLiteAdapter();
    try {
      db.execSync('PRAGMA foreign_keys = ON');
      migrate(db);
      const repo = createStudySourceRepo(db);

      db.runSync("INSERT INTO committees (id, name, subject, created_at) VALUES ('c1', 'Neuro', 'Medicine', 1000)");
      db.runSync("INSERT INTO subjects (id, committee_id, name, created_at, updated_at) VALUES ('s1', 'c1', 'Anatomy', 1000, 1000)");
      db.runSync("INSERT INTO topics (id, subject_id, name, created_at, updated_at) VALUES ('t1', 's1', 'Cranial Nerves', 1000, 1000)");
      db.runSync("INSERT INTO topics (id, subject_id, name, created_at, updated_at) VALUES ('t2', 's1', 'Basal Ganglia', 1000, 1000)");

      // Initial counts
      assert.equal(repo.countByTopic('t1'), 0);
      assert.equal(repo.getByTopic('t1').length, 0);

      // Insert 2 sources for t1, 1 for t2
      const s1 = repo.insert({ topicId: 't1', title: 'Source 1', content: 'CN VII passes through internal acoustic meatus.' });
      const s2 = repo.insert({ topicId: 't1', title: 'Source 2', content: 'CN III innervates superior rectus.' });
      const s3 = repo.insert({ topicId: 't2', title: 'Source 3', content: 'Subthalamic nucleus stimulates GPi.' });

      // getById
      const fetchedS1 = repo.getById(s1.id);
      assert.deepEqual(fetchedS1, s1);
      assert.equal(repo.getById('unknown_id'), null);
      assert.equal(repo.getById(''), null);

      // getByTopic
      const t1Sources = repo.getByTopic('t1');
      assert.equal(t1Sources.length, 2);
      // Newest first
      assert.equal(t1Sources[0].id, s2.id);
      assert.equal(t1Sources[1].id, s1.id);

      const t2Sources = repo.getByTopic('t2');
      assert.equal(t2Sources.length, 1);
      assert.equal(t2Sources[0].id, s3.id);

      // countByTopic
      assert.equal(repo.countByTopic('t1'), 2);
      assert.equal(repo.countByTopic('t2'), 1);
      assert.equal(repo.countByTopic('non_existent'), 0);
    } finally {
      db.closeSync();
    }
  });

  // ── 4. REPOSITORY UPDATE & DELETE ───────────────────────────────────────────
  await check('Repository: Update preserves createdAt, advances updatedAt; Delete works cleanly', () => {
    const db = new SQLiteAdapter();
    try {
      db.execSync('PRAGMA foreign_keys = ON');
      migrate(db);
      const repo = createStudySourceRepo(db);

      db.runSync("INSERT INTO committees (id, name, subject, created_at) VALUES ('c1', 'Endo', 'Medicine', 1000)");
      db.runSync("INSERT INTO subjects (id, committee_id, name, created_at, updated_at) VALUES ('s1', 'c1', 'Physiology', 1000, 1000)");
      db.runSync("INSERT INTO topics (id, subject_id, name, created_at, updated_at) VALUES ('t1', 's1', 'Thyroid', 1000, 1000)");

      const original = repo.insert({
        topicId: 't1',
        title: 'Original Title',
        content: 'Original Content',
        sourceType: 'text',
      });

      // Update title
      const updated1 = repo.update(original.id, { title: 'Updated Title' });
      assert.ok(updated1);
      assert.equal(updated1.title, 'Updated Title');
      assert.equal(updated1.content, 'Original Content');
      assert.equal(updated1.sourceType, 'text');
      assert.equal(updated1.createdAt, original.createdAt, 'createdAt must remain unchanged');
      assert.ok(updated1.updatedAt >= original.createdAt, 'updatedAt must advance');

      // Update content and sourceType
      const updated2 = repo.update(original.id, { content: 'New Content', sourceType: 'document' });
      assert.ok(updated2);
      assert.equal(updated2.title, 'Updated Title');
      assert.equal(updated2.content, 'New Content');
      assert.equal(updated2.sourceType, 'document');

      // Validation on update: empty title rejected
      assert.throws(() => {
        repo.update(original.id, { title: '   ' });
      }, /title_required/);

      // Validation on update: invalid sourceType rejected
      assert.throws(() => {
        repo.update(original.id, { sourceType: 'audio' });
      }, /invalid_source_type/);

      // Update unknown ID returns null
      assert.equal(repo.update('non_existent', { title: 'Test' }), null);

      // Delete
      assert.equal(repo.delete(original.id), true);
      assert.equal(repo.getById(original.id), null);
      assert.equal(repo.delete(original.id), false, 'Deleting already deleted source returns false');
      assert.equal(repo.delete('unknown'), false);
    } finally {
      db.closeSync();
    }
  });

  // ── 5. CASCADE DELETION SEMANTICS ───────────────────────────────────────────
  await check('Cascade: Deleting Topic or Committee hierarchy cascades down to StudySources', () => {
    const db = new SQLiteAdapter();
    try {
      db.execSync('PRAGMA foreign_keys = ON');
      migrate(db);
      const repo = createStudySourceRepo(db);

      // 1. Topic deletion cascade
      db.runSync("INSERT INTO committees (id, name, subject, created_at) VALUES ('c1', 'Resp', 'Medicine', 1000)");
      db.runSync("INSERT INTO subjects (id, committee_id, name, created_at, updated_at) VALUES ('s1', 'c1', 'Physio', 1000, 1000)");
      db.runSync("INSERT INTO topics (id, subject_id, name, created_at, updated_at) VALUES ('t1', 's1', 'Ventilation', 1000, 1000)");

      const s1 = repo.insert({ topicId: 't1', title: 'V/Q ratio', content: 'V/Q is highest at the apex.' });
      const s2 = repo.insert({ topicId: 't1', title: 'Compliance', content: 'Surfactant reduces surface tension.' });
      assert.equal(repo.countByTopic('t1'), 2);

      // Delete topic
      db.runSync('DELETE FROM topics WHERE id = ?', ['t1']);
      assert.equal(repo.countByTopic('t1'), 0);
      assert.equal(repo.getById(s1.id), null, 'Source 1 must be cascade deleted');
      assert.equal(repo.getById(s2.id), null, 'Source 2 must be cascade deleted');

      // 2. Committee deletion cascade
      db.runSync("INSERT INTO committees (id, name, subject, created_at) VALUES ('c2', 'Renal', 'Medicine', 1000)");
      db.runSync("INSERT INTO subjects (id, committee_id, name, created_at, updated_at) VALUES ('s2', 'c2', 'Pathology', 1000, 1000)");
      db.runSync("INSERT INTO topics (id, subject_id, name, created_at, updated_at) VALUES ('t2', 's2', 'Glomerulonephritis', 1000, 1000)");

      const s3 = repo.insert({ topicId: 't2', title: 'PSGN', content: 'Subepithelial humps on EM.' });
      assert.equal(repo.countByTopic('t2'), 1);

      // Delete committee
      db.runSync('DELETE FROM committees WHERE id = ?', ['c2']);
      assert.equal(repo.countByTopic('t2'), 0);
      assert.equal(repo.getById(s3.id), null, 'Source 3 must be cascade deleted on committee deletion');
    } finally {
      db.closeSync();
    }
  });

  // ── 6. AI CONTEXT ADAPTER ───────────────────────────────────────────────────
  await check('Adapter: toAISourceContext converts StudySource and Topic to provider-neutral context', () => {
    const adapterModule = load('services/ai/sourceContext.ts', {
      '@/models/ai': {},
      '@/models/curriculum': {},
      '@/models/studySource': {},
    });

    const dummySource = {
      id: 'src-cardiac-1',
      topicId: 't-action-potentials',
      title: 'Action Potentials Lecture Notes',
      content: 'Phase 0 corresponds to rapid depolarization via voltage-gated sodium channels.',
      sourceType: 'text',
      createdAt: 100000,
      updatedAt: 100000,
    };

    const dummyTopic = {
      id: 't-action-potentials',
      subjectId: 's-physio',
      name: 'Action Potentials',
      description: 'Cardiac and neuronal electrophysiology',
      learningObjectives: 'Understand phases 0 through 4',
      createdAt: 50000,
      updatedAt: 50000,
    };

    const aiContext = adapterModule.toAISourceContext(dummySource, dummyTopic);

    assert.equal(aiContext.sourceId, 'src-cardiac-1');
    assert.equal(aiContext.sourceTitle, 'Action Potentials Lecture Notes');
    assert.equal(aiContext.topicId, 't-action-potentials');
    assert.equal(aiContext.topicName, 'Action Potentials');
    assert.equal(aiContext.content, dummySource.content);

    // Assert zero provider-specific or DB-specific leaks
    assert.equal(Object.keys(aiContext).length, 5);
  });

  // ── 7. DRAFT PERSISTENCE & ARCHITECTURAL PURITY ─────────────────────────────
  await check('Draft Persistence: Verified zero persistence tables for AI drafts or generations', () => {
    const db = new SQLiteAdapter();
    try {
      db.execSync('PRAGMA foreign_keys = ON');
      migrate(db);

      const tables = db
        .getAllSync("SELECT name FROM sqlite_master WHERE type = 'table'")
        .map((r) => r.name);

      assert.ok(!tables.includes('ai_generations'), 'Must NOT have ai_generations table');
      assert.ok(!tables.includes('ai_drafts'), 'Must NOT have ai_drafts table');
      assert.ok(!tables.includes('generated_flashcards'), 'Must NOT have generated_flashcards table');
      assert.ok(!tables.includes('generated_questions'), 'Must NOT have generated_questions table');
      assert.ok(tables.includes('study_sources'), 'Must have study_sources table');
    } finally {
      db.closeSync();
    }
  });

  // ── 8. SECURITY & NETWORK SCAN ──────────────────────────────────────────────
  await check('Security & Network: Absence of credentials, fetch, or vendor SDKs in Step 2 code', () => {
    const filesToScan = [
      'models/studySource.ts',
      'db/repositories/studySourceRepo.ts',
      'services/ai/sourceContext.ts',
    ];

    const forbiddenPatterns = [
      'AIza',
      'sk-',
      'OPENAI_API_KEY',
      'GEMINI_API_KEY',
      'Authorization:',
      'Bearer ',
      'fetch(',
      'XMLHttpRequest',
      'axios',
    ];

    for (const file of filesToScan) {
      const content = read(file);
      for (const pattern of forbiddenPatterns) {
        assert.ok(
          !content.includes(pattern),
          `File ${file} must not contain forbidden pattern "${pattern}"`
        );
      }
    }
  });

  console.log(`\nALL ${passed} PHASE 10 STEP 2 CHECKS PASSED.`);
}

main().catch((err) => {
  console.error('\nFAIL:', err);
  process.exit(1);
});
