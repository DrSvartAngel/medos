const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { DatabaseSync } = require('node:sqlite');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
let passed = 0;
async function check(name, run) {
  await run();
  passed++;
  console.log('PASS ' + name);
}
function load(file, mocks = {}, source = read(file)) {
  const output = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const module = { exports: {} };
  vm.runInThisContext('(function(require,module,exports){' + output + '\n})', { filename: file })(
    key => Object.hasOwn(mocks, key) ? mocks[key] : require(key), module, module.exports);
  return module.exports;
}
class Adapter {
  constructor() { this.db = new DatabaseSync(':memory:'); this.fail = () => false; }
  execSync(sql) { if (this.fail(sql)) throw Error('injected'); this.db.exec(sql); }
  runSync(sql, values = []) { if (this.fail(sql)) throw Error('injected'); return this.db.prepare(sql).run(...values); }
  getFirstSync(sql, values = []) { return this.db.prepare(sql).get(...values); }
  getAllSync(sql, values = []) { return this.db.prepare(sql).all(...values); }
  withTransactionSync(work) {
    this.db.exec('BEGIN');
    try { work(); this.db.exec('COMMIT'); }
    catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  closeSync() { this.db.close(); }
}
const date = load('utils/calendarDate.ts');
const validation = load('utils/curriculumValidation.ts');
const migrations = read('db/migrations.ts');
const v5Source = migrations.slice(0, migrations.indexOf('  if (currentVersion < 6)')) +
  '\n}\nexport { CURRENT_VERSION };';
function migrate(db, source = migrations) {
  return load('db/migrations.ts', {
    './client': { getDB: () => db }, '@/utils/calendarDate': date,
  }, source).runMigrations();
}
function repositories(db) {
  const mocks = { '../client': { getDB: () => db }, '@/utils/curriculumValidation': validation };
  return {
    subjects: load('db/repositories/subjectRepo.ts', mocks).subjectRepo,
    topics: load('db/repositories/topicRepo.ts', mocks).topicRepo,
    memory: load('db/repositories/memoryRepo.ts', mocks).memoryRepo,
  };
}
function committee(db, id = 'c') {
  db.runSync("INSERT INTO committees (id,name,subject,color,created_at) VALUES (?,?,'legacy','#fff',1)", [id, 'Komite']);
}
function subject(id = 's', committeeId = 'c', createdAt = 1) {
  return { id, committeeId, name: 'Fizyoloji', description: '', createdAt, updatedAt: createdAt };
}
function topic(id = 't', subjectId = 's', createdAt = 1) {
  return { id, subjectId, name: 'Kalp döngüsü', description: '', createdAt, updatedAt: createdAt };
}
function seed(db) {
  committee(db);
  db.execSync("INSERT INTO focus_sessions (id,duration_sec,committee_id,started_at) VALUES ('f',1500,'c',1)");
  db.execSync("INSERT INTO decks (id,name,subject,committee_id,created_at) VALUES ('d','Deck','legacy','c',1)");
  db.execSync("INSERT INTO flashcards (id,deck_id,front,back,next_review,created_at) VALUES ('card','d','Q','A',1,1)");
  db.execSync("INSERT INTO flashcard_reviews VALUES ('r','card','hard',1)");
  db.execSync("INSERT INTO calendar_events (id,title,start_time,end_time,committee_id,created_at,event_date) VALUES ('e','Event',1,2,'c',1,'2026-09-05')");
}
const legacyTables = ['committees','focus_sessions','decks','flashcards','flashcard_reviews','calendar_events'];
const snapshot = db => legacyTables.map(table => db.getAllSync('SELECT * FROM ' + table + ' ORDER BY id'));
async function fixture(run) {
  const db = new Adapter();
  try {
    // Exercise the actual connection initializer rather than assume Node's FK default.
    db.execSync('PRAGMA foreign_keys = OFF');
    const client = load('db/client.ts', { 'expo-sqlite': { openDatabaseSync: () => db } });
    assert.equal(client.getDB(), db);
    await migrate(db);
    await run(db, repositories(db));
  } finally { db.closeSync(); }
}

async function main() {
  await check('Actual client enables/verifies FKs; failed initialization is not cached', async () => {
    let closes = 0, opens = 0;
    const bad = { execSync() {}, getFirstSync: () => ({ foreign_keys: 0 }), closeSync: () => closes++ };
    const client = load('db/client.ts', { 'expo-sqlite': { openDatabaseSync: () => { opens++; return bad; } } });
    assert.throws(() => client.getDB(), /could not be enabled/);
    assert.throws(() => client.getDB());
    assert.equal(closes, 2); assert.equal(opens, 2);
    await fixture(db => assert.equal(db.getFirstSync('PRAGMA foreign_keys').foreign_keys, 1));
  });
  await check('Clean install v6, exact columns/FKs/indexes and safe rerun', () => fixture(async db => {
    assert.equal(db.getFirstSync('SELECT version FROM _schema_version').version, 6);
    for (const [table,parent,parentTable,index] of [
      ['subjects','committee_id','committees','idx_subjects_committee_order'],
      ['topics','subject_id','subjects','idx_topics_subject_order'],
    ]) {
      const columns = db.getAllSync('PRAGMA table_info(' + table + ')');
      assert.deepEqual(columns.map(c => c.name), ['id',parent,'name','description','created_at','updated_at']);
      assert.ok(columns.every(c => c.notnull === 1));
      assert.deepEqual(columns.map(c => c.type), ['TEXT','TEXT','TEXT','TEXT','INTEGER','INTEGER']);
      assert.equal(columns[3].dflt_value, "''");
      const fk = db.getFirstSync('PRAGMA foreign_key_list(' + table + ')');
      assert.equal(fk.table, parentTable); assert.equal(fk.from, parent);
      assert.equal(fk.to, 'id'); assert.equal(fk.on_delete, 'CASCADE');
      assert.deepEqual(db.getAllSync('PRAGMA index_info(' + index + ')').map(r => r.name), [parent,'created_at','id']);
      assert.ok(db.getAllSync('PRAGMA index_list(' + table + ')').every(r => !r.unique || r.origin === 'pk'));
    }
    await migrate(db);
    assert.deepEqual(db.getAllSync('PRAGMA foreign_key_check'), []);
  }));
  await check('Populated v5 upgrade preserves every old row, legacy text and schema', async () => {
    const db = new Adapter();
    try {
      await migrate(db, v5Source); seed(db);
      assert.equal(db.getFirstSync('SELECT version FROM _schema_version').version, 5);
      const before = snapshot(db);
      const shapes = legacyTables.map(t => db.getAllSync('PRAGMA table_info(' + t + ')'));
      await migrate(db);
      assert.deepEqual(snapshot(db), before);
      assert.deepEqual(legacyTables.map(t => db.getAllSync('PRAGMA table_info(' + t + ')')), shapes);
      assert.equal(db.getFirstSync('SELECT count(*) n FROM subjects').n, 0);
      assert.equal(db.getFirstSync('SELECT count(*) n FROM topics').n, 0);
      assert.deepEqual(db.getAllSync('PRAGMA foreign_key_check'), []);
    } finally { db.closeSync(); }
  });
  await check('Failure at version advance rolls back v6 tables/indexes; retry succeeds', async () => {
    const db = new Adapter();
    try {
      await migrate(db, v5Source); seed(db); const before = snapshot(db);
      db.fail = sql => sql.startsWith('UPDATE _schema_version');
      await assert.rejects(() => migrate(db), /injected/);
      assert.equal(db.getFirstSync('SELECT version FROM _schema_version').version, 5);
      assert.equal(db.getFirstSync("SELECT name FROM sqlite_master WHERE name='subjects'"), undefined);
      assert.equal(db.getFirstSync("SELECT name FROM sqlite_master WHERE name='idx_topics_subject_order'"), undefined);
      assert.deepEqual(snapshot(db), before);
      db.fail = () => false; await migrate(db);
    } finally { db.closeSync(); }
  });
  await check('Preexisting curriculum schema conflict stops without repair or data loss', async () => {
    const db = new Adapter();
    try {
      await migrate(db, v5Source);
      db.execSync("CREATE TABLE subjects (legacy TEXT); INSERT INTO subjects VALUES ('keep')");
      await assert.rejects(() => migrate(db), /schema conflict/);
      assert.equal(db.getFirstSync('SELECT legacy FROM subjects').legacy, 'keep');
      assert.equal(db.getFirstSync('SELECT version FROM _schema_version').version, 5);
    } finally { db.closeSync(); }
  });
  await check('Legacy orphan fixture is reported by foreign_key_check, never auto-cleaned', async () => {
    const db = new Adapter();
    try {
      await migrate(db, v5Source);
      db.execSync('PRAGMA foreign_keys = OFF');
      db.execSync("INSERT INTO flashcards (id,deck_id,front,back,next_review,created_at) VALUES ('orphan','missing','Q','A',1,1)");
      const client = load('db/client.ts', { 'expo-sqlite': { openDatabaseSync: () => db } });
      client.getDB(); await migrate(db);
      assert.equal(db.getAllSync('PRAGMA foreign_key_check').length, 1);
      assert.equal(db.getFirstSync("SELECT id FROM flashcards WHERE id='orphan'").id, 'orphan');
      assert.throws(() => db.execSync("INSERT INTO flashcard_reviews VALUES ('bad','missing','good',1)"), /FOREIGN KEY/);
    } finally { db.closeSync(); }
  });
  await check('Shared validation handles boundaries, optional description and Unicode whitespace', () => {
    for (const name of ['', '   ', '\t\n', '\u2003', null, 1]) assert.equal(validation.validateCurriculum({ name }).valid, false);
    assert.equal(validation.validateCurriculum({ name: 'x'.repeat(120) }).valid, true);
    assert.equal(validation.validateCurriculum({ name: 'x'.repeat(121) }).error, 'name_too_long');
    assert.deepEqual(validation.validateCurriculum({ name: '  İlaç 🫀  ', description: null }), { valid: true, name: 'İlaç 🫀', description: '' });
    assert.equal(validation.validateCurriculum({ name: 'x', description: 'a'.repeat(2000) }).valid, true);
    assert.equal(validation.validateCurriculum({ name: 'x', description: 'a'.repeat(2001) }).error, 'description_too_long');
    assert.equal(validation.validateCurriculum({ name: 'x', description: {} }).error, 'description_invalid');
  });
  await check('Parent validation precedes inserts; DB independently rejects orphan writes', () => fixture((db, r) => {
    assert.throws(() => r.subjects.insert(subject()), /committee_not_found/);
    assert.throws(() => r.topics.insert(topic()), /subject_not_found/);
    assert.throws(() => db.execSync("INSERT INTO subjects VALUES ('s','none','x','',1,1)"), /FOREIGN KEY/);
    assert.throws(() => db.execSync("INSERT INTO topics VALUES ('t','none','x','',1,1)"), /FOREIGN KEY/);
  }));
  await check('Subject/Topic duplicate names, Unicode and SQL-special content round-trip safely', () => fixture((db, r) => {
    committee(db);
    const name = "  O'Brien; DROP TABLE topics; -- İlaç 🫀  ";
    for (const id of ['s','s2']) r.subjects.insert({ ...subject(id), name, description: '  açıklama  ' });
    for (const id of ['t','t2']) r.topics.insert({ ...topic(id), name });
    assert.equal(r.subjects.getById('s').name, name.trim());
    assert.equal(r.subjects.getById('s').description, 'açıklama');
    assert.equal(r.topics.getById('t').name, name.trim());
    assert.equal(r.subjects.listByCommittee('c').length, 2);
    assert.equal(r.topics.listBySubject('s').length, 2);
    assert.equal(r.subjects.getById("' OR 1=1 --"), null);
    assert.equal(r.topics.delete("' OR 1=1 --"), false);
  }));
  await check('Repositories reject invalid fields and DB rejects blank names', () => fixture((db, r) => {
    committee(db);
    assert.throws(() => r.subjects.insert({ ...subject(), name: '\t\n' }), /name_required/);
    assert.throws(() => r.subjects.insert({ ...subject(), name: 'x'.repeat(121) }), /name_too_long/);
    assert.throws(() => r.subjects.insert({ ...subject(), updatedAt: NaN }), /timestamp_invalid/);
    assert.throws(() => db.execSync("INSERT INTO subjects VALUES ('s','c','   ','',1,1)"), /CHECK/);
    r.subjects.insert(subject());
    assert.throws(() => r.topics.insert({ ...topic(), description: 'x'.repeat(2001) }), /description_too_long/);
    assert.throws(() => db.execSync("INSERT INTO topics VALUES ('t','s','','',1,1)"), /CHECK/);
  }));
  await check('Both lists are parent-scoped, bounded and deterministically ordered', () => fixture((db, r) => {
    committee(db); committee(db, 'other');
    for (let i = 60; i >= 0; i--) r.subjects.insert(subject(String(i).padStart(3, '0'), 'c', 1));
    r.subjects.insert(subject('elsewhere', 'other', 0));
    assert.equal(r.subjects.listByCommittee('c').length, 50);
    assert.deepEqual(r.subjects.listByCommittee('c', { limit: 2, offset: 1 }).map(s => s.id), ['001','002']);
    for (const [id,time] of [['z',1],['a',1],['b',0]]) r.topics.insert(topic(id, '000', time));
    assert.deepEqual(r.topics.listBySubject('000').map(t => t.id), ['b','a','z']);
    assert.deepEqual(r.topics.listBySubject('000', { limit: 1, offset: 1 }).map(t => t.id), ['a']);
    assert.deepEqual(r.topics.listBySubject('001'), []);
    for (const options of [{ limit: 0 }, { limit: 201 }, { offset: -1 }, { limit: NaN }])
      assert.throws(() => r.subjects.listByCommittee('c', options), /page_invalid/);
  }));
  await check('Update/delete missing rows return false; parent and creation time stay immutable', () => fixture((db, r) => {
    committee(db); committee(db, 'other'); r.subjects.insert(subject()); r.subjects.insert(subject('s2'));
    r.topics.insert(topic());
    assert.equal(r.subjects.update(subject('missing')), false);
    assert.equal(r.topics.update(topic('missing')), false);
    assert.equal(r.subjects.delete('missing'), false); assert.equal(r.topics.delete('missing'), false);
    assert.equal(r.subjects.update({ ...subject(), name: 'Yeni', createdAt: 999, updatedAt: 2 }), true);
    assert.equal(r.subjects.getById('s').createdAt, 1);
    assert.equal(r.subjects.getById('s').name, 'Yeni');
    assert.equal(r.subjects.update(subject('s','other')), false);
    assert.equal(r.topics.update(topic('t','s2')), false);
    assert.equal(r.topics.update({ ...topic(), name: 'Yeni konu', updatedAt: 3 }), true);
    assert.equal(r.topics.getById('t').updatedAt, 3);
    assert.equal(r.topics.delete('t'), true); assert.equal(r.subjects.getById('s').id, 's');
  }));
  await check('Subject cascade deletes only its Topics', () => fixture((db, r) => {
    committee(db); r.subjects.insert(subject()); r.subjects.insert(subject('s2'));
    r.topics.insert(topic()); r.topics.insert(topic('t2','s2'));
    assert.equal(r.subjects.delete('s'), true);
    assert.equal(r.topics.getById('t'), null); assert.equal(r.topics.getById('t2').id, 't2');
    assert.ok(db.getFirstSync("SELECT id FROM committees WHERE id='c'"));
  }));
  await check('Committee cascade preserves Focus, Deck/Card/Review and Calendar records', () => fixture((db, r) => {
    seed(db); r.subjects.insert(subject()); r.topics.insert(topic());
    const before = snapshot(db).slice(1);
    const repo = load('db/repositories/committeeRepo.ts', {
      '../client': { getDB: () => db }, '@/utils/committeeDate': { getCommitteeDateStatus: () => 'active' },
    }).committeeRepo;
    assert.equal(repo.delete('c'), true);
    assert.equal(r.subjects.getById('s'), null); assert.equal(r.topics.getById('t'), null);
    assert.deepEqual(snapshot(db).slice(1), before);
    assert.deepEqual(db.getAllSync('PRAGMA foreign_key_check'), []);
  }));
  await check('Existing Memory insert/update/review and transactional deletes work with FK ON', () => fixture((db, r) => {
    const deck = { id: 'd', name: 'Deck', description: '', committeeId: null, createdAt: 1, updatedAt: 1 };
    const card = { id: 'card', deckId: 'd', front: 'Q', back: 'A', createdAt: 1, updatedAt: 1 };
    r.memory.insertDeck(deck); r.memory.insertCard(card);
    r.memory.updateDeck({ ...deck, name: 'Edited' }); r.memory.updateCard({ ...card, front: 'Edited' });
    r.memory.insertReview({ id: 'r', cardId: 'card', rating: 'good', reviewedAt: 2 });
    assert.equal(r.memory.getReviewQueue('d', 5).length, 1);
    assert.equal(r.memory.getReviewCount('d'), 1);
    assert.throws(() => r.memory.insertCard({ ...card, id: 'bad', deckId: 'missing' }), /FOREIGN KEY/);
    db.fail = sql => sql.startsWith('DELETE FROM flashcards');
    assert.throws(() => r.memory.deleteCard('card'), /injected/);
    assert.equal(r.memory.getReviewCount('d'), 1);
    db.fail = () => false;
    r.memory.deleteCard('card'); assert.equal(r.memory.getReviewCount('d'), 0);
    r.memory.insertCard(card); r.memory.insertReview({ id: 'r', cardId: 'card', rating: 'hard', reviewedAt: 3 });
    r.memory.deleteDeck('d');
    for (const table of ['decks','flashcards','flashcard_reviews'])
      assert.equal(db.getFirstSync('SELECT count(*) n FROM ' + table).n, 0);
    assert.deepEqual(db.getAllSync('PRAGMA foreign_key_check'), []);
  }));
  await check('No UI/store/linkage/v7/dependencies; only approved package script added', () => {
    const pkg = JSON.parse(read('package.json'));
    const lock = JSON.parse(read('package-lock.json')).packages[''];
    assert.deepEqual(pkg.dependencies, lock.dependencies);
    assert.deepEqual(pkg.devDependencies, lock.devDependencies);
    assert.equal(pkg.scripts['validate:phase4'], 'node scripts/validate-phase4.cjs');
    assert.match(migrations, /const CURRENT_VERSION = 6/);
    assert.doesNotMatch(migrations, /currentVersion < 7/);
    const v6 = migrations.slice(migrations.indexOf('  if (currentVersion < 6)'));
    assert.doesNotMatch(v6, /ALTER TABLE|DROP TABLE|DELETE FROM|UPDATE (?!_schema_version)/);
    for (const dir of ['app/subjects','app/topics','store/useSubjectStore.ts','store/useTopicStore.ts'])
      assert.equal(fs.existsSync(path.join(root, dir)), false);
    for (const file of ['store/useFocusStore.ts','store/useMemoryStore.ts','store/useCalendarStore.ts','store/useStudySupportStore.ts'])
      assert.doesNotMatch(read(file), /subjectId|topicId|subject_id|topic_id/);
    for (const file of ['db/repositories/subjectRepo.ts','db/repositories/topicRepo.ts']) {
      assert.match(read(file), /ORDER BY created_at ASC, id ASC LIMIT \? OFFSET \?/);
      assert.doesNotMatch(read(file), /execSync|zustand|AsyncStorage/);
    }
  });
  console.log('\nPhase 4.1 static/in-memory validation passed: ' + passed + ' checks.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });

