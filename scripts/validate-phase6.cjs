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
    'db/migrations.ts', 'store/useAppStore.ts', 'package-lock.json']) {
    assert.equal(read(file).replace(/\r\n/g, '\n'), baseline(file), file);
  }
  const before = JSON.parse(baseline('package.json')), after = JSON.parse(read('package.json'));
  assert.deepEqual(after.dependencies, before.dependencies); assert.deepEqual(after.devDependencies, before.devDependencies);
  // Phase 6.2 may insert only the Momentum card into the existing responsive branches.
  const dashboard = read('app/(tabs)/index.tsx').replace(/\r\n/g, '\n')
    .replace("import { MomentumCard } from '@/components/dashboard/MomentumCard';\n", '')
    .replace(/^\s*<MomentumCard \/>\n/gm, '');
  assert.equal(dashboard, baseline('app/(tabs)/index.tsx'));
  assert.equal(read('components/ui/MiniVictory.tsx').replace(/\r\n/g, '\n'),
    execFileSync('git', ['show', 'c13c31e:components/ui/MiniVictory.tsx'], { cwd: root, encoding: 'utf8' }).replace(/\r\n/g, '\n'));
});

// Actual derived SQL on an in-memory evidence fixture. Full schema regressions run in Phases 2–5.
function momentumFixture(run) {
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync(':memory:');
  try {
    db.exec(`CREATE TABLE focus_sessions (completed INTEGER, cancelled INTEGER, actual_duration_sec INTEGER,
      started_at INTEGER, ended_at INTEGER, topic_id TEXT);
      CREATE TABLE topics (id TEXT PRIMARY KEY);
      CREATE TABLE flashcard_reviews (reviewed_at INTEGER);`);
    const repo = load('db/repositories/dashboardRepo.ts', { '../client': { getDB: () => ({
      getFirstSync: (sql, args) => db.prepare(sql).get(...args),
    }) } }).dashboardRepo;
    const dates = load('utils/calendarDate.ts');
    const { startMs: start, endMs: end } = dates.getLocalDayRange('2026-09-06');
    const addFocus = (completed, cancelled, duration, endedAt = start + 1000, topic = null, startedAt = start) =>
      db.prepare('INSERT INTO focus_sessions VALUES (?,?,?,?,?,?)').run(completed, cancelled, duration, startedAt, endedAt, topic);
    run({ db, repo, start, end, addFocus, get: () => repo.getMomentum(start, end) });
  } finally { db.close(); }
}
check('Momentum: empty/cancelled/zero/invalid duration records do not meet Focus targets', () => momentumFixture(({ addFocus, get }) => {
  assert.deepEqual(get(), { focus: false, memory: false, topicFocus: false });
  addFocus(0, 1, 120); addFocus(1, 1, 120); addFocus(1, 0, 0); addFocus(1, 0, -1); addFocus(1, 0, 1.5);
  assert.equal(get().focus, false);
}));
check('Momentum: positive completed Focus uses local finish-day and exclusive midnight boundary', () => momentumFixture(({ addFocus, get, repo, start, end }) => {
  addFocus(1, 0, 60, start - 1, null, start - 100000);
  addFocus(1, 0, 60, end);
  assert.equal(get().focus, false);
  addFocus(1, 0, 120, start, null, start - 120000);
  assert.equal(get().focus, true);
  assert.equal(repo.getMomentum(end + (end - start), end + 2 * (end - start)).focus, false);
}));
check('Momentum: persisted rating today, not yesterday/tomorrow, meets Memory target', () => momentumFixture(({ db, start, end, get }) => {
  const add = at => db.prepare('INSERT INTO flashcard_reviews VALUES (?)').run(at);
  add(start - 1); add(end); assert.equal(get().memory, false);
  add(start); assert.equal(get().memory, true); assert.equal(get().focus, false);
}));
check('Momentum: linked positive completion meets both Focus targets; mere Topic existence does not', () => momentumFixture(({ db, addFocus, get, start }) => {
  db.exec("INSERT INTO topics VALUES ('t')"); assert.equal(get().topicFocus, false);
  addFocus(0, 1, 120, start + 1000, 't'); assert.equal(get().topicFocus, false);
  addFocus(1, 0, 120, start + 1000, 't');
  assert.deepEqual(get(), { focus: true, memory: false, topicFocus: true });
  db.prepare('INSERT INTO flashcard_reviews VALUES (?)').run(start + 1000);
  assert.equal(Object.values(get()).filter(Boolean).length, 3);
  db.exec("UPDATE focus_sessions SET topic_id=NULL; DELETE FROM topics");
  assert.deepEqual(get(), { focus: true, memory: true, topicFocus: false });
}));
check('Momentum: errors propagate instead of fabricated empty/complete state', () => {
  for (const getFirstSync of [() => { throw Error('DB unavailable'); }, () => null]) {
    const repo = load('db/repositories/dashboardRepo.ts', { '../client': { getDB: () => ({ getFirstSync }) } }).dashboardRepo;
    assert.throws(() => repo.getMomentum(0, 100));
  }
});
check('Momentum: focused local-midnight/foreground refresh and truthful error source contracts', () => {
  const card = read('components/dashboard/MomentumCard.tsx'), hook = read('hooks/useDashboardRefresh.ts');
  assert.ok(card.includes('getLocalDayRange(todayLocalDateKey())'));
  assert.ok(card.includes('useDashboardRefresh(isDBReady, refresh)'));
  assert.ok(card.includes('setEvidence(null)')); assert.ok(card.includes('t.momentum.unavailable'));
  for (const text of ['useFocusEffect', "nextState === 'active'", 'millisecondsUntilNextLocalMidnight', 'subscription.remove()', 'clearTimeout']) assert.ok(hook.includes(text));
  assert.doesNotMatch(hook, /setInterval/);
});
check('Momentum: quiet variant preserves bilingual targets, accessible actions and no reward trigger', () => {
  const card = read('components/dashboard/MomentumCard.tsx');
  assert.ok(card.includes('!lowStimulation ? colors.success : colors.textSecondary'));
  assert.ok(card.includes('accessibilityLabel={row.action}')); assert.ok(card.includes('minHeight: 44'));
  assert.doesNotMatch(card, /MiniVictory|AsyncStorage|persist\(|Notification|Vibration|Audio|Animated|dailyFocusGoalMin/);
  const en = load('i18n/en.ts').default.momentum, tr = load('i18n/tr.ts').default.momentum;
  assert.deepEqual(Object.keys(en), Object.keys(tr));
  assert.ok(en.help.includes('both Focus targets')); assert.ok(tr.help.includes('iki Odaklanma hedefini'));
  assert.equal(en.completed(3), "Today's study-action targets met: 3/3");
  assert.doesNotMatch(Object.values(en).join(' '), /streak|XP|coins|levels|failed yesterday|\d%/);
});
check('Adaptive Motivation reuses all nine Phase 3 outcomes, including four 15-minute outcomes', () => {
  const rules = load('utils/studySupportRules.ts', { './calendarDate': load('utils/calendarDate.ts') });
  const energies = ['low', 'steady', 'good'], attention = ['scattered', 'okay', 'focused'];
  const expected = [[120, 900, 900], [900, 1500, 1500], [900, 1500, 2700]];
  for (let e = 0; e < 3; e++) for (let a = 0; a < 3; a++) {
    assert.equal(rules.getAdaptiveRecommendation(energies[e], attention[a]).durationSec, expected[e][a]);
    assert.deepEqual(rules.getAdaptiveRecommendation(energies[e], attention[a]), rules.getAdaptiveRecommendation(energies[e], attention[a]));
  }
  assert.deepEqual(rules.ADAPTIVE_DURATION_OPTIONS, [120, 900, 1500, 2700]);
  for (const invalid of [null, undefined, 'medium', [], 0]) {
    assert.equal(rules.getAdaptiveRecommendation(invalid, 'okay'), null);
    assert.equal(rules.getAdaptiveRecommendation('steady', invalid), null);
  }
});
check('Adaptive Motivation changes no matrix, state, timer, Recovery, Momentum, reward or persistence behavior', () => {
  const baseline = file => execFileSync('git', ['show', '10a9291:' + file], { cwd: root, encoding: 'utf8' }).replace(/\r\n/g, '\n');
  for (const file of ['utils/studySupportRules.ts', 'store/useStudySupportStore.ts', 'store/useFocusStore.ts',
    'store/useAppStore.ts', 'app/study-support/recovery.tsx', 'components/dashboard/MomentumCard.tsx',
    'db/repositories/dashboardRepo.ts', 'components/ui/MiniVictory.tsx', 'app/(tabs)/focus.tsx',
    'app/decks/[id]/review.tsx', 'db/migrations.ts', 'package.json', 'package-lock.json']) {
    assert.equal(read(file).replace(/\r\n/g, '\n'), baseline(file), file);
  }
  const route = read('app/study-support/check-in.tsx').replace(/\r\n/g, '\n')
    .replace("import { useAppStore } from '@/store/useAppStore';\n", '')
    .replace('  const lowStimulationMode = useAppStore((state) => state.lowStimulationMode);\n', '')
    .replace('              lowStimulation={lowStimulationMode}\n', '');
  assert.equal(route, baseline('app/study-support/check-in.tsx'));
});
check('Adaptive Motivation quiet variant retains explicit start, all choices and Lighter Plan source contracts', () => {
  const card = read('components/study-support/AdaptiveRecommendationCard.tsx');
  for (const fragment of ['lowStimulation = false', 'elevated={!lowStimulation}',
    "variant={lowStimulation ? 'default' : 'primary'}", 'ADAPTIVE_DURATION_OPTIONS.map',
    'onPress={() => onSelectDuration(durationSec)}', 'onPress={onStart}', 'onPress={onOpenRecovery}',
    'onPress={onChangeAnswers}', 'accessibilityRole="radio"', 'accessibilityState={{ checked: isSelected }}']) {
    assert.ok(card.includes(fragment), fragment);
  }
  assert.doesNotMatch(card, /useEffect|startTimer\(|startEntrySession\(|startAdaptiveSession\(|AsyncStorage|persist\(|Notification|analytics/i);
});
check('Adaptive Motivation explains explicit input and optional alternatives in EN/TR without changing reasons', () => {
  const en = load('i18n/en.ts').default, tr = load('i18n/tr.ts').default;
  assert.ok(en.adaptiveRec.optionalExplanation.includes('only the energy and attention you selected'));
  assert.ok(tr.adaptiveRec.optionalExplanation.includes('yalnızca seçtiğin enerji ve dikkat'));
  assert.ok(read('components/study-support/AdaptiveRecommendationCard.tsx').includes('t.adaptiveRec.optionalExplanation'));
  assert.ok(read('components/study-support/AdaptiveRecommendationCard.tsx').includes('translateStudySupportMessage(recommendation.reason, t)'));
});
console.log(`Phase 6 validation: ${passed} PASS`);
