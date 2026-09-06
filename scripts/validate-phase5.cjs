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
  await check('v8 migration preserves historical values/content/reviews, rolls back and reruns',async()=>{
    const db=new Adapter();
    try {
      await migrate(db,oldSource);
      db.execSync("INSERT INTO decks(id,name,subject,created_at) VALUES ('d','D','',1); INSERT INTO flashcards(id,deck_id,front,back,interval,ease,next_review,created_at) VALUES ('c','d','İlaç','Yanıt',123,2.1,99,1); INSERT INTO flashcard_reviews VALUES ('old','c','hard',2)");
      const before=db.getFirstSync('SELECT * FROM flashcards'), reviews=db.getAllSync('SELECT * FROM flashcard_reviews');
      for(const part of ['ALTER TABLE flashcards','UPDATE _schema_version']) {
        db.fail=sql=>sql.startsWith(part); await assert.rejects(()=>migrate(db),/injected/);
        assert.equal(db.getFirstSync('SELECT version FROM _schema_version').version,8);
        assert.deepEqual(db.getFirstSync('SELECT * FROM flashcards'),before);
      }
      db.fail=()=>false; await migrate(db); await migrate(db);
      assert.equal(db.getFirstSync('SELECT version FROM _schema_version').version,9);
      assert.deepEqual({...db.getFirstSync('SELECT * FROM flashcards')},{...before,schedule_state:'unscheduled'});
      assert.deepEqual(db.getAllSync('SELECT * FROM flashcard_reviews'),reviews);
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
    db.runSync("INSERT INTO flashcard_reviews VALUES ('legacy-review','legacy','good',1)");
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
  await check('UI mode/retry/again keep due routing and preserve all/recovery; no new linkage/dependencies',()=>{
    const screen=read('app/decks/[id]/review.tsx');
    assert.equal((screen.match(/startReview\(id, reviewLimit, dueMode \? 'due' : 'all'\)/g)||[]).length,3);
    assert.match(screen,/RECOVERY_REVIEW_LIMIT/);assert.match(screen,/t.scheduling.noneDue/);
    assert.match(read('components/memory/MemorySchedulePanel.tsx'),/useFocusEffect/);
    assert.match(read('components/memory/FlashcardListItem.tsx'),/t.scheduling.next/);
    for(const lang of ['en','tr'])assert.ok(load('i18n/'+lang+'.ts').default.scheduling.reviewDue);
    assert.doesNotMatch(read('db/repositories/memoryRepo.ts'),/topicId|topic_id|Gemini|mastery|retention/);
    const pkg=JSON.parse(read('package.json')),lock=JSON.parse(read('package-lock.json')).packages[''];
    assert.deepEqual(pkg.dependencies,lock.dependencies);assert.deepEqual(pkg.devDependencies,lock.devDependencies);
  });
  console.log('\nPhase 5 static/in-memory validation passed: '+passed+' checks.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});

