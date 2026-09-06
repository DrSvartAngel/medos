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
const scheduling = load('utils/memoryScheduling.ts');
const dates = load('utils/calendarDate.ts');
const migrations = read('db/migrations.ts');
const oldSource = migrations.slice(0,migrations.indexOf('  if (currentVersion < 9)'))+'\n}\nexport { CURRENT_VERSION };';
const migrate = (db,source=migrations) => load('db/migrations.ts',{'./client':{getDB:()=>db},'@/utils/calendarDate':dates},source).runMigrations();
const repo = db => load('db/repositories/memoryRepo.ts',{'../client':{getDB:()=>db},'@/utils/memoryScheduling':scheduling}).memoryRepo;
const card = (id='c') => ({id,deckId:'d',front:"İlaç O'Brien 🫀",back:'Yanıt\nİkinci satır',createdAt:1,updatedAt:1});
async function fixture(run) {
  const db = new Adapter();
  try {
    db.execSync('PRAGMA foreign_keys = ON'); await migrate(db);
    const r=repo(db); r.insertDeck({id:'d',name:'Deste',description:'',committeeId:null,createdAt:1,updatedAt:1});
    await run(db,r);
  } finally { db.closeSync(); }
}
async function main() {
  const evidenceState=load('utils/topicEvidenceRules.ts').topicReviewEvidenceState;
  const committeeRules=load('utils/committeeEvidenceRules.ts');
  const subjectRules=load('utils/subjectEvidenceRules.ts',{'./topicEvidenceRules':load('utils/topicEvidenceRules.ts')});
  await check('Closure truth table agrees across Topic, Subject and Committee without cross-Topic attention',()=>fixture((db,r)=>{
    curriculum(db);r.insertCard({...card('due'),topicId:'t'});r.insertCard({...card('future'),topicId:'t2'});
    db.runSync("UPDATE flashcards SET schedule_state='learning',next_review=1000 WHERE id='due'");
    r.insertReview({id:'r',cardId:'future',rating:'good',reviewedAt:1});
    function compare(at) {
      const topics=r.getSubjectLearningEvidence('s',at),subjects=r.getCommitteeLearningEvidence('committee',at);
      const subject=subjectRules.summarizeSubjectEvidence(topics),committee=committeeRules.summarizeCommitteeEvidence(subjects);
      let attention=0;
      for(const row of topics){
        const topic=r.getTopicLearningEvidence(row.id,at);
        assert.equal(evidenceState(row),evidenceState(topic));
        if(evidenceState(topic)==='attention')attention++;
      }
      assert.equal(subject.attentionTopics,attention);assert.equal(committee.attentionTopics,attention);
      for(const key of ['topics','studiedTopics','linkedCards','linkedReviews','dueCards','nextReviewAt'])assert.equal(committee[key],subject[key]);
      return committee;
    }
    // One Topic has due cards, the other reviews: the Committee must NOT infer attention.
    assert.equal(compare(1000).attentionSubjects,0);
    r.insertReview({id:'r2',cardId:'due',rating:'again',reviewedAt:1000});
    assert.equal(compare(600999).attentionTopics,0);assert.equal(compare(601000).attentionTopics,1);
    assert.equal(compare(259200001).attentionTopics,2);
    db.runSync("UPDATE topics SET learning_objectives='One\nTwo' WHERE subject_id='s'");
    assert.equal(compare(601000).attentionTopics,1);
  }));
  await check('Closure relink/delete preserves original review attribution, Focus history and schedule',()=>fixture((db,r)=>{
    curriculum(db);r.insertCard({...card(),topicId:'t'});
    r.insertReview({id:'r',cardId:'c',rating:'good',reviewedAt:1000});
    db.execSync("INSERT INTO focus_sessions(id,topic_id,duration_sec,actual_duration_sec,completed,cancelled,started_at,ended_at) VALUES ('f','t',60,60,1,0,1,60001)");
    r.updateCard({...r.getCardById('c'),topicId:'t2'});
    assert.equal(r.getTopicLearningEvidence('t').linkedReviews,1);assert.equal(r.getTopicLearningEvidence('t2').linkedReviews,0);
    const schedule=r.getCardById('c').schedule;
    db.runSync('DELETE FROM topics WHERE id=?',['t']);
    assert.equal(db.getFirstSync('SELECT topic_id FROM flashcard_reviews').topic_id,null);
    assert.equal(db.getFirstSync('SELECT topic_id FROM focus_sessions').topic_id,null);
    assert.equal(db.getFirstSync('SELECT actual_duration_sec FROM focus_sessions').actual_duration_sec,60);
    assert.equal(r.getReviewCount(),1);
    db.runSync('DELETE FROM topics WHERE id=?',['t2']);
    assert.equal(r.getCardById('c').topicId,null);assert.deepEqual(r.getCardById('c').schedule,schedule);
    assert.equal(r.getReviewCount(),1);assert.deepEqual(db.getAllSync('PRAGMA foreign_key_check'),[]);
  }));
  await check('Closure uses shared aggregation, foreground Focus refresh and existing accessible evidence surfaces',()=>{
    const repoSource=read('db/repositories/memoryRepo.ts');
    assert.equal((repoSource.match(/const TOPIC_EVIDENCE_CTES/g)||[]).length,1);
    assert.equal((repoSource.match(/\$\{TOPIC_EVIDENCE_CTES\}/g)||[]).length,2);
    const topic=read('app/topics/[id].tsx');assert.match(topic,/AppState.addEventListener/);assert.match(topic,/listener.remove\(\)/);
    for(const file of ['components/memory/TopicReviewEvidence.tsx','components/curriculum/SubjectLearningEvidence.tsx','components/curriculum/CommitteeLearningEvidence.tsx']) {
      const ui=read(file);for(const text of ['useFocusEffect','listener.remove()','clearTimeout(timer)','t.common.retry'])assert.ok(ui.includes(text));
      assert.doesNotMatch(ui,/setInterval|masteryPercent|progressPercent|retentionPercent|scheduleReview/);
    }
    assert.match(migrations,/const CURRENT_VERSION = 10/);assert.doesNotMatch(migrations,/currentVersion < 11/);
  });
  await check('Committee totals equal all Subject-derived evidence including empty Subjects and exact attention counts',()=>fixture((db,r)=>{
    curriculum(db);
    db.execSync("INSERT INTO subjects(id,committee_id,name,created_at,updated_at) VALUES ('a','committee','Empty',1,1),('b','committee','Other',1,1); INSERT INTO topics(id,subject_id,name,created_at,updated_at) VALUES ('future','b','Future',1,1),('untracked','b','Untracked',2,2),('due-no-review','b','Due',3,3)");
    r.insertCard({...card('one'),topicId:'t'});r.insertCard({...card('two'),topicId:'future'});r.insertCard({...card('three'),topicId:'due-no-review'});
    r.insertReview({id:'r1',cardId:'one',rating:'again',reviewedAt:1});r.insertReview({id:'r2',cardId:'one',rating:'again',reviewedAt:2});
    r.insertReview({id:'r3',cardId:'two',rating:'good',reviewedAt:1});
    db.execSync("UPDATE flashcards SET schedule_state='learning',next_review=1 WHERE id='three'; INSERT INTO focus_sessions(id,topic_id,duration_sec,actual_duration_sec,completed,cancelled,started_at,ended_at) VALUES ('f','t',30,30,0,1,1,30001),('f2','t',30,30,1,0,1,30001)");
    const rows=r.getCommitteeLearningEvidence('committee',600002);
    assert.deepEqual(rows.map(x=>x.id),['a','b','s']);
    for(const row of rows){
      const expected=subjectRules.summarizeSubjectEvidence(r.getSubjectLearningEvidence(row.id,600002));
      const {id,name,...actual}=row;assert.deepEqual(actual,expected);
    }
    assert.deepEqual(committeeRules.summarizeCommitteeEvidence(rows),{subjects:3,topics:5,studiedTopics:1,linkedCards:3,linkedReviews:3,dueCards:2,attentionTopics:1,attentionSubjects:1,nextReviewAt:259200001});
    assert.deepEqual(committeeRules.filterCommitteeEvidence(rows,true).map(x=>x.id),['s']);
    assert.deepEqual(committeeRules.filterCommitteeEvidence(rows,false),rows);
    assert.equal(rows[1].attentionTopics,0);assert.equal(rows[0].topics,0);
    r.insertReview({id:'r4',cardId:'three',rating:'again',reviewedAt:3});
    assert.equal(committeeRules.summarizeCommitteeEvidence(r.getCommitteeLearningEvidence('committee',600003)).attentionSubjects,2);
  }));
  await check('Committee scope excludes other committees/legacy unlinked records and query count stays constant',()=>fixture((db,r)=>{
    curriculum(db);db.execSync("INSERT INTO committees(id,name,subject,created_at) VALUES ('other','Other','',1); INSERT INTO subjects(id,committee_id,name,created_at,updated_at) VALUES ('outside','other','Outside',1,1); INSERT INTO topics(id,subject_id,name,created_at,updated_at) VALUES ('outside-topic','outside','Outside',1,1)");
    r.insertCard({...card('outside'),topicId:'outside-topic'});r.insertReview({id:'outside',cardId:'outside',rating:'again',reviewedAt:1});
    r.insertCard(card('legacy'));r.insertReview({id:'legacy',cardId:'legacy',rating:'again',reviewedAt:1});
    for(let i=0;i<55;i++)db.runSync('INSERT INTO subjects(id,committee_id,name,created_at,updated_at) VALUES (?,?,?,?,?)',['x'+i,'committee',"Ders O'Brien",2,2]);
    let queries=0;const first=db.getFirstSync.bind(db),all=db.getAllSync.bind(db);
    db.getFirstSync=(...a)=>{queries++;return first(...a);};db.getAllSync=(...a)=>{queries++;return all(...a);};
    const rows=r.getCommitteeLearningEvidence('committee',600001);assert.equal(queries,2);assert.equal(rows.length,56);
    const sum=committeeRules.summarizeCommitteeEvidence(rows);assert.equal(sum.linkedReviews,0);assert.equal(sum.linkedCards,0);assert.equal(sum.attentionSubjects,0);
    assert.throws(()=>r.getCommitteeLearningEvidence('missing'));assert.throws(()=>r.getCommitteeLearningEvidence('committee',NaN));
    db.getAllSync=()=>{throw Error('unavailable');};assert.throws(()=>r.getCommitteeLearningEvidence('committee'));
  }));
  await check('Committee view keeps curriculum order, totals before filtering/paging, focused refresh and no scoring',()=>{
    const ui=read('components/curriculum/CommitteeLearningEvidence.tsx');
    for(const text of ['summarizeCommitteeEvidence(rows)','filterCommitteeEvidence(rows, attentionOnly)','filtered.slice(0,visible)','useFocusEffect','AppState.addEventListener','clearTimeout(timer)','listener.remove()','deadline - Date.now()','/subjects/${encodeURIComponent(row.id)}','accessibilityLabel'])assert.ok(ui.includes(text));
    assert.match(read('app/committees/[id].tsx'),/CommitteeLearningEvidence/);
    assert.doesNotMatch(ui,/setInterval|scheduleReview|examPlan|mastery|percentage|retention|useFocusStore/);
    for(const lang of ['en','tr'])assert.ok(load('i18n/'+lang+'.ts').default.committeeEvidence.noneAttention);
    assert.match(migrations,/const CURRENT_VERSION = 10/);assert.doesNotMatch(migrations,/currentVersion < 11/);
  });
  await check('Subject aggregates equal exact Topic facts, preserve order and filter only approved attention',()=>fixture((db,r)=>{
    curriculum(db);
    db.execSync("INSERT INTO topics(id,subject_id,name,created_at,updated_at) VALUES ('a','s','Untracked',1,1),('b','s','Future',1,1),('c0','s','Due without review',1,1)");
    r.insertCard({...card('one'),topicId:'t'});r.insertCard({...card('two'),topicId:'b'});r.insertCard({...card('three'),topicId:'c0'});
    r.insertReview({id:'r1',cardId:'one',rating:'again',reviewedAt:1});
    r.insertReview({id:'r2',cardId:'one',rating:'again',reviewedAt:2});
    r.insertReview({id:'r3',cardId:'two',rating:'good',reviewedAt:1});
    db.runSync("UPDATE flashcards SET schedule_state='learning',next_review=1 WHERE id='three'");
    db.execSync("INSERT INTO focus_sessions(id,topic_id,duration_sec,actual_duration_sec,completed,cancelled,started_at,ended_at) VALUES ('f','a',30,30,1,0,1,30001),('f2','a',40,40,1,0,1,40001),('false-start','t2',10,10,0,1,1,10001)");
    const rows=r.getSubjectLearningEvidence('s',600002);
    assert.deepEqual(rows.map(x=>x.id),['a','b','c0','t','t2']);
    for(const row of rows) {
      const one=r.getTopicLearningEvidence(row.id,600002);
      for(const key of ['linkedCards','linkedReviews','dueCards','nextReviewAt'])assert.equal(row[key],one[key]);
    }
    assert.equal(rows[0].studyRecorded,1);assert.equal(rows[4].studyRecorded,0);
    assert.deepEqual(subjectRules.summarizeSubjectEvidence(rows),{topics:5,studiedTopics:1,linkedCards:3,linkedReviews:3,dueCards:2,attentionTopics:1,nextReviewAt:259200001});
    assert.deepEqual(subjectRules.filterSubjectEvidence(rows,true).map(x=>x.id),['t']);
    assert.deepEqual(subjectRules.filterSubjectEvidence(rows,false),rows);
    assert.equal(evidenceState(rows[0]),'insufficient');assert.equal(evidenceState(rows[1]),'available');assert.equal(evidenceState(rows[2]),'insufficient');
  }));
  await check('Subject query is scoped, bounded in query count, independent of presentation limits and legacy records',()=>fixture((db,r)=>{
    curriculum(db);db.execSync("INSERT INTO subjects(id,committee_id,name,created_at,updated_at) VALUES ('empty','committee','Empty',1,1)");
    r.insertCard(card('legacy'));r.insertReview({id:'unlinked',cardId:'legacy',rating:'again',reviewedAt:1});
    for(let i=0;i<55;i++)db.runSync('INSERT INTO topics(id,subject_id,name,created_at,updated_at) VALUES (?,?,?,?,?)',['x'+i,'s','Konu',3,3]);
    let queries=0;const first=db.getFirstSync.bind(db),all=db.getAllSync.bind(db);
    db.getFirstSync=(...args)=>{queries++;return first(...args);};db.getAllSync=(...args)=>{queries++;return all(...args);};
    const rows=r.getSubjectLearningEvidence('s',600001);assert.equal(queries,2);
    const totals=subjectRules.summarizeSubjectEvidence(rows);assert.equal(totals.topics,57);assert.equal(totals.linkedReviews,0);assert.equal(totals.attentionTopics,0);
    assert.deepEqual(r.getSubjectLearningEvidence('empty'),[]);assert.throws(()=>r.getSubjectLearningEvidence('missing'));
    db.getAllSync=()=>{throw Error('unavailable');};assert.throws(()=>r.getSubjectLearningEvidence('s'));
  }));
  await check('Subject Focus context exactly matches existing concluded-study predicate, never attention',()=>fixture((db,r)=>{
    curriculum(db);
    const focus=load('db/repositories/focusRepo.ts',{'../client':{getDB:()=>db}}).focusRepo;
    for(const [duration,completed,cancelled,ended] of [[0,1,0,1],[29,0,1,30000],[30,0,1,30001],[1,1,0,2],[60,1,1,60001],[60,1,0,null]]) {
      db.execSync('DELETE FROM focus_sessions');
      db.runSync('INSERT INTO focus_sessions(id,topic_id,duration_sec,actual_duration_sec,completed,cancelled,started_at,ended_at) VALUES (?,?,?,?,?,?,?,?)',['f','t',60,duration,completed,cancelled,1,ended]);
      const row=r.getSubjectLearningEvidence('s')[0];
      assert.equal(row.studyRecorded===1,focus.hasTopicStudyActivity('t'));assert.equal(evidenceState(row),'insufficient');
    }
  }));
  await check('Subject view uses truthful totals before filtering/paging and cleans focused refresh resources',()=>{
    const ui=read('components/curriculum/SubjectLearningEvidence.tsx');
    for(const text of ['summarizeSubjectEvidence(rows)','filterSubjectEvidence(rows, attentionOnly)','filtered.slice(0,visible)','useFocusEffect','AppState.addEventListener','clearTimeout(timer)','listener.remove()','deadline - Date.now()','encodeURIComponent(row.id)','accessibilityLabel'])assert.ok(ui.includes(text));
    assert.match(read('app/subjects/[id].tsx'),/SubjectLearningEvidence/);
    assert.doesNotMatch(ui,/setInterval|scheduleReview|examPlan|mastery|percentage|retention|useFocusStore/);
    for(const lang of ['en','tr'])assert.ok(load('i18n/'+lang+'.ts').default.subjectEvidence.noneAttention);
  });
  await check('Attention requires recorded topic reviews AND due linked cards; unknown is not weak',()=>{
    for(const dueCards of [0,1,8])assert.equal(evidenceState({linkedReviews:0,dueCards}),'insufficient');
    assert.equal(evidenceState({linkedReviews:2,dueCards:0}),'available');
    assert.equal(evidenceState({linkedReviews:2,dueCards:1}),'attention');
    assert.throws(()=>evidenceState({linkedReviews:NaN,dueCards:0}));
    assert.throws(()=>evidenceState({linkedReviews:1,dueCards:-1}));
    assert.doesNotMatch(read('utils/topicEvidenceRules.ts'),/learningObjectives|focusRepo|percentage|rating|again|hard/);
  });
  await check('Exact Topic counts distinguish unscheduled, future and due boundaries without multiplying reviews',()=>fixture((db,r)=>{
    curriculum(db);
    assert.deepEqual({...r.getTopicLearningEvidence('t',1000)},{linkedCards:0,linkedReviews:0,dueCards:0,nextReviewAt:null});
    r.insertCard({...card('a'),topicId:'t'});r.insertCard({...card('b'),topicId:'t'});r.insertCard(card('legacy'));
    r.insertReview({id:'old',cardId:'legacy',rating:'again',reviewedAt:1000});
    assert.equal(r.getTopicLearningEvidence('t',999999).dueCards,0);
    r.insertReview({id:'a1',cardId:'a',rating:'again',reviewedAt:1000});
    r.insertReview({id:'b1',cardId:'b',rating:'good',reviewedAt:1000});
    r.insertReview({id:'b2',cardId:'b',rating:'hard',reviewedAt:2000});
    const before=r.getTopicLearningEvidence('t',600999);
    assert.deepEqual({...before},{linkedCards:2,linkedReviews:3,dueCards:0,nextReviewAt:601000});
    assert.equal(evidenceState(before),'available');
    const at=r.getTopicLearningEvidence('t',601000);
    assert.equal(at.dueCards,1);assert.equal(evidenceState(at),'attention');
    assert.equal(at.nextReviewAt,2000+4*86400000);
    assert.equal(r.getTopicLearningEvidence('t2',601000).linkedReviews,0);
    db.runSync("UPDATE topics SET learning_objectives='Many lines' WHERE id='t'");
    assert.deepEqual(r.getTopicLearningEvidence('t',601000),at);
  }));
  await check('Relinking preserves snapshot counts, legacy evidence stays unlinked, missing/error is not zero',()=>fixture((db,r)=>{
    curriculum(db);r.insertCard({...card(),topicId:'t'});
    r.insertReview({id:'r',cardId:'c',rating:'again',reviewedAt:1});
    r.updateCard({...r.getCardById('c'),topicId:'t2'});
    assert.deepEqual({...r.getTopicLearningEvidence('t',600001)},{linkedCards:0,linkedReviews:1,dueCards:0,nextReviewAt:null});
    const moved=r.getTopicLearningEvidence('t2',600001);
    assert.equal(moved.linkedCards,1);assert.equal(moved.dueCards,1);assert.equal(moved.linkedReviews,0);
    assert.equal(evidenceState(moved),'insufficient');
    db.runSync("DELETE FROM topics WHERE id='t2'");assert.equal(r.getCardById('c').topicId,null);assert.equal(r.getReviewCount(),1);
    assert.throws(()=>r.getTopicLearningEvidence('t2'));assert.throws(()=>r.getTopicLearningEvidence('t',NaN));
    db.getFirstSync=()=>{throw Error('unavailable');};assert.throws(()=>r.getTopicLearningEvidence('t'));
  }));
  await check('Evidence presentation is focus/foreground/deadline refreshed, cleaned on blur, factual and bilingual',()=>{
    const source=read('components/memory/TopicReviewEvidence.tsx');
    for(const text of ['useFocusEffect','AppState.addEventListener','clearTimeout(timer)','listener.remove()','next.nextReviewAt - Date.now()','topicReviewEvidenceState(evidence)'])assert.ok(source.includes(text));
    assert.doesNotMatch(source,/setInterval|useFocusStore|focusRepo|scheduleReview|learningObjectives/);
    assert.match(source,/evidence === undefined/);assert.match(source,/evidence === null/);
    for(const lang of ['en','tr']){
      const copy=load('i18n/'+lang+'.ts').default.topicEvidence;
      for(const key of ['title','attention','available','insufficient','help'])assert.ok(copy[key]);
      for(const key of ['cards','reviews','due'])assert.ok(copy[key](3).includes('3'));
    }
    assert.match(migrations,/const CURRENT_VERSION = 10/);assert.doesNotMatch(migrations,/currentVersion < 11/);
  });
  await check('v9 to v10 preserves legacy cards/reviews, defaults null and rolls back both link columns', async()=>{
    const db=new Adapter();
    const v9=migrations.slice(0,migrations.indexOf('  if (currentVersion < 10)'))+'\n}\nexport { CURRENT_VERSION };';
    try {
      db.execSync('PRAGMA foreign_keys=ON');await migrate(db,v9);
      db.execSync("INSERT INTO decks(id,name,subject,created_at) VALUES ('d','D','',1); INSERT INTO flashcards(id,deck_id,front,back,next_review,created_at) VALUES ('c','d','İlaç','Yanıt',1,1); INSERT INTO flashcard_reviews(id,card_id,rating,reviewed_at) VALUES ('r','c','good',1)");
      const before=db.getFirstSync('SELECT * FROM flashcards'), history=db.getFirstSync('SELECT * FROM flashcard_reviews');
      for(const part of ['ALTER TABLE flashcards','ALTER TABLE flashcard_reviews','UPDATE _schema_version']) {
        db.fail=sql=>sql.startsWith(part);await assert.rejects(()=>migrate(db),/injected/);
        assert.equal(db.getFirstSync('SELECT version FROM _schema_version').version,9);
        assert.deepEqual(db.getFirstSync('SELECT * FROM flashcards'),before);
        assert.deepEqual(db.getFirstSync('SELECT * FROM flashcard_reviews'),history);
      }
      db.fail=()=>false;await migrate(db);await migrate(db);
      assert.equal(db.getFirstSync('SELECT version FROM _schema_version').version,10);
      assert.deepEqual({...db.getFirstSync('SELECT * FROM flashcards')},{...before,topic_id:null});
      assert.deepEqual({...db.getFirstSync('SELECT * FROM flashcard_reviews')},{...history,topic_id:null});
      for(const table of ['flashcards','flashcard_reviews']) {
        const fk=db.getAllSync('PRAGMA foreign_key_list('+table+')').find(f=>f.from==='topic_id');
        assert.equal(fk.table,'topics');assert.equal(fk.on_delete,'SET NULL');
      }
      assert.deepEqual(db.getAllSync('PRAGMA foreign_key_check'),[]);
    }finally{db.closeSync();}
  });
  function curriculum(db) {
    db.execSync("INSERT INTO committees(id,name,subject,created_at) VALUES ('committee','Komite','',1); INSERT INTO subjects(id,committee_id,name,created_at,updated_at) VALUES ('s','committee','Ders',1,1); INSERT INTO topics(id,subject_id,name,created_at,updated_at) VALUES ('t','s','Konu',1,1),('t2','s','İkinci konu',2,2)");
  }
  await check('Optional link/unlink persists without changing deck, content, timestamps or schedule',()=>fixture((db,r)=>{
    curriculum(db);r.insertCard(card());assert.equal(r.getCardById('c').topicId,null);
    r.insertReview({id:'first',cardId:'c',rating:'good',reviewedAt:1});
    const before=r.getCardById('c');
    r.updateCard({...before,topicId:'t'});const linked=repo(db).getCardById('c');
    assert.equal(linked.topicId,'t');assert.equal(linked.deckId,'d');assert.deepEqual(linked.schedule,before.schedule);
    assert.equal(linked.front,before.front);assert.equal(linked.createdAt,before.createdAt);
    r.updateCard({...linked,topicId:undefined});assert.equal(r.getCardById('c').topicId,'t');
    r.updateCard({...linked,topicId:null});assert.equal(repo(db).getCardById('c').topicId,null);
    r.insertCard({...card('linked'),topicId:'t'});assert.equal(r.getCardById('linked').topicId,'t');
    for(const topicId of ['missing','',42,[],{}]) assert.throws(()=>r.insertCard({...card('bad'),topicId}));
    assert.throws(()=>r.updateCard({...linked,topicId:'missing'}));
    assert.throws(()=>r.updateCard({...linked,id:'missing'}));
    assert.throws(()=>r.updateCard({...linked,deckId:'other'}));
    assert.equal(r.getReviewCount(),1);
  }));
  await check('Reviews snapshot current persisted link; legacy/relink/unlink never reattribute history',()=>fixture((db,r)=>{
    curriculum(db);r.insertCard(card());
    r.insertReview({id:'legacy',cardId:'c',rating:'hard',reviewedAt:1});
    r.updateCard({...r.getCardById('c'),topicId:'t'});
    assert.equal(r.hasTopicReviewActivity('t'),false);
    r.insertReview({id:'linked',cardId:'c',rating:'again',reviewedAt:2});
    assert.equal(r.hasTopicReviewActivity('t'),true);assert.equal(r.hasTopicReviewActivity('t2'),false);
    r.updateCard({...r.getCardById('c'),topicId:'t2'});
    assert.equal(r.hasTopicReviewActivity('t2'),false);
    r.insertReview({id:'relinked',cardId:'c',rating:'easy',reviewedAt:3});
    r.updateCard({...r.getCardById('c'),topicId:null});
    r.insertReview({id:'unlinked',cardId:'c',rating:'good',reviewedAt:4});
    assert.deepEqual(db.getAllSync('SELECT topic_id FROM flashcard_reviews ORDER BY reviewed_at').map(r=>r.topic_id),[null,'t','t2',null]);
    assert.equal(r.hasTopicReviewActivity('t'),true);assert.equal(r.hasTopicReviewActivity('t2'),true);
    // Failed schedule update cannot leave a falsely attributed review behind.
    r.updateCard({...r.getCardById('c'),topicId:'t'});db.fail=sql=>sql.startsWith('UPDATE flashcards');
    assert.throws(()=>r.insertReview({id:'failed',cardId:'c',rating:'good',reviewedAt:5}));
    assert.equal(r.getReviewCount(),4);
  }));
  await check('Deleting Topic or its ancestors preserves cards/reviews/schedules with null references',()=>fixture((db,r)=>{
    curriculum(db);r.insertCard({...card(),topicId:'t'});r.insertReview({id:'r',cardId:'c',rating:'good',reviewedAt:1});
    const schedule=r.getCardById('c').schedule;
    db.runSync('DELETE FROM topics WHERE id=?',['t']);
    assert.equal(r.getCardById('c').topicId,null);assert.deepEqual(r.getCardById('c').schedule,schedule);
    assert.equal(r.getReviewCount(),1);assert.equal(db.getFirstSync('SELECT topic_id FROM flashcard_reviews').topic_id,null);
    r.updateCard({...r.getCardById('c'),topicId:'t2'});r.insertReview({id:'r2',cardId:'c',rating:'hard',reviewedAt:2});
    db.runSync('DELETE FROM committees WHERE id=?',['committee']);
    assert.equal(r.getCardById('c').topicId,null);assert.equal(r.getReviewCount(),2);assert.equal(r.getAllDecks().length,1);
    assert.deepEqual(db.getAllSync('PRAGMA foreign_key_check'),[]);
  }));
  await check('Picker queries are bounded, parent-scoped, deterministic and parameterized',()=>fixture((db,r)=>{
    curriculum(db);
    for(let i=0;i<55;i++)db.runSync('INSERT INTO topics(id,subject_id,name,created_at,updated_at) VALUES (?,?,?,?,?)',['x'+String(i).padStart(2,'0'),'s',"O'Brien İlaç",3,3]);
    assert.equal(r.listTopicLinkChoices('committee',null).length,1);
    assert.equal(r.listTopicLinkChoices('subject','committee').length,1);
    const a=r.listTopicLinkChoices('topic','s'),b=r.listTopicLinkChoices('topic','s',50);
    assert.equal(a.length,51);assert.equal(b.length,7);assert.equal(a[50].id,b[0].id);
    assert.deepEqual(r.listTopicLinkChoices('topic',"' OR 1=1 --"),[]);
    assert.throws(()=>r.listTopicLinkChoices('topic','s',-1));
    assert.deepEqual({...r.getTopicLinkContext('t')},{topic:'Konu',subject:'Ders',committee:'Komite'});
  }));
  await check('Evidence query failure is not no-evidence; exact rating-time evidence has no score',()=>fixture((db,r)=>{
    curriculum(db);assert.equal(r.hasTopicReviewActivity('t'),false);
    db.getFirstSync=()=>{throw Error('unavailable');};assert.throws(()=>r.hasTopicReviewActivity('t'));
    const source=read('components/memory/TopicReviewEvidence.tsx');
    assert.match(source,/useFocusEffect/);assert.match(source,/evidence === null/);assert.match(source,/t.common.retry/);
    assert.doesNotMatch(source,/schedule|percentage|mastery|learningObjectives|weak|dueAt/);
  }));
  await check('Phase 5.2 UI wiring uses optional local state, EN/TR, Foundation and stack safe-area',()=>{
    const form=read('components/memory/FlashcardForm.tsx'),picker=read('components/memory/TopicLinkPicker.tsx');
    assert.match(form,/initialTopicId = null/);assert.match(form,/topicId \}/);assert.match(form,/TopicLinkPicker/);
    assert.match(picker,/PAGE_SIZE = 50/);assert.match(picker,/accessibilityLabel/);assert.match(picker,/onChange\(null\)/);
    assert.match(picker,/slice\(0, PAGE_SIZE\)/);assert.match(picker,/setFailed\(page\)/);
    assert.match(picker,/components\/ui\/Section/);assert.doesNotMatch(picker,/zustand|AsyncStorage|router/);
    for(const route of ['app/decks/[id]/cards/new.tsx','app/decks/[id]/cards/[cardId]/edit.tsx'])assert.match(read(route),/includeBottomSafeArea/);
    assert.match(read('app/topics/[id].tsx'),/<TopicReviewEvidence topicId=\{id\}/);
    for(const lang of ['en','tr']) {
      const t=load('i18n/'+lang+'.ts').default.memoryTopic;
      for(const key of ['label','help','recorded','unrecorded','evidenceError','unlink','missing'])assert.ok(t[key]);
    }
    for(const file of ['store/useTopicStore.ts','store/useCurriculumStore.ts'])assert.equal(fs.existsSync(path.join(root,file)),false);
    assert.doesNotMatch(read('store/useMemoryStore.ts'),/mastery|weakTopic|retentionPercent/);
    const v10=migrations.slice(migrations.indexOf('  if (currentVersion < 10)'));
    assert.equal((v10.match(/ADD COLUMN/g)||[]).length,2);assert.doesNotMatch(v10,/CREATE TABLE|CREATE INDEX|DELETE FROM|currentVersion < 11/);
  });
  await check('v8 migration preserves historical values/content/reviews, rolls back and reruns',async()=>{
    const db=new Adapter();
    try {
      await migrate(db,oldSource);
      db.execSync("INSERT INTO decks(id,name,subject,created_at) VALUES ('d','D','',1); INSERT INTO flashcards(id,deck_id,front,back,interval,ease,next_review,created_at) VALUES ('c','d','İlaç','Yanıt',123,2.1,99,1); INSERT INTO flashcard_reviews (id,card_id,rating,reviewed_at) VALUES ('old','c','hard',2)");
      const before=db.getFirstSync('SELECT * FROM flashcards'), reviews=db.getAllSync('SELECT * FROM flashcard_reviews');
      for(const part of ['ALTER TABLE flashcards','UPDATE _schema_version']) {
        db.fail=sql=>sql.startsWith(part); await assert.rejects(()=>migrate(db),/injected/);
        assert.equal(db.getFirstSync('SELECT version FROM _schema_version').version,8);
        assert.deepEqual(db.getFirstSync('SELECT * FROM flashcards'),before);
      }
      db.fail=()=>false; await migrate(db); await migrate(db);
      assert.equal(db.getFirstSync('SELECT version FROM _schema_version').version,10);
      assert.deepEqual({...db.getFirstSync('SELECT * FROM flashcards')},{...before,schedule_state:'unscheduled',topic_id:null});
      assert.deepEqual(db.getAllSync('SELECT * FROM flashcard_reviews').map(r=>({...r})),reviews.map(r=>({...r,topic_id:null})));
      assert.equal(repo(db).getCardById('c').schedule.state,'unscheduled');
      assert.equal(repo(db).getCardById('c').schedule.nextReviewAt,null);
    }finally{db.closeSync();}
  });
  await check('First ratings and Again reset follow exact approved intervals',()=>{
    const at=1000;
    for(const [rating,days] of [['hard',1],['good',3],['easy',7]]) {
      assert.deepEqual(scheduling.scheduleReview({state:'unscheduled',intervalDays:999},rating,at),
        {state:'reviewing',intervalDays:days,nextReviewAt:at+days*86400000});
    }
    const again=scheduling.scheduleReview({state:'reviewing',intervalDays:90},'again',at);
    assert.deepEqual(again,{state:'learning',intervalDays:0,nextReviewAt:601000});
    assert.equal(scheduling.scheduleReview(again,'good',at).intervalDays,3);
  });
  await check('Subsequent ratings use ceiling and minimum one-day increase from new timestamp',()=>{
    for(const n of [1,3,7,31,365]) for(const [rating,m] of [['hard',1.2],['good',2],['easy',3]]) {
      const result=scheduling.scheduleReview({state:'reviewing',intervalDays:n},rating,123456);
      const days=Math.max(n+1,Math.ceil(n*m));
      assert.equal(result.intervalDays,days);assert.equal(result.nextReviewAt,123456+days*86400000);
      assert.deepEqual(result,scheduling.scheduleReview({state:'reviewing',intervalDays:n},rating,123456));
    }
    for(const at of [-1,NaN,Infinity,1.5]) assert.throws(()=>scheduling.scheduleReview({state:'unscheduled',intervalDays:1},'good',at));
    assert.throws(()=>scheduling.scheduleReview({state:'reviewing',intervalDays:-1},'good',1));
    assert.throws(()=>scheduling.scheduleReview({state:'unscheduled',intervalDays:1},'bad',1));
  });
  await check('Due-first ordering excludes future cards and distinguishes new from legacy unscheduled',()=>fixture((db,r)=>{
    for(const id of ['new','legacy','due-a','due-b','future'])r.insertCard(card(id));
    db.runSync("INSERT INTO flashcard_reviews (id,card_id,rating,reviewed_at) VALUES ('legacy-review','legacy','good',1)");
    for(const id of ['due-a','due-b'])r.insertReview({id:'r'+id,cardId:id,rating:'again',reviewedAt:1000});
    r.insertReview({id:'future-review',cardId:'future',rating:'good',reviewedAt:1000});
    assert.deepEqual(r.getDueReviewQueue('d',601000).map(c=>c.id),['due-a','due-b','legacy','new']);
    assert.equal(r.getCardById('new').schedule.state,'new');
    assert.equal(r.getCardById('legacy').schedule.state,'unscheduled');
    assert.deepEqual({...r.getScheduleSummary('d',601000)},{due:2,newCards:1,unscheduled:1,nextReviewAt:259201000});
    assert.equal(r.getReviewQueue('d').length,5);assert.equal(r.getReviewQueue('d',3).length,3);
    assert.equal(r.getDueReviewQueue('d',600999).length,2);
  }));
  await check('Atomic history/schedule writes rollback together and reject duplicate review IDs',()=>fixture((db,r)=>{
    r.insertCard(card());const before=db.getFirstSync("SELECT * FROM flashcards WHERE id='c'");
    const review={id:'r',cardId:'c',rating:'good',reviewedAt:1000};
    for(const prefix of ['INSERT INTO flashcard_reviews','UPDATE flashcards']) {
      db.fail=sql=>sql.startsWith(prefix);assert.throws(()=>r.insertReview(review),/injected/);
      assert.equal(r.getReviewCount('d'),0);assert.deepEqual(db.getFirstSync("SELECT * FROM flashcards WHERE id='c'"),before);
    }
    db.fail=()=>false;r.insertReview(review);
    const saved=db.getFirstSync("SELECT * FROM flashcards WHERE id='c'");
    assert.throws(()=>r.insertReview(review));assert.equal(r.getReviewCount('d'),1);
    assert.deepEqual(db.getFirstSync("SELECT * FROM flashcards WHERE id='c'"),saved);
    const fresh=repo(db).getCardById('c');
    assert.equal(fresh.front,card().front);assert.equal(fresh.back,card().back);
    assert.equal(fresh.schedule.nextReviewAt,259201000);
    r.insertReview({...review,id:'early',reviewedAt:2000});
    assert.equal(r.getCardById('c').schedule.nextReviewAt,2000+6*86400000);
    r.deleteCard('c');assert.equal(r.getReviewCount('d'),0);assert.deepEqual(db.getAllSync('PRAGMA foreign_key_check'),[]);
  }));
  await check('Real Memory store preserves answer on failure, advances once and keeps sessions bounded',()=>fixture((db,r)=>{
    for(let i=0;i<20;i++)r.insertCard(card(String(i)));
    let state;
    load('store/useMemoryStore.ts',{
      zustand:{create:()=>init=>{const get=()=>state;const set=p=>{state={...state,...(typeof p==='function'?p(state):p)};};state=init(set,get);return{getState:get};}},
      '@/db/repositories/memoryRepo':{memoryRepo:r},
    });
    state.startReview('d',5);assert.equal(state.reviewQueue.length,5);
    state.revealAnswer();db.fail=sql=>sql.startsWith('UPDATE flashcards');
    assert.equal(state.rateCurrentCard('again'),false);assert.equal(state.reviewStatus,'answer');assert.equal(state.reviewIndex,0);
    db.fail=()=>false;assert.equal(state.rateCurrentCard('again'),true);
    assert.equal(state.reviewIndex,1);assert.equal(state.rateCurrentCard('again'),false);
    assert.equal(r.getReviewCount('d'),1);assert.equal(state.reviewQueue.length,5);
    state.exitReview();state.startReview('d');assert.equal(state.reviewQueue.length,20);
    state.exitReview();state.startReview('d',undefined,'due');assert.equal(state.reviewQueue.length,19);
  }));
  await check('Due query errors are propagated, never represented as empty success',()=>fixture((db,r)=>{
    db.getAllSync=()=>{throw Error('read unavailable');};
    assert.throws(()=>r.getDueReviewQueue('d'),/read unavailable/);
    db.getFirstSync=()=>{throw Error('read unavailable');};
    assert.throws(()=>r.getScheduleSummary('d'),/read unavailable/);
  }));
  await check('UI mode/retry/again keep due routing and preserve all/recovery; no unapproved scoring/dependencies',()=>{
    const screen=read('app/decks/[id]/review.tsx');
    assert.equal((screen.match(/startReview\(id, reviewLimit, dueMode \? 'due' : 'all'\)/g)||[]).length,3);
    assert.match(screen,/RECOVERY_REVIEW_LIMIT/);assert.match(screen,/t.scheduling.noneDue/);
    assert.match(read('components/memory/MemorySchedulePanel.tsx'),/useFocusEffect/);
    assert.match(read('components/memory/FlashcardListItem.tsx'),/t.scheduling.next/);
    for(const lang of ['en','tr'])assert.ok(load('i18n/'+lang+'.ts').default.scheduling.reviewDue);
    assert.doesNotMatch(read('db/repositories/memoryRepo.ts'),/Gemini|mastery|retention/);
    const pkg=JSON.parse(read('package.json')),lock=JSON.parse(read('package-lock.json')).packages[''];
    assert.deepEqual(pkg.dependencies,lock.dependencies);assert.deepEqual(pkg.devDependencies,lock.devDependencies);
  });
  console.log('\nPhase 5 static/in-memory validation passed: '+passed+' checks.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});

