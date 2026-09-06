// Executable store tests with injected persistence; UI checks are source contracts, not device QA.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
function load(file, mocks = {}) {
  const code = ts.transpileModule(read(file), { fileName: file, compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true,
  } }).outputText;
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
function focus({ fail = false, historyFail = false, onInsert = () => {} } = {}) {
  const writes = [];
  const store = load('store/useFocusStore.ts', {
    zustand,
    '@/db/repositories/committeeRepo': { committeeRepo: {} },
    '@/db/repositories/focusRepo': { focusRepo: {
      insert: session => { if (fail) throw Error('write failed'); onInsert(session); writes.push(session); },
      getRecent: () => { if (historyFail) throw Error('read failed'); return writes; },
    } },
    '@/store/useAppStore': { useAppStore: { getState: () => ({ defaultFocusSec: 1500 }) } },
    '@/utils/preferences': load('utils/preferences.ts'),
    '@/utils/studySupportRules': {},
  }).useFocusStore;
  store.setState({ timerStatus: 'paused', accumulatedSec: 120, startedAt: Date.now() - 120000, pausedAt: Date.now() });
  return { store, writes };
}
function memory({ fail = false, empty = false, onInsert = () => {} } = {}) {
  const writes = [], card = { id: 'c', deckId: 'd', front: 'Ön', back: 'Arka' };
  const store = load('store/useMemoryStore.ts', { zustand, '@/db/repositories/memoryRepo': { memoryRepo: {
    getDeckById: () => ({ id: 'd' }), getReviewQueue: () => empty ? [] : [card],
    getCardById: () => card, getRecentReviews: () => writes,
    insertReview: review => { if (fail) throw Error('write failed'); onInsert(review); writes.push(review); },
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
  // Dashboard memory_review QuickStart navigates to relevant deck review route with mode=due explicitly included
  const dashboard = read('app/(tabs)/index.tsx');
  assert.match(
    dashboard,
    /recommendation\.kind\s*===\s*'memory_review'[\s\S]*?router\.push\(`\/decks\/\$\{recommendation\.deckId\}\/review\?mode=due`/
  );
  // Phase 6.5 visual changes are checked separately against unchanged state/callbacks.
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
    'store/useAppStore.ts', 'app/study-support/recovery.tsx', 'app/(tabs)/focus.tsx',
    'db/migrations.ts', 'package.json', 'package-lock.json']) {
    assert.equal(read(file).replace(/\r\n/g, '\n'), baseline(file), file);
  }
  const dashboardRepo = read('db/repositories/dashboardRepo.ts');
  const focusSummaryBlock = dashboardRepo.slice(
    dashboardRepo.indexOf('getFocusSummary('),
    dashboardRepo.indexOf('getMemorySummary(')
  );
  assert.match(focusSummaryBlock, /completed\s*=\s*1\s+AND\s+cancelled\s*=\s*0/);
  assert.match(focusSummaryBlock, /ended_at\s*>=\s*started_at/);
  assert.match(focusSummaryBlock, /ended_at\s*>=\s*\?\s+AND\s+ended_at\s*<\s*\?/);
  assert.match(focusSummaryBlock, /typeof\(actual_duration_sec\)\s*=\s*'integer'\s+AND\s+actual_duration_sec\s*>\s*0/);
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
check('Integration: actual completion stores feed Momentum SQL only after durable actions', () => momentumFixture(({ db, repo }) => {
  const dates = load('utils/calendarDate.ts');
  const { startMs, endMs } = dates.getLocalDayRange(dates.todayLocalDateKey());
  const get = () => repo.getMomentum(startMs, endMs);
  const onInsert = s => db.prepare('INSERT INTO focus_sessions VALUES (?,?,?,?,?,?)')
    .run(Number(s.completed), Number(s.cancelled), s.actualSec, s.startedAt, s.endedAt, s.topicId);
  const entry = focus({ onInsert }); entry.store.setState({ sessionMode: 'entry', plannedSec: 120 });
  assert.deepEqual(get(), { focus: false, memory: false, topicFocus: false });
  entry.store.getState().cancelSession(); assert.equal(get().focus, false);
  const completed = focus({ onInsert }); completed.store.setState({ sessionMode: 'entry', plannedSec: 120 });
  assert.ok(eligible(completed.store.getState().finishSession()));
  assert.deepEqual(get(), { focus: true, memory: false, topicFocus: false });
  db.exec("INSERT INTO topics VALUES ('linked')");
  const linked = focus({ onInsert }); linked.store.setState({ selectedTopicId: 'linked' });
  linked.store.getState().finishSession(); assert.equal(get().topicFocus, true);
  const review = memory({ onInsert: r => db.prepare('INSERT INTO flashcard_reviews VALUES (?)').run(r.reviewedAt) });
  assert.equal(get().memory, false); review.store.getState().revealAnswer();
  assert.equal(get().memory, false); review.store.getState().rateCurrentCard('good');
  assert.deepEqual(get(), { focus: true, memory: true, topicFocus: true });
  const again = get(); assert.deepEqual(get(), again);
}));
check('Integration: Memory reward is event-gated and cleared on blur/new review, not replayed by derived state', () => {
  const r = read('app/decks/[id]/review.tsx');
  assert.ok(r.includes('const saved = rateCurrentCard(rating)'));
  assert.ok(r.includes("if (saved && current.reviewStatus === 'complete' && current.reviewSummary.reviewed > 0)"));
  assert.equal((r.match(/setShowReviewVictory\(true\)/g) || []).length, 1);
  assert.ok(r.includes('useFocusEffect(useCallback(() => () => setShowReviewVictory(false), []))'));
  assert.ok(r.includes("if (reviewStatus !== 'complete') setShowReviewVictory(false)"));
  assert.ok(r.includes('{showReviewVictory && <MiniVictory'));
  assert.doesNotMatch(r, /AppState|AsyncStorage|rewardHistory/);
  assert.ok(read('app/(tabs)/focus.tsx').includes('useFocusEffect(useCallback(() => () => setShowVictory(false), []))'));
});
check('Integration: Dashboard refresh executes on focus/foreground and removes its listener on blur', () => {
  let effect, listener, removed = false, refreshes = 0;
  const hook = load('hooks/useDashboardRefresh.ts', {
    react: { useCallback: callback => callback },
    'expo-router': { useFocusEffect: callback => { effect = callback; } },
    'react-native': { AppState: { addEventListener: (event, callback) => {
      listener = callback; return { remove: () => { removed = true; listener = null; } };
    } } },
  });
  hook.useDashboardRefresh(true, () => refreshes++);
  const cleanup = effect();
  try {
    assert.equal(refreshes, 1); listener('background'); assert.equal(refreshes, 1);
    listener('active'); assert.equal(refreshes, 2);
  } finally { cleanup(); }
  assert.ok(removed); assert.equal(listener, null);
});
check('Integration: Recovery remains side-effect-free until explicit actions; quiet feedback and matrix unchanged', () => {
  const baseline = file => execFileSync('git', ['show', '45a130b:' + file], { cwd: root, encoding: 'utf8' }).replace(/\r\n/g, '\n');
  for (const file of ['app/study-support/recovery.tsx', 'app/study-support/check-in.tsx', 'utils/recoveryRules.ts',
    'utils/studySupportRules.ts', 'hooks/useDashboardRefresh.ts']) {
    assert.equal(read(file).replace(/\r\n/g, '\n'), baseline(file));
  }
  const recovery = read('app/study-support/recovery.tsx');
  assert.ok(recovery.includes('startEntrySession({ committeeId: verifiedCommitteeId })'));
  assert.ok(recovery.includes("params: { id: deck.id, mode: 'recovery' }"));
  assert.doesNotMatch(recovery, /MiniVictory|getMomentum|finishSession\(|insertReview\(/);
});
// Presentation changes may alter geometry/typography, never state, routes, copy or callbacks.
function assertPresentationOnly(file) {
  const before = execFileSync('git', ['show', '037072f:' + file], { cwd: root, encoding: 'utf8' }).replace(/\r\n/g, '\n');
  const after = read(file).replace(/\r\n/g, '\n');
  assert.equal(after.slice(0, after.indexOf('  return (')), before.slice(0, before.indexOf('  return (')));
  function callbacks(source) {
    const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const result = [];
    function visit(node) {
      if (ts.isJsxAttribute(node) && /^on[A-Z]/.test(node.name.getText(tree))) result.push(node.getText(tree));
      ts.forEachChild(node, visit);
    }
    visit(tree); return result;
  }
  assert.deepEqual(callbacks(after), callbacks(before));
  const copy = source => [...new Set(source.match(/\bt(?:\.[A-Za-z_]\w*)+/g))].sort();
  assert.deepEqual(copy(after), copy(before));
  assert.doesNotMatch(after, /numberOfLines|accessibilityLiveRegion|announceForAccessibility|\bopacity:/);
}
check('Polish: MiniVictory preserves content, dismissal and runtime state with bounded wrapping layout', () => {
  assertPresentationOnly('components/ui/MiniVictory.tsx');
  const source = read('components/ui/MiniVictory.tsx');
  assert.ok(source.includes('maxWidth: 620')); assert.ok(source.includes('flexShrink: 1'));
  assert.ok(source.includes('minHeight: 44')); assert.ok(source.includes('accessibilityLabel={t.reward.dismiss}'));
});
check('Polish: Momentum preserves targets/routes/refresh and groups factual state separately from buttons', () => {
  assertPresentationOnly('components/dashboard/MomentumCard.tsx');
  const source = read('components/dashboard/MomentumCard.tsx');
  assert.ok(source.includes('maxWidth: 620')); assert.ok(source.includes('accessibilityRole="text"'));
  assert.ok(source.includes('accessibilityLabel={`${row.label}. ${evidence[row.key] ? t.momentum.recorded : t.momentum.pending}`}'));
  assert.ok(source.includes('</View>\n              <Button'));
  assert.doesNotMatch(source, /progressbar|checkbox|switch/);
});
check('Polish: adaptive card retains all choices/actions with smaller tablet heading and wrapped labels', () => {
  assertPresentationOnly('components/study-support/AdaptiveRecommendationCard.tsx');
  const source = read('components/study-support/AdaptiveRecommendationCard.tsx');
  assert.ok(source.includes('maxWidth: 620')); assert.ok(source.includes('minWidth: 0'));
  assert.ok(source.includes('flexWrap: \'wrap\'')); assert.ok(source.includes('minHeight: 68'));
  assert.ok(source.includes('variant="h2"')); assert.ok(source.includes('textStyle={{ flexShrink: 1'));
});
check('Polish: trigger routes, all persisted rules and shared primitives remain unchanged', () => {
  for (const file of ['app/(tabs)/focus.tsx', 'app/decks/[id]/review.tsx', 'components/ui/Button.tsx',
    'components/ui/Card.tsx', 'components/ui/Typography.tsx', 'components/layout/ScreenWrapper.tsx',
    'theme/colors.ts', 'i18n/en.ts', 'i18n/tr.ts']) {
    assert.equal(read(file).replace(/\r\n/g, '\n'), execFileSync('git', ['show', '037072f:' + file],
      { cwd: root, encoding: 'utf8' }).replace(/\r\n/g, '\n'));
  }
});
// JS element-tree contracts only: no native rendering, screen automation or physical QA.
function motivationTree(file, name, locale, props, quiet, evidence = null) {
  const react = {
    createElement: (type, attrs, ...children) => ({ type, props: { ...attrs, children } }),
    Fragment: 'Fragment', useCallback: f => f,
    useState: initial => [initial === null ? evidence : initial, () => {}],
  };
  const ui = { Card: 'Card', AppText: 'AppText', Button: 'Button', Badge: 'Badge' };
  const dates = load('utils/calendarDate.ts');
  const mocks = {
    react, 'react-native': { View: 'View', TouchableOpacity: 'TouchableOpacity', StyleSheet: { create: s => s } },
    '@expo/vector-icons': { Feather: 'Feather' },
    '@/hooks/useTheme': { useTheme: () => ({ colors: {}, spacing: {}, radius: {} }) },
    '@/hooks/useResponsive': { useResponsive: () => ({ isTablet: true }) },
    '@/hooks/useDashboardRefresh': { useDashboardRefresh: () => {} },
    '@/store/useAppStore': { useAppStore: selector => selector({ lowStimulationMode: quiet, isDBReady: true }) },
    '@/db/repositories/dashboardRepo': { dashboardRepo: {} },
    '@/utils/calendarDate': dates,
    '@/utils/studySupportRules': load('utils/studySupportRules.ts', { './calendarDate': dates }),
    '@/i18n': { useTranslation: () => locale, ...load('i18n/studySupport.ts') },
    'expo-router': { router: { push: () => { throw Error('Render must not navigate'); } } },
  };
  for (const [key, value] of Object.entries(ui)) {
    const filename = key === 'AppText' ? 'Typography' : key;
    mocks['./' + filename] = { [key]: value };
    mocks['@/components/ui/' + filename] = { [key]: value };
  }
  const tree = load(file, mocks)[name]({ ...props, lowStimulation: quiet });
  function semantics(node) {
    if (Array.isArray(node)) return node.map(semantics);
    if (!node || typeof node !== 'object') return node;
    return { type: node.type, props: Object.fromEntries(Object.entries(node.props)
      .filter(([key]) => !['style', 'textStyle', 'color', 'variant', 'elevated', 'size'].includes(key))
      .map(([key, value]) => [key, typeof value === 'function' ? value.toString() : key === 'children' ? semantics(value) : value])) };
  }
  return semantics(tree);
}
check('Closure: MiniVictory and Momentum EN/TR content/actions match in quiet and regular presentation', () => {
  for (const locale of [load('i18n/en.ts').default, load('i18n/tr.ts').default]) {
    for (const kind of ['focus', 'review']) assert.deepEqual(
      motivationTree('components/ui/MiniVictory.tsx', 'MiniVictory', locale, { kind }, false),
      motivationTree('components/ui/MiniVictory.tsx', 'MiniVictory', locale, { kind }, true));
    for (const evidence of [null, { focus: false, memory: false, topicFocus: false },
      { focus: true, memory: false, topicFocus: false }, { focus: true, memory: true, topicFocus: false },
      { focus: true, memory: true, topicFocus: true }]) assert.deepEqual(
      motivationTree('components/dashboard/MomentumCard.tsx', 'MomentumCard', locale, {}, false, evidence),
      motivationTree('components/dashboard/MomentumCard.tsx', 'MomentumCard', locale, {}, true, evidence));
  }
});
check('Closure: all nine bilingual recommendations and every override retain quiet-mode action parity', () => {
  const rules = load('utils/studySupportRules.ts', { './calendarDate': load('utils/calendarDate.ts') });
  const action = () => { throw Error('Recommendation rendering must not execute actions'); };
  for (const locale of [load('i18n/en.ts').default, load('i18n/tr.ts').default]) {
    for (const energy of ['low', 'steady', 'good']) for (const attention of ['scattered', 'okay', 'focused']) {
      for (const selectedDurationSec of rules.ADAPTIVE_DURATION_OPTIONS) {
        const props = { energy, attention, selectedDurationSec, recommendation: rules.getAdaptiveRecommendation(energy, attention),
          committeeName: 'User: Kalp / Heart', contextError: null,
          onSelectDuration: action, onStart: action, onChangeAnswers: action, onRemoveCommittee: action,
          onRetryContext: action, onContinueWithoutCommittee: action, onOpenFocusSetup: action, onOpenRecovery: action };
        assert.deepEqual(motivationTree('components/study-support/AdaptiveRecommendationCard.tsx', 'AdaptiveRecommendationCard', locale, props, false),
          motivationTree('components/study-support/AdaptiveRecommendationCard.tsx', 'AdaptiveRecommendationCard', locale, props, true));
      }
    }
  }
});
check('Closure: entry milestone and Keep Going create no persistence; final completion still records once', () => {
  const { store, writes } = focus();
  store.setState({ sessionMode: 'entry', plannedSec: 120 });
  store.getState().markEntryMilestoneAnnounced(); assert.equal(writes.length, 0);
  assert.equal(store.getState().keepGoingFromEntry(), true); assert.equal(writes.length, 0);
  assert.ok(eligible(store.getState().finishSession())); assert.equal(writes.length, 1);
  assert.equal(store.getState().finishSession(), null); assert.equal(writes.length, 1);
});
console.log(`Phase 6 validation: ${passed} PASS`);
