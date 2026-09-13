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
const v7Source = migrations.slice(0, migrations.indexOf('  if (currentVersion < 8)')) + '\n}\nexport { CURRENT_VERSION };';
function migrate(db, source = migrations) {
  return load('db/migrations.ts', {
    './client': { getDB: () => db }, '@/utils/calendarDate': date,
  }, source).runMigrations();
}
function repositories(db) {
  const mocks = { '../client': { getDB: () => db }, '@/utils/curriculumValidation': validation, '@/utils/memoryScheduling': load('utils/memoryScheduling.ts') };
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
  db.execSync("INSERT INTO flashcard_reviews (id,card_id,rating,reviewed_at) VALUES ('r','card','hard',1)");
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
  await check('Exam plan distributes every Topic once in input order with balanced local-day counts', () => {
    const rules = load('utils/examPlanRules.ts', { './calendarDate': date });
    const now = new Date(2026, 8, 6, 23, 59).getTime();
    for (const count of [1, 3, 5, 50, 201]) for (const days of [1, 2, 7, 365]) {
      const topics = Array.from({length:count}, (_,i)=>({id:String(i),name:'Konu '+i,subjectName:'Ders'}));
      const exam = new Date(2026,8,6+days).getTime();
      const plan = rules.buildExamPlan(exam,topics,now);
      assert.equal(plan.status,'ready'); assert.equal(plan.studyDays,days);
      assert.deepEqual(plan, rules.buildExamPlan(exam,topics,now));
      assert.deepEqual(plan.days.flatMap(d=>d.topics),topics);
      assert.equal(new Set(plan.days.flatMap(d=>d.topics.map(t=>t.id))).size,count);
      const counts = plan.days.map(d=>d.topics.length); if(plan.unassignedDays) counts.push(0);
      assert.ok(Math.max(...counts)-Math.min(...counts)<=1);
      assert.ok(plan.days.every(d=>d.date>=plan.today && d.date<plan.examDate));
      assert.equal(plan.days.length+plan.unassignedDays,days);
      assert.deepEqual(topics.map(t=>t.id),Array.from({length:count},(_,i)=>String(i)));
    }
  });
  await check('Exam plan handles missing dates, no Topics, today/past, leap days and regeneration without debt', () => {
    const {buildExamPlan} = load('utils/examPlanRules.ts', { './calendarDate': date });
    const now = new Date(2028,1,28,12).getTime(), exam = new Date(2028,2,1).getTime();
    const topics = [{id:'t',name:'T',subjectName:'S'}];
    for(const value of [null,undefined,'2028-03-01',NaN,Infinity,1e20]) assert.equal(buildExamPlan(value,topics,now).status,'invalid_date');
    assert.equal(buildExamPlan(now,topics,now).status,'exam_today');
    assert.equal(buildExamPlan(now-86400000,topics,now).status,'exam_past');
    assert.equal(buildExamPlan(exam,[],now).status,'no_topics');
    assert.equal(buildExamPlan(exam,topics,now).studyDays,2);
    const next = buildExamPlan(exam,topics,new Date(2028,1,29).getTime());
    assert.equal(next.studyDays,1); assert.deepEqual(next.days[0].topics,topics);
    const dst = buildExamPlan(new Date(2026,2,30).getTime(),topics,new Date(2026,2,28).getTime());
    assert.equal(dst.studyDays,2);
  });
  await check('Exam scope query includes all Committee Topics in hierarchy order and ignores metadata/evidence', () => fixture((db,r)=>{
    committee(db); committee(db,'other');
    r.subjects.insert(subject('z','c',0)); r.subjects.insert(subject('a','c',1)); r.subjects.insert(subject('outside','other'));
    r.topics.insert(topic('first','z',1));
    for(let i=60;i>=0;i--)r.topics.insert({...topic(String(i).padStart(3,'0'),'a',2),learningObjectives:'not workload'});
    r.topics.insert(topic('outside','outside'));
    const before = r.topics.listForExamPlan('c');
    assert.equal(before.length,62); assert.equal(before[0].id,'first'); assert.equal(before[1].id,'000');
    assert.equal(before.at(-1).id,'060'); assert.deepEqual(r.topics.listForExamPlan("' OR 1=1 --"),[]);
    r.topics.update({...r.topics.getById('first'),learningObjectives:'changed'});
    db.execSync("INSERT INTO focus_sessions(id,duration_sec,actual_duration_sec,completed,cancelled,started_at,ended_at,topic_id) VALUES ('evidence',60,60,1,0,1,60001,'first')");
    assert.deepEqual(r.topics.listForExamPlan('c'),before);
  }));
  await check('Exam UI is generated/read-only, focus-scoped, safe and bilingual with unchanged schema', () => {
    const screen = read('app/committees/exam-plan/[id].tsx');
    const rules = read('utils/examPlanRules.ts');
    assert.match(screen,/ScreenWrapper includeBottomSafeArea/);
    assert.match(screen,/useFocusEffect/); assert.match(screen,/app.remove\(\); hardware.remove\(\)/);
    assert.match(screen,/setTimeout\(refresh/); assert.match(screen,/subjectFallback\(id\)/);
    assert.match(screen,/topicRepo.listForExamPlan\(id\)/); assert.match(screen,/setVisibleDays\(14\)/);
    assert.match(screen,/router.push\(`\/topics\//);
    assert.doesNotMatch(screen+rules,/calendarRepo|startTopicSession|AsyncStorage|zustand|\.insert\(|\.update\(|mastery|learningObjectives|hasTopicStudyActivity|Gemini|setInterval/);
    assert.match(read('app/committees/[id].tsx'),/t.examPlan.title/);
    for(const lang of ['en','tr']) {
      const t = load('i18n/'+lang+'.ts').default.examPlan;
      for(const key of ['title','explanation','error','missing']) assert.ok(t[key]);
      assert.ok(t.summary(1,1)); assert.ok(t.summary(2,3));
      assert.equal(t.openTopic('İlaç','Ders'), 'Ders — İlaç');
    }
    const versionMatch = migrations.match(/const CURRENT_VERSION = (\d+);/); assert.ok(versionMatch && parseInt(versionMatch[1], 10) >= 10);
  });
  await check('v8 optional Topic FK preserves legacy rows, rolls back failure and unlinks on deletion', async () => {
    const db = new Adapter();
    try {
      await migrate(db, v7Source); seed(db);
      const before = db.getFirstSync('SELECT * FROM focus_sessions');
      for (const prefix of ['ALTER TABLE focus_sessions', 'UPDATE _schema_version']) {
        db.fail = sql => sql.startsWith(prefix);
        await assert.rejects(() => migrate(db), /injected/);
        assert.equal(db.getFirstSync('SELECT version FROM _schema_version').version, 7);
        assert.deepEqual(db.getFirstSync('SELECT * FROM focus_sessions'), before);
      }
      db.fail = () => false; await migrate(db); await migrate(db);
      assert.deepEqual({ ...db.getFirstSync('SELECT * FROM focus_sessions') }, { ...before, topic_id: null });
      const fk = db.getFirstSync('PRAGMA foreign_key_list(focus_sessions)');
      assert.equal(fk.table, 'topics'); assert.equal(fk.on_delete, 'SET NULL');
      assert.throws(() => db.runSync('UPDATE focus_sessions SET topic_id=?', ['missing']), /FOREIGN KEY/);
      const r = repositories(db); r.subjects.insert(subject()); r.topics.insert(topic());
      db.runSync('UPDATE focus_sessions SET topic_id=?', ['t']);
      r.subjects.delete('s');
      assert.deepEqual({ ...db.getFirstSync('SELECT * FROM focus_sessions') }, { ...before, topic_id: null });
      assert.deepEqual(db.getAllSync('PRAGMA foreign_key_check'), []);
    } finally { db.closeSync(); }
  });
  await check('Study evidence uses valid concluded positive Focus duration, never objectives or legacy attribution', () => fixture((db, r) => {
    committee(db); r.subjects.insert(subject()); r.topics.insert({ ...topic(), learningObjectives: 'Not evidence' });
    const repo = load('db/repositories/focusRepo.ts', { '../client': { getDB: () => db } }).focusRepo;
    const session = { id: 'f', plannedSec: 1500, actualSec: 1, completed: true, cancelled: false,
      committeeId: 'c', topicId: 't', startedAt: 1, endedAt: 1001 };
    assert.equal(repo.hasTopicStudyActivity('t'), false);
    repo.insert({ ...session, topicId: undefined }); assert.equal(repo.hasTopicStudyActivity('t'), false);
    db.execSync('DELETE FROM focus_sessions');
    for (const change of [{actualSec: 0}, {actualSec: -1}, {actualSec: 1.5}, {endedAt: null},
      {completed: false}, {completed: false, cancelled: true, actualSec: 29}]) {
      repo.insert({ ...session, ...change }); assert.equal(repo.hasTopicStudyActivity('t'), false);
      db.execSync('DELETE FROM focus_sessions');
    }
    for (const change of [{}, {completed: false, cancelled: true, actualSec: 30}]) {
      repo.insert({ ...session, ...change }); assert.equal(repo.hasTopicStudyActivity('t'), true);
      db.execSync('DELETE FROM focus_sessions');
    }
    r.topics.delete('t'); repo.insert(session);
    assert.equal(repo.getRecent()[0].topicId, null);
    assert.equal(repo.getRecent()[0].committeeId, 'c');
  }));
  await check('Topic-started Focus preserves active protection, pause/break/context, persistence and reset', () => fixture((db, r) => {
    committee(db); r.subjects.insert(subject()); r.topics.insert(topic());
    const repo = load('db/repositories/focusRepo.ts', { '../client': { getDB: () => db } }).focusRepo;
    let state;
    const store = load('store/useFocusStore.ts', {
      zustand: { create: () => init => { const get = () => state; const set = p => { state = { ...state, ...(typeof p === 'function' ? p(state) : p) }; }; state = init(set,get); return {getState:get,setState:set}; } },
      '@/db/repositories/focusRepo': {focusRepo:repo},
      '@/db/repositories/committeeRepo': {committeeRepo:{getById:id=>db.getFirstSync('SELECT id FROM committees WHERE id=?',[id])}},
      '@/store/useAppStore': {useAppStore:{getState:()=>({defaultFocusSec:1500})}},
      '@/utils/preferences': load('utils/preferences.ts'),
      '@/utils/studySupportRules': {isStandardAdaptiveDurationSec:s=>[900,1500,2700].includes(s)},
    }).useFocusStore;
    assert.equal(state.startTopicSession('missing'), false);
    assert.equal(state.startTopicSession('t'), true);
    assert.equal(state.selectedCommitteeId, 'c'); assert.equal(state.selectedTopicId,'t');
    const start = state.startedAt;
    assert.equal(state.startTopicSession('t'), false); assert.equal(state.startedAt,start);
    state.pauseTimer(); state.resumeTimer(); state.startGentleBreak(); state.resumeTimer();
    assert.equal(state.selectedTopicId,'t'); assert.equal(state.startedAt,start);
    store.setState({accumulatedSec:31}); state.finishSession();
    assert.equal(repo.hasTopicStudyActivity('t'),true); assert.equal(state.selectedTopicId,null);
    state.startTimer(); assert.equal(state.selectedTopicId,null); state.cancelSession();
    assert.equal(state.selectedTopicId,null);
    state.startTopicSession('t'); r.topics.delete('t'); store.setState({accumulatedSec:5}); state.finishSession();
    assert.equal(state.timerStatus,'idle'); assert.equal(repo.getRecent()[0].topicId,null);
  }));
  await check('Topic evidence UI keeps errors distinct and links only on explicit start; no Memory integration', () => {
    const source = read('app/topics/[id].tsx');
    assert.match(source, /studyEvidence === null/); assert.match(source,/hasTopicStudyActivity\(id\)/);
    assert.match(source,/onPress=\{startFocus\}/); assert.match(source,/startTopicSession\(id\)/);
    assert.match(source,/useFocusEffect/);
    for (const lang of ['en','tr']) {
      const t = load('i18n/'+lang+'.ts').default.topics;
      assert.ok(t.studyRecorded); assert.ok(t.studyUnrecorded); assert.ok(t.studyEvidenceError);
    }
    for (const file of ['db/repositories/calendarRepo.ts'])
      assert.doesNotMatch(read(file), /topicId|topic_id/);
    assert.doesNotMatch(read('db/repositories/focusRepo.ts'), /learningObjectives|learning_objectives|mastery|percentage|Gemini/);
  });
  await check('v6 to v7 preserves Topics, defaults objectives and rolls back failed version advancement', async () => {
    const db = new Adapter();
    const v6Source = migrations.slice(0, migrations.indexOf('  if (currentVersion < 7)')) + '\n}\nexport { CURRENT_VERSION };';
    try {
      await migrate(db, v6Source); seed(db);
      db.execSync("INSERT INTO subjects VALUES ('s','c','Subject','',1,1)");
      db.execSync("INSERT INTO topics VALUES ('t','s','Topic','Do not copy description',1,2)");
      const before = db.getFirstSync('SELECT * FROM topics');
      const legacy = snapshot(db);
      const indexes = db.getAllSync("SELECT name, sql FROM sqlite_master WHERE type='index' ORDER BY name");
      for (const failAt of ['ALTER TABLE topics', 'UPDATE _schema_version']) {
        db.fail = sql => sql.startsWith(failAt);
        await assert.rejects(() => migrate(db, v7Source), /injected/);
        assert.equal(db.getFirstSync('SELECT version FROM _schema_version').version, 6);
        assert.deepEqual(db.getFirstSync('SELECT * FROM topics'), before);
      }
      db.fail = () => false;
      await migrate(db, v7Source); await migrate(db, v7Source);
      assert.equal(db.getFirstSync('SELECT version FROM _schema_version').version, 7);
      assert.deepEqual({ ...db.getFirstSync('SELECT * FROM topics') }, { ...before, learning_objectives: '' });
      const column = db.getAllSync('PRAGMA table_info(topics)').find(c => c.name === 'learning_objectives');
      assert.equal(column.type, 'TEXT'); assert.equal(column.notnull, 1); assert.equal(column.dflt_value, "''");
      assert.deepEqual(snapshot(db), legacy);
      assert.deepEqual(db.getAllSync("SELECT name, sql FROM sqlite_master WHERE type='index' ORDER BY name"), indexes);
      assert.deepEqual(db.getAllSync('PRAGMA foreign_key_check'), []);
    } finally { db.closeSync(); }
  });
  await check('Objectives normalize only outer whitespace and enforce UTF-16/type boundaries', () => {
    const validate = validation.validateLearningObjectives;
    for (const value of [undefined, '', ' \n\t ']) assert.deepEqual(validate(value), { valid: true, learningObjectives: '' });
    for (const value of [null, 1, true, [], {}]) assert.equal(validate(value).error, 'learning_objectives_invalid');
    for (const value of ['a'.repeat(2000), '🫀'.repeat(1000)]) assert.equal(validate(value).valid, true);
    assert.equal(validate('a'.repeat(2001)).error, 'learning_objectives_too_long');
    const text = "İlaç O'Brien 🫀\n\nAçıkla\nAçıkla";
    assert.equal(validate(' \n' + text + '\n ').learningObjectives, text);
  });
  await check('Objectives insert/update/read round-trip, default, clearing and failed writes preserve records', () => fixture((db, r) => {
    committee(db); r.subjects.insert(subject()); r.subjects.insert(subject('s2'));
    r.topics.insert(topic()); assert.equal(r.topics.getById('t').learningObjectives, '');
    const text = "İlaç O'Brien; DROP TABLE topics; -- 🫀\nTekrar\nTekrar";
    r.topics.insert({ ...topic('text'), learningObjectives: '  ' + text + '\n' });
    assert.equal(repositories(db).topics.getById('text').learningObjectives, text);
    assert.equal(r.topics.listBySubject('s').find(t => t.id === 'text').learningObjectives, text);
    assert.equal(r.topics.update({ ...topic(), learningObjectives: 'x'.repeat(2000), createdAt: 99, updatedAt: 3 }), true);
    const saved = r.topics.getById('t');
    assert.equal(saved.learningObjectives.length, 2000); assert.equal(saved.createdAt, 1); assert.equal(saved.updatedAt, 3);
    for (const value of ['x'.repeat(2001), null, 5, {}, []]) {
      assert.throws(() => r.topics.update({ ...saved, learningObjectives: value }), /learning_objectives/);
      assert.throws(() => r.topics.insert({ ...topic('bad'), learningObjectives: value }), /learning_objectives/);
    }
    assert.equal(r.topics.update({ ...saved, subjectId: 's2', learningObjectives: text }), true);
    const reparented = r.topics.getById('t');
    assert.equal(reparented.subjectId, 's2');
    assert.throws(() => r.topics.update({ ...saved, subjectId: 'missing' }), /subject_not_found/);
    assert.equal(r.topics.update({ ...saved, id: 'missing' }), false);
    db.fail = sql => sql.startsWith('UPDATE topics');
    assert.throws(() => r.topics.update({ ...reparented, learningObjectives: '' }), /injected/);
    db.fail = () => false; assert.deepEqual(r.topics.getById('t'), reparented);
    assert.equal(r.topics.update({ ...reparented, learningObjectives: ' \n ' }), true);
    assert.equal(repositories(db).topics.getById('t').learningObjectives, '');
  }));
  await check('Objectives UI is optional Topic-only descriptive text with localized Foundation wiring', () => {
    const form = read('components/curriculum/TopicForm.tsx');
    const editor = read('components/curriculum/TopicEditor.tsx');
    const detail = read('app/topics/[id].tsx');
    assert.match(form, /validateLearningObjectives\(learningObjectives\)/);
    assert.match(form, /learningObjectives: objectives.learningObjectives/);
    assert.match(form, /accessibilityLabel=\{t.topics.learningObjectivesOptional\}/);
    assert.match(form, /value=\{learningObjectives\} editable=\{!saving\} multiline/);
    assert.match(editor, /initialLearningObjectives=\{loaded.topic\?\.learningObjectives\}/);
    assert.match(detail, /data.topic.learningObjectives.trim\(\) !== '' && <Section/);
    for (const primitive of ['Input','FormField','Section']) assert.ok(form.includes('@/components/ui/' + primitive));
    for (const lang of ['en','tr']) {
      const t = load('i18n/' + lang + '.ts').default.topics;
      for (const key of ['learningObjectives','learningObjectivesOptional','learningObjectivesHelp']) assert.ok(t[key]);
      assert.ok(t.validation.learning_objectives_invalid); assert.ok(t.validation.learning_objectives_too_long);
    }
    const model = read('models/curriculum.ts');
    assert.match(model.split('export interface Topic')[1], /learningObjectives: string/);
    assert.doesNotMatch(model.split('export interface Topic')[0], /learningObjectives/);
    assert.doesNotMatch(model, /weight|priority|progress|mastery|provenance|Objective\s*\{/i);
    const v7 = migrations.slice(migrations.indexOf('  if (currentVersion < 7)'), migrations.indexOf('  if (currentVersion < 8)'));
    assert.equal((v7.match(/ALTER TABLE/g) || []).length, 1);
    assert.doesNotMatch(v7, /CREATE TABLE|CREATE INDEX|JSON|REFERENCES|DELETE FROM/);
    for (const file of ['db/repositories/subjectRepo.ts','db/repositories/committeeRepo.ts',
      'store/useFocusStore.ts','store/useMemoryStore.ts','store/useCalendarStore.ts','store/useStudySupportStore.ts'])
      assert.doesNotMatch(read(file), /learningObjectives|learning_objectives/);
    assert.doesNotMatch(form + editor + detail, /Gemini|generatedBy|provenance|mastery|priority|weight/);
  });
  await check('Actual client enables/verifies FKs; failed initialization is not cached', async () => {
    let closes = 0, opens = 0;
    const bad = { execSync() {}, getFirstSync: () => ({ foreign_keys: 0 }), closeSync: () => closes++ };
    const client = load('db/client.ts', { 'expo-sqlite': { openDatabaseSync: () => { opens++; return bad; } } });
    assert.throws(() => client.getDB(), /could not be enabled/);
    assert.throws(() => client.getDB());
    assert.equal(closes, 2); assert.equal(opens, 2);
    await fixture(db => assert.equal(db.getFirstSync('PRAGMA foreign_keys').foreign_keys, 1));
  });
  await check('Clean install v10, exact columns/FKs/indexes and safe rerun', () => fixture(async db => {
    assert.ok(db.getFirstSync('SELECT version FROM _schema_version').version >= 10);
    for (const [table,parent,parentTable,index] of [
      ['subjects','committee_id','committees','idx_subjects_committee_order'],
      ['topics','subject_id','subjects','idx_topics_subject_order'],
    ]) {
      const columns = db.getAllSync('PRAGMA table_info(' + table + ')');
      assert.deepEqual(columns.map(c => c.name), ['id',parent,'name','description','created_at','updated_at', ...(table === 'topics' ? ['learning_objectives'] : [])]);
      assert.ok(columns.every(c => c.notnull === 1));
      assert.deepEqual(columns.map(c => c.type), ['TEXT','TEXT','TEXT','TEXT','INTEGER','INTEGER', ...(table === 'topics' ? ['TEXT'] : [])]);
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
      await migrate(db, v7Source);
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
      assert.throws(() => db.execSync("INSERT INTO flashcard_reviews (id,card_id,rating,reviewed_at) VALUES ('bad','missing','good',1)"), /FOREIGN KEY/);
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
    assert.throws(() => db.execSync("INSERT INTO topics (id,subject_id,name,description,created_at,updated_at) VALUES ('t','none','x','',1,1)"), /FOREIGN KEY/);
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
    assert.throws(() => db.execSync("INSERT INTO topics (id,subject_id,name,description,created_at,updated_at) VALUES ('t','s','','',1,1)"), /CHECK/);
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
    assert.equal(r.topics.update(topic('t','s2')), true);
    assert.equal(r.topics.getById('t').subjectId, 's2');
    assert.throws(() => r.topics.update(topic('t','missing')), /subject_not_found/);
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
  await check('No curriculum curriculum store/unapproved linkage/v10/dependencies; Subject and Topic UI are approved', () => {
    const pkg = JSON.parse(read('package.json'));
    const lock = JSON.parse(read('package-lock.json')).packages[''];
    assert.deepEqual(pkg.dependencies, lock.dependencies);
    assert.deepEqual(pkg.devDependencies, lock.devDependencies);
    assert.equal(pkg.scripts['validate:phase4'], 'node scripts/validate-phase4.cjs');
    const vMatch = migrations.match(/const CURRENT_VERSION = (\d+);/);
    assert.ok(vMatch && parseInt(vMatch[1], 10) >= 10);
    const v6 = migrations.slice(migrations.indexOf('  if (currentVersion < 6)'), migrations.indexOf('  if (currentVersion < 7)'));
    assert.doesNotMatch(v6, /ALTER TABLE|DROP TABLE|DELETE FROM|UPDATE (?!_schema_version)/);
    for (const dir of ['store/useSubjectStore.ts','store/useTopicStore.ts'])
      assert.equal(fs.existsSync(path.join(root, dir)), false);
    for (const file of ['store/useCalendarStore.ts','store/useStudySupportStore.ts'])
      assert.doesNotMatch(read(file), /subjectId|topicId|subject_id|topic_id/);
    for (const file of ['db/repositories/subjectRepo.ts','db/repositories/topicRepo.ts']) {
      assert.match(read(file), /ORDER BY created_at ASC, id ASC LIMIT \? OFFSET \?/);
      assert.doesNotMatch(read(file), /execSync|zustand|AsyncStorage/);
    }
  });

  await check('Real Topic count is parent-scoped, unpaginated, validates IDs and propagates DB errors', () => fixture((db, r) => {
    committee(db); r.subjects.insert(subject()); r.subjects.insert(subject('s2'));
    assert.equal(r.topics.countBySubject('s'), 0);
    for (let i = 0; i < 61; i++) r.topics.insert(topic('t' + i));
    r.topics.insert(topic('other','s2'));
    assert.equal(r.topics.listBySubject('s').length, 50);
    assert.equal(r.topics.countBySubject('s'), 61);
    assert.equal(r.topics.countBySubject('s2'), 1);
    assert.equal(r.topics.countBySubject("' OR 1=1 --"), 0);
    assert.throws(() => r.topics.countBySubject(' '), /subject_id_required/);
    const get = db.getFirstSync;
    db.getFirstSync = () => { throw Error('count read failed'); };
    assert.throws(() => r.topics.countBySubject('s'), /count read failed/);
    db.getFirstSync = get;
  }));
  await check('Subject route parameters and destination fallbacks reject missing/mismatched parents', () => fixture((db, r) => {
    committee(db); committee(db, 'c2'); r.subjects.insert(subject());
    const route = load('utils/subjectRoutes.ts', {
      '@/db/repositories/committeeRepo': { committeeRepo: { getById: id => db.getFirstSync('SELECT id FROM committees WHERE id=?', [id]) ?? null } },
      '@/db/repositories/subjectRepo': { subjectRepo: r.subjects },
    });
    for (const value of [undefined, [], ['s'], '', ' ']) assert.equal(route.subjectRouteId(value), '');
    assert.equal(route.subjectRouteId('s'), 's');
    assert.equal(route.subjectFallback('c','s'), '/subjects/s');
    assert.equal(route.subjectFallback('c2','s'), '/committees/c2');
    r.subjects.delete('s');
    assert.equal(route.subjectFallback('c','s'), '/committees/c');
    db.runSync('DELETE FROM committees WHERE id=?', ['c']);
    assert.equal(route.subjectFallback('c','s'), '/(tabs)/committees');
  }));
  await check('Subject delete preserves external records even with Topics present', () => fixture((db, r) => {
    seed(db); r.subjects.insert(subject()); r.topics.insert(topic());
    const before = snapshot(db);
    assert.equal(r.subjects.delete('s'), true);
    assert.equal(r.topics.getById('t'), null);
    assert.deepEqual(snapshot(db), before);
  }));
  // Source assertions below are static wiring checks, NOT runtime UI or device tests.
  await check('Subject screens statically wire direct loading, shared validation, safe mutations and navigation', () => {
    const editor = read('components/curriculum/SubjectEditor.tsx');
    const form = read('components/curriculum/SubjectForm.tsx');
    const detail = read('app/subjects/[id].tsx');
    for (const file of ['app/subjects/new.tsx','app/subjects/edit/[id].tsx']) {
      assert.match(read(file), /subjectRouteId/);
      assert.match(read(file), /SubjectEditor/);
    }
    assert.match(editor, /subjectRepo.getById\(id\)/);
    assert.match(editor, /committeeRepo.getById/);
    for (const status of ['loading','missing','error','ready']) assert.ok(editor.includes("'" + status + "'"));
    assert.match(editor, /subjectRepo.insert/);
    assert.match(editor, /!subjectRepo.update/);
    const saveBody = editor.slice(editor.indexOf('  function save('));
    assert.ok(saveBody.indexOf('router.dismissTo(target') > saveBody.indexOf('subjectRepo.update'));
    assert.match(form, /validateCurriculum\(\{ name, description \}\)/);
    assert.match(form, /if \(submitting.current\) return/);
    assert.match(form, /if \(!saved\)/);
    assert.doesNotMatch(form, /setName\(''\)|setDescription\(''\)|unique/i);
    assert.match(detail, /topicRepo.countBySubject\(id\)/);
    assert.match(detail, /count !== null/);
    assert.match(detail, /countError/);
    assert.doesNotMatch(detail, /listBySubject|setCount\(0\)/);
    assert.match(detail, /!subjectRepo.delete\(subject.id\)/);
    assert.match(detail, /router.dismissTo\(parentTarget\(\)\)/);
    assert.match(detail, /style: 'destructive'/);
    assert.match(detail, /useFocusEffect/);
    assert.match(editor, /subjectFallback/);
  });
  await check('Committee list, localized forms and safe areas remain scoped and accessible', () => {
    const committeeSource = read('app/committees/[id].tsx');
    const list = read('components/curriculum/SubjectList.tsx');
    assert.match(committeeSource, /<SubjectList key=\{committee.id\} committeeId=\{committee.id\}/);
    assert.match(committeeSource, /committeeDeleteWarning/);
    assert.match(list, /PAGE_SIZE = 50/);
    assert.match(list, /subjectRepo.listByCommittee/);
    assert.match(list, /useFocusEffect/);
    assert.match(list, /limit: 1, offset: offset \+ PAGE_SIZE/);
    assert.match(list, /!loading && !error && items.length === 0/);
    assert.match(list, /load\(failedOffset\)/);
    assert.match(list, /accessibilityRole="button"/);
    assert.match(list, /accessibilityLabel=\{t.subjects.open/);
    assert.match(list, /minHeight: 48/);
    assert.doesNotMatch(list, /topicCount|countBySubject|numberOfLines/);
    for (const file of ['app/subjects/[id].tsx','components/curriculum/SubjectEditor.tsx']) {
      assert.match(read(file), /ScreenWrapper includeBottomSafeArea/);
      assert.match(read(file), /useTranslation/);
      assert.doesNotMatch(read(file), /numberOfLines|zustand/);
    }
    assert.match(read('components/curriculum/SubjectForm.tsx'), /<Input/);
    assert.match(read('theme/layout.ts'), /inputMinHeight: 48/);
    assert.match(read('components/curriculum/SubjectForm.tsx'), /accessibilityLabel=\{t.subjects.name\}/);
    assert.match(read('components/layout/ScreenWrapper.tsx'), /contentMaxWidth/);
    const en = load('i18n/en.ts').default.subjects;
    const tr = load('i18n/tr.ts').default.subjects;
    assert.deepEqual(Object.keys(en), Object.keys(tr));
    assert.deepEqual(Object.keys(en.validation), Object.keys(tr.validation));
    assert.equal(en.topicCount(1), '1 topic'); assert.equal(tr.topicCount(61), '61 konu');
    for (const locale of [en,tr]) {
      assert.ok(locale.removeWarning('USER NAME').includes('USER NAME'));
      assert.ok(locale.committeeDeleteWarning('USER NAME').includes('USER NAME'));
    }
  });

  await check('UI Foundation primitives remain presentation-only with preserved geometry and accessibility', () => {
    for (const name of ['Input', 'FormField', 'Section', 'FeedbackState']) {
      const source = read('components/ui/' + name + '.tsx');
      assert.doesNotMatch(source, /expo-router|repositories|zustand|AsyncStorage|fetch\(/);
      assert.doesNotMatch(source, /numberOfLines/);
    }
    const layout = read('theme/layout.ts');
    assert.match(layout, /tablet: 600, largeTablet: 840/);
    assert.match(layout, /tablet: 720, largeTablet: 900/);
    assert.match(layout, /inputMinHeight: 48/);
    assert.match(layout, /textAreaMinHeight: 120/);
    assert.match(read('theme/interaction.ts'), /minTarget: 44/);
    assert.match(read('components/ui/Input.tsx'), /accessibilityState/);
    assert.match(read('components/ui/Input.tsx'), /onFocus\?\.\(event\)/);
    assert.match(read('components/ui/Input.tsx'), /invalid \? colors.error/);
    assert.match(read('components/ui/FeedbackState.tsx'), /accessibilityLiveRegion/);
    assert.match(read('components/curriculum/SubjectForm.tsx'), /<FormField/);
    assert.match(read('components/curriculum/SubjectEditor.tsx'), /<FeedbackState/);
    assert.match(read('app/subjects/[id].tsx'), /<Section>/);
  });

  await check('Topic-only delete preserves siblings, Subject, Committee and external records', () => fixture((db, r) => {
    seed(db); r.subjects.insert(subject()); r.topics.insert(topic()); r.topics.insert(topic('sibling'));
    const before = snapshot(db);
    assert.equal(r.topics.delete('t'), true);
    assert.equal(r.topics.getById('t'), null);
    assert.ok(r.topics.getById('sibling')); assert.ok(r.subjects.getById('s'));
    assert.deepEqual(snapshot(db), before);
    assert.equal(r.topics.delete('t'), false);
    assert.deepEqual(db.getAllSync('PRAGMA foreign_key_check'), []);
  }));
  await check('Topic route parsing and validated hierarchy fallbacks handle deletion and mismatches', () => fixture((db, r) => {
    committee(db); committee(db, 'c2'); r.subjects.insert(subject()); r.subjects.insert(subject('s2','c2'));
    r.topics.insert(topic());
    const route = load('utils/topicRoutes.ts', {
      '@/db/repositories/committeeRepo': { committeeRepo: { getById: id => db.getFirstSync('SELECT id FROM committees WHERE id=?', [id]) ?? null } },
      '@/db/repositories/subjectRepo': { subjectRepo: r.subjects },
      '@/db/repositories/topicRepo': { topicRepo: r.topics },
    });
    for (const value of [undefined,null,1,{},[],['t'],'',' ','a\u0000b']) assert.equal(route.topicRouteId(value), '');
    assert.equal(route.topicRouteId('t'), 't');
    assert.equal(route.topicFallback('c','s','t'), '/topics/t');
    assert.equal(route.topicFallback('c2','s2','t'), '/subjects/s2');
    assert.equal(route.topicFallback('c2','s','t'), '/committees/c2');
    r.topics.delete('t'); assert.equal(route.topicFallback('c','s','t'), '/subjects/s');
    r.subjects.delete('s'); assert.equal(route.topicFallback('c','s','t'), '/committees/c');
    db.runSync('DELETE FROM committees WHERE id=?', ['c']);
    assert.equal(route.topicFallback('c','s','t'), '/(tabs)/committees');
  }));
  await check('Topic pagination uses 50 and lookahead; count is independent and errors propagate', () => fixture((db, r) => {
    committee(db); r.subjects.insert(subject());
    for (let i = 49; i >= 0; i--) r.topics.insert(topic(String(i).padStart(3,'0')));
    assert.equal(r.topics.listBySubject('s',{ limit: 50 }).length, 50);
    assert.equal(r.topics.listBySubject('s',{ limit: 1, offset: 50 }).length, 0);
    r.topics.insert(topic('050'));
    assert.equal(r.topics.listBySubject('s',{ limit: 1, offset: 50 })[0].id, '050');
    assert.equal(r.topics.countBySubject('s'), 51);
    assert.equal(r.topics.listBySubject('s')[0].id, '000');
    const original = db.getAllSync; db.getAllSync = () => { throw Error('page failed'); };
    assert.throws(() => r.topics.listBySubject('s',{ offset: 50 }), /page failed/);
    db.getAllSync = original;
  }));
  await check('Topic forms and routes statically preserve validation, acknowledged writes and safe exits', () => {
    const editor = read('components/curriculum/TopicEditor.tsx');
    const form = read('components/curriculum/TopicForm.tsx');
    const detail = read('app/topics/[id].tsx');
    for (const file of ['app/topics/new.tsx','app/topics/edit/[id].tsx']) {
      assert.match(read(file), /topicRouteId/); assert.match(read(file), /TopicEditor/);
    }
    assert.match(editor, /subjectRepo.getById/); assert.match(editor, /committeeRepo.getById/);
    assert.match(editor, /current.subjectId !== subject.id/);
    assert.match(editor, /if \(context.current.key !== key\)/);
    assert.match(editor, /!topicRepo.update/);
    const save = editor.slice(editor.indexOf('  function save('), editor.indexOf('  useFocusEffect'));
    assert.ok(save.indexOf('router.dismissTo') > save.indexOf('topicRepo.insert'));
    assert.ok(save.indexOf('router.dismissTo') > save.indexOf('topicRepo.update'));
    assert.match(form, /validateCurriculum\(\{ name, description \}\)/);
    assert.match(form, /if \(submitting.current\) return/); assert.match(form, /if \(!saved\)/);
    assert.doesNotMatch(form, /setName\(''\)|setDescription\(''\)|unique/i);
    assert.match(detail, /!topicRepo.delete\(topic.id\)/);
    assert.match(detail, /router.dismissTo\(target\(\)\)/);
    for (const source of [editor,detail]) {
      for (const state of ['loading','missing','error','ready']) assert.ok(source.includes("'"+state+"'"));
      assert.match(source, /ScreenWrapper includeBottomSafeArea/);
      assert.match(source, /FeedbackState/); assert.match(source, /listener.remove\(\)/);
      assert.doesNotMatch(source, /router.back\(|numberOfLines|zustand/);
    }
    assert.match(form, /<Input/); assert.match(form, /<FormField/);
  });
  await check('Topic section wiring, retry paging and bilingual accessibility remain scoped', () => {
    const list = read('components/curriculum/TopicList.tsx');
    const detail = read('app/subjects/[id].tsx');
    assert.match(detail, /<TopicList key=\{data.subject.id\} subjectId=\{data.subject.id\}/);
    assert.match(detail, /topicRepo.countBySubject\(id\)/); assert.match(detail, /countError/);
    assert.match(list, /PAGE_SIZE = 50/); assert.match(list, /topicRepo.listBySubject/);
    assert.match(list, /limit: 1, offset: offset \+ PAGE_SIZE/);
    assert.match(list, /offset === 0 \? page : \[...previous, ...page\]/);
    assert.match(list, /load\(failedOffset\)/); assert.match(list, /nextOffset.current = 0; load\(0\)/);
    assert.match(list, /!loading && !error && items.length === 0/);
    assert.match(list, /accessibilityRole="button"/); assert.match(list, /accessibilityLabel=\{t.topics.open/);
    assert.match(list, /Interaction.minTarget/);
    assert.doesNotMatch(list, /countBySubject|setInterval|numberOfLines/);
    const en = load('i18n/en.ts').default.topics, tr = load('i18n/tr.ts').default.topics;
    assert.deepEqual(Object.keys(en),Object.keys(tr));
    assert.deepEqual(Object.keys(en.validation),Object.keys(tr.validation));
    assert.equal(en.removeWarning('X'), '“X” will be deleted.');
    assert.equal(tr.removeWarning('X'), '“X” silinecek.');
    for (const locale of [en,tr]) { assert.ok(locale.open('X').includes('X')); assert.ok(locale.parent('X').includes('X')); }
  });

  await check('Closure route params reject malformed values without imposing UUIDs; deleted parents fall back safely', () => fixture((db, r) => {
    committee(db); r.subjects.insert(subject());
    const route = load('utils/subjectRoutes.ts', {
      '@/db/repositories/committeeRepo': { committeeRepo: { getById: id => db.getFirstSync('SELECT id FROM committees WHERE id=?', [id]) ?? null } },
      '@/db/repositories/subjectRepo': { subjectRepo: r.subjects },
    });
    for (const value of [null,1,{},[],['s'],'',' ','a\u0000b','a\nb']) assert.equal(route.subjectRouteId(value), '');
    assert.equal(route.subjectRouteId("O'Brien İ / x"), "O'Brien İ / x");
    assert.equal(route.subjectFallback('c','s'), '/subjects/s');
    r.subjects.delete('s'); assert.equal(route.subjectFallback('c','s'), '/committees/c');
    db.runSync('DELETE FROM committees WHERE id=?',['c']);
    assert.equal(route.subjectFallback('c','s'), '/(tabs)/committees');
  }));
  await check('Committee closure wires verified exits, focus refresh and scrollable stack safe area', () => {
    const edit = read('app/committees/edit/[id].tsx'), detail = read('app/committees/[id].tsx');
    assert.match(edit, /subjectFallback\(id\)/);
    assert.match(edit, /if \(succeeded\) committeeExit\(committee.id\)/);
    assert.match(edit, /variant="ghost" onPress=\{\(\) => committeeExit\(id\)\}/);
    assert.match(edit, /useEffect\(\(\) =>/); // do not focus-reload active form drafts
    assert.match(detail, /useFocusEffect\(useCallback\(\(\) => \{\s*setError\(null\);\s*if \(id\) loadCommittee\(id\)/);
    for (const source of [edit,detail]) {
      assert.doesNotMatch(source, /router.back\(|canGoBack|scrollable=\{false\}|setInterval/);
      assert.match(source, /subjectRouteId\(params.id\)/);
      assert.match(source, /listener.remove\(\)/);
      for (const wrapper of source.matchAll(/<ScreenWrapper\b[^>]*>/g)) assert.match(wrapper[0], /includeBottomSafeArea/);
      assert.match(source, /minHeight: 44/);
      assert.match(source, /accessibilityLabel=\{t.common.back\}/);
    }
  });
  await check('Subject closure retains verified parent context across retries and cleans hardware back listeners', () => {
    for (const file of ['app/subjects/[id].tsx','components/curriculum/SubjectEditor.tsx']) {
      const source = read(file);
      assert.match(source, /context.current.committeeId/);
      assert.match(source, /subjectFallback/);
      assert.match(source, /hardwareBackPress/); assert.match(source, /listener.remove\(\)/);
      assert.doesNotMatch(source, /router.back\(|canGoBack/);
    }
    assert.match(read('components/curriculum/SubjectEditor.tsx'), /if \(context.current.key !== key\)/);
  });
  await check('Committee hierarchy delete confirmation is consistently EN/TR with unchanged leaf semantics', () => {
    const source = read('app/committees/[id].tsx');
    for (const key of ['committeeDeleteTitle','committeeDeleteWarning','committeeDeleteAction']) assert.ok(source.includes('t.subjects.'+key));
    assert.match(source, /text: t.common.cancel/);
    assert.match(source, /if \(deleteCommittee\(committeeId\)\) router.dismissTo/);
    for (const lang of ['en','tr']) {
      const locale = load('i18n/'+lang+'.ts').default;
      assert.ok(locale.subjects.committeeDeleteTitle); assert.ok(locale.subjects.committeeDeleteAction);
      assert.ok(locale.subjects.committeeDeleteWarning('X').includes('X'));
    }
  });

  console.log('\nPhase 4 static/in-memory validation passed: ' + passed + ' checks.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
