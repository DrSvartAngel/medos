// Executable store tests with injected persistence; UI checks are source contracts, not device QA.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
function load(file, mocks = {}) {
  const code = ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const module = { exports: {} };
  vm.runInThisContext('(function(require,module,exports){' + code + '\n})')(
    key => Object.hasOwn(mocks, key) ? mocks[key] : require(key), module, module.exports);
  return module.exports;
}
const zustand = { create: () => init => {
  let state;
  const get = () => state, set = patch => { state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) }; };
  state = init(set, get); return { getState: get, setState: set };
} };
function focus({ fail = false, historyFail = false } = {}) {
  const writes = [];
  const store = load('store/useFocusStore.ts', {
    zustand,
    '@/db/repositories/committeeRepo': { committeeRepo: {} },
    '@/db/repositories/focusRepo': { focusRepo: {
      insert: session => { if (fail) throw Error('write failed'); writes.push(session); },
      getRecent: () => { if (historyFail) throw Error('read failed'); return writes; },
    } },
    '@/store/useAppStore': { useAppStore: { getState: () => ({ defaultFocusSec: 1500 }) } },
    '@/utils/preferences': load('utils/preferences.ts'),
    '@/utils/studySupportRules': {},
  }).useFocusStore;
  store.setState({ timerStatus: 'paused', accumulatedSec: 120, startedAt: Date.now() - 120000, pausedAt: Date.now() });
  return { store, writes };
}
function memory({ fail = false, empty = false } = {}) {
  const writes = [], card = { id: 'c', deckId: 'd', front: 'Ön', back: 'Arka' };
  const store = load('store/useMemoryStore.ts', { zustand, '@/db/repositories/memoryRepo': { memoryRepo: {
    getDeckById: () => ({ id: 'd' }), getReviewQueue: () => empty ? [] : [card],
    getCardById: () => card, getRecentReviews: () => writes,
    insertReview: review => { if (fail) throw Error('write failed'); writes.push(review); },
  } } }).useMemoryStore;
  store.getState().startReview('d'); return { store, writes };
}
let passed = 0;
function check(name, run) { run(); console.log('PASS ' + name); passed++; }
const eligible = receipt => receipt !== null && receipt.completed && !receipt.cancelled && receipt.actualSec > 0;
check('Focus durable positive completion receipt and duplicate guard', () => {
  const { store, writes } = focus(); const receipt = store.getState().finishSession();
  assert.ok(eligible(receipt)); assert.equal(writes.length, 1); assert.equal(store.getState().finishSession(), null);
});
check('Failed Focus write keeps session active and returns no receipt', () => {
  const { store, writes } = focus({ fail: true }); assert.equal(store.getState().finishSession(), null);
  assert.equal(store.getState().timerStatus, 'paused'); assert.equal(writes.length, 0);
});
check('History read failure cannot erase durable completion receipt', () => {
  assert.ok(eligible(focus({ historyFail: true }).store.getState().finishSession()));
});
check('Cancel and zero-duration completion do not qualify', () => {
  const { store, writes } = focus(); store.getState().cancelSession();
  assert.equal(eligible(writes[0]), false);
  const zero = focus(); zero.store.setState({ accumulatedSec: 0 });
  assert.equal(eligible(zero.store.getState().finishSession()), false);
});
check('Entry Finish here uses the same durable completion', () => {
  const { store } = focus(); store.setState({ sessionMode: 'entry', plannedSec: 120 });
  assert.ok(eligible(store.getState().finishSession()));
});
check('Memory completion requires persisted rating and advances once', () => {
  const { store, writes } = memory(); store.getState().revealAnswer();
  assert.equal(store.getState().rateCurrentCard('good'), true);
  assert.equal(store.getState().reviewStatus, 'complete'); assert.equal(store.getState().reviewSummary.reviewed, 1);
  assert.equal(store.getState().rateCurrentCard('good'), false); assert.equal(writes.length, 1);
});
check('Empty and failed Memory flow produce no positive completion', () => {
  assert.equal(memory({ empty: true }).store.getState().reviewSummary.reviewed, 0);
  const { store, writes } = memory({ fail: true }); store.getState().revealAnswer();
  assert.equal(store.getState().rateCurrentCard('good'), false);
  assert.equal(store.getState().reviewStatus, 'answer'); assert.equal(store.getState().reviewSummary.reviewed, 0);
  assert.equal(writes.length, 0);
});
check('UI source wires receipt gate, entry finish, blur cleanup and nonempty review branch', () => {
  const f = read('app/(tabs)/focus.tsx'), r = read('app/decks/[id]/review.tsx');
  assert.ok(f.includes('receipt.completed && !receipt.cancelled && receipt.actualSec > 0'));
  assert.equal((f.match(/onFinish=\{handleFinish\}/g) || []).length, 2);
  assert.ok(f.includes('useFocusEffect(useCallback(() => () => setShowVictory(false), []))'));
  assert.ok(r.indexOf('kind="review"') > r.indexOf("if (reviewStatus === 'complete')"));
  assert.ok(r.includes('reviewSummary.reviewed === 0 ?'));
  assert.ok(f.includes('onCancel={cancelSession}'));
});
check('Shared banner is local/dismissible/accessibly labelled and low stimulation only changes color', () => {
  const source = read('components/ui/MiniVictory.tsx');
  assert.ok(source.includes('useState(false)')); assert.ok(source.includes('setDismissed(true)'));
  assert.ok(source.includes('minHeight: 44')); assert.ok(source.includes('accessibilityLabel'));
  assert.ok(source.includes('lowStimulation ? colors.textPrimary : colors.success'));
  assert.doesNotMatch(source, /AsyncStorage|sqlite|Notification|Vibration|Audio|Animated|setTimeout/);
});
check('EN/TR contain the same small factual copy set', () => {
  const en = load('i18n/en.ts').default.reward, tr = load('i18n/tr.ts').default.reward;
  assert.deepEqual(Object.keys(en), Object.keys(tr));
  for (const copy of [...Object.values(en), ...Object.values(tr)]) assert.ok(copy.length > 0);
});
check('Phase 5 scheduling, Memory store/repository, schema, preferences, Dashboard and dependency versions unchanged', () => {
  const baseline = file => execFileSync('git', ['show', '99fa648:' + file], { cwd: root, encoding: 'utf8' }).replace(/\r\n/g, '\n');
  for (const file of ['utils/memoryScheduling.ts', 'store/useMemoryStore.ts', 'db/repositories/memoryRepo.ts',
    'db/migrations.ts', 'store/useAppStore.ts', 'app/(tabs)/index.tsx', 'package-lock.json']) {
    assert.equal(read(file).replace(/\r\n/g, '\n'), baseline(file), file);
  }
  const before = JSON.parse(baseline('package.json')), after = JSON.parse(read('package.json'));
  assert.deepEqual(after.dependencies, before.dependencies); assert.deepEqual(after.devDependencies, before.devDependencies);
});
console.log(`Phase 6 validation: ${passed} PASS`);
