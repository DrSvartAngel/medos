const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
let passed = 0;

function check(name, run) {
  run();
  passed += 1;
  process.stdout.write(`PASS ${name}\n`);
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function loadTypeScript(relativePath, mocks = {}) {
  const filename = path.join(root, relativePath);
  const source = fs.readFileSync(filename, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
      jsx: ts.JsxEmit.React,
    },
    fileName: filename,
  }).outputText;
  const moduleValue = { exports: {} };
  const localRequire = (specifier) => {
    if (Object.prototype.hasOwnProperty.call(mocks, specifier)) return mocks[specifier];
    return require(specifier);
  };
  const wrapped = vm.runInThisContext(
    `(function(require, module, exports, __filename, __dirname) {${output}\n})`,
    { filename }
  );
  wrapped(localRequire, moduleValue, moduleValue.exports, filename, path.dirname(filename));
  return moduleValue.exports;
}

function createZustandMock() {
  return {
    create: () => (initializer) => {
      let state;
      const get = () => state;
      const set = (next) => {
        const patch = typeof next === 'function' ? next(state) : next;
        state = { ...state, ...patch };
      };
      state = initializer(set, get);
      const hook = (selector = (value) => value) => selector(state);
      hook.getState = get;
      hook.setState = set;
      return hook;
    },
  };
}

const calendarDate = loadTypeScript('utils/calendarDate.ts');
const recoveryRules = loadTypeScript('utils/recoveryRules.ts', {
  './calendarDate': calendarDate,
});
const dashboardRules = loadTypeScript('utils/dashboardRules.ts', { './calendarDate': calendarDate });
const gentleReturnRules = loadTypeScript('utils/gentleReturnRules.ts');
const studySupportRules = loadTypeScript('utils/studySupportRules.ts', {
  './calendarDate': calendarDate,
});
const preferences = loadTypeScript('utils/preferences.ts');
const en = loadTypeScript('i18n/en.ts').default;
const tr = loadTypeScript('i18n/tr.ts').default;
const supportTranslation = loadTypeScript('i18n/studySupport.ts');
const errorTranslation = loadTypeScript('i18n/errors.ts', { './en': { default: en, __esModule: true }, './tr': { default: tr, __esModule: true } });

// Copy assertions follow actual t.key references, not every string in the catalog.
// This keeps legacy copy guarantees while still catching a miswired button.
function assertCopy(source, expected) {
  const references = source.match(/\bt(?:\.[a-zA-Z_]\w*)+/g) ?? [];
  const referenced = references.map((reference) =>
    reference.split('.').slice(1).reduce((value, key) => value?.[key], en)
  );
  assert.ok(source.includes(expected) || referenced.includes(expected),
    `Missing wired copy: ${expected}`);
}

function loadFocusHarness(options = {}) {
  const inserted = [];
  const appState = { defaultFocusSec: options.defaultFocusSec ?? 1500 };
  const validCommitteeIds = new Set(options.validCommitteeIds ?? ['committee-1']);
  const focusRepo = {
    insert(session) {
      if (options.failInsert) throw new Error('injected insert failure');
      inserted.push({ ...session });
    },
    getRecent(limit) {
      return [...inserted].reverse().slice(0, limit);
    },
  };
  const committeeRepo = {
    getById(id) {
      if (options.failCommitteeLookup) throw new Error('injected committee failure');
      return validCommitteeIds.has(id) ? { id } : null;
    },
  };
  const module = loadTypeScript('store/useFocusStore.ts', {
    zustand: createZustandMock(),
    '@/db/repositories/committeeRepo': { committeeRepo },
    '@/db/repositories/focusRepo': { focusRepo },
    '@/store/useAppStore': { useAppStore: { getState: () => appState } },
    '@/utils/preferences': preferences,
    '@/utils/studySupportRules': studySupportRules,
  });
  return { module, store: module.useFocusStore, inserted, appState };
}

function loadStudySupportHarness() {
  const module = loadTypeScript('store/useStudySupportStore.ts', {
    zustand: createZustandMock(),
    '@/utils/calendarDate': calendarDate,
    '@/utils/studySupportRules': studySupportRules,
  });
  return { module, store: module.useStudySupportStore };
}

function createMemoryRepositoryHarness() {
  const deckRows = [];
  const cardRows = [];
  const database = {
    getAllSync(sql, params = []) {
      if (!sql.includes('FROM flashcards')) return [];
      const deckId = params[0];
      let rows = cardRows
        .filter((row) => row.deck_id === deckId)
        .sort((a, b) => a.created_at - b.created_at || a.id.localeCompare(b.id));
      if (/LIMIT \?/i.test(sql)) rows = rows.slice(0, params[1]);
      return rows.map((row) => ({ ...row }));
    },
    getFirstSync(sql, params = []) {
      if (!sql.includes('FROM decks d')) return null;
      let rows = deckRows.map((row) => ({
        ...row,
        card_count: cardRows.filter((card) => card.deck_id === row.id).length,
      }));
      if (/WHERE d\.id = \?/i.test(sql)) {
        return rows.find((row) => row.id === params[0]) ?? null;
      }
      if (/WHERE EXISTS/i.test(sql)) {
        rows = rows
          .filter((row) => row.card_count > 0)
          .sort((a, b) => b.updated_at - a.updated_at || a.id.localeCompare(b.id));
        return rows[0] ?? null;
      }
      return null;
    },
  };
  const module = loadTypeScript('db/repositories/memoryRepo.ts', {
    '@/utils/memoryScheduling': loadTypeScript('utils/memoryScheduling.ts'),
    '../client': { getDB: () => database },
  });
  return { memoryRepo: module.memoryRepo, deckRows, cardRows };
}

function createMemoryStoreHarness(options = {}) {
  const calls = [];
  const reviews = [];
  let failReviewInsert = options.failReviewInsert ?? false;
  const deck = options.deletedDeck
    ? null
    : {
        id: 'deck-1',
        name: 'Anatomy',
        description: '',
        committeeId: null,
        cardCount: 6,
        createdAt: 1,
        updatedAt: 2,
      };
  const cards = Array.from({ length: 6 }, (_, index) => ({
    id: `card-${index + 1}`,
    deckId: 'deck-1',
    front: `Front ${index + 1}`,
    back: `Back ${index + 1}`,
    createdAt: index + 1,
    updatedAt: index + 1,
  }));
  const memoryRepo = {
    getDeckById: () => deck,
    getReviewQueue: (_deckId, limit) => {
      calls.push(limit);
      return limit === undefined ? [...cards] : cards.slice(0, limit);
    },
    getCardById: (id) => cards.find((card) => card.id === id) ?? null,
    insertReview: (review) => {
      if (failReviewInsert) throw new Error('injected review write error');
      reviews.push({ ...review });
    },
    getRecentReviews: () => [],
  };
  const module = loadTypeScript('store/useMemoryStore.ts', {
    zustand: createZustandMock(),
    '@/db/repositories/memoryRepo': { memoryRepo },
  });
  return {
    store: module.useMemoryStore,
    calls,
    reviews,
    setFailReviewInsert: (value) => { failReviewInsert = value; },
  };
}

function withMockedNow(initialNow, run) {
  const originalNow = Date.now;
  let now = initialNow;
  Date.now = () => now;
  try {
    run({ setNow: (value) => { now = value; }, getNow: () => now });
  } finally {
    Date.now = originalNow;
  }
}

check('Atomic entry start uses 120 seconds and cannot replace or duplicate a session', () => {
  withMockedNow(1_000_000, () => {
    const { module, store } = loadFocusHarness({ defaultFocusSec: 2700 });
    assert.equal(module.ENTRY_FOCUS_SEC, 120);
    assert.equal(store.getState().startEntrySession({ committeeId: 'committee-1' }), true);
    const started = store.getState();
    assert.equal(started.timerStatus, 'running');
    assert.equal(started.plannedSec, 120);
    assert.equal(started.sessionMode, 'entry');
    assert.equal(started.startedAt, 1_000_000);
    assert.equal(started.runningSince, 1_000_000);
    assert.equal(started.selectedCommitteeId, 'committee-1');
    assert.equal(store.getState().startEntrySession(), false);
    assert.equal(store.getState().startedAt, 1_000_000);
    assert.equal(store.getState().plannedSec, 120);
  });
});

check('Entry Committee context is inherited only when it still exists', () => {
  const valid = loadFocusHarness({ validCommitteeIds: ['committee-1'] });
  assert.equal(valid.store.getState().startEntrySession({ committeeId: 'committee-1' }), true);
  assert.equal(valid.store.getState().selectedCommitteeId, 'committee-1');

  const stale = loadFocusHarness({ validCommitteeIds: [] });
  assert.equal(stale.store.getState().startEntrySession({ committeeId: 'deleted' }), true);
  assert.equal(stale.store.getState().selectedCommitteeId, null);

  const unavailable = loadFocusHarness({ failCommitteeLookup: true });
  assert.equal(unavailable.store.getState().startEntrySession({ committeeId: 'committee-1' }), true);
  assert.equal(unavailable.store.getState().selectedCommitteeId, null);
});

check('Pause and resume preserve entry mode and timestamp-derived elapsed time', () => {
  withMockedNow(2_000_000, ({ setNow }) => {
    const { module, store } = loadFocusHarness();
    store.getState().startEntrySession();
    setNow(2_050_000);
    store.getState().pauseTimer();
    assert.equal(store.getState().timerStatus, 'paused');
    assert.equal(store.getState().sessionMode, 'entry');
    assert.equal(store.getState().entryMilestoneAnnounced, false);
    assert.equal(store.getState().accumulatedSec, 50);
    setNow(2_090_000);
    store.getState().resumeTimer();
    assert.equal(store.getState().timerStatus, 'running');
    assert.equal(store.getState().sessionMode, 'entry');
    setNow(2_160_000);
    assert.equal(module.getElapsedSec(store.getState()), 120);
    assert.equal(module.isEntryMilestoneVisible('entry', false, 119.999), false);
    assert.equal(module.isEntryMilestoneVisible('entry', false, 120), true);
  });
});

check('Background-style elapsed crossing shows the milestone without persistence', () => {
  withMockedNow(3_000_000, ({ setNow }) => {
    const { module, store, inserted } = loadFocusHarness();
    store.getState().startEntrySession();
    setNow(3_125_000);
    const elapsed = module.getElapsedSec(store.getState());
    assert.equal(elapsed, 125);
    assert.equal(module.isEntryMilestoneVisible('entry', false, elapsed), true);
    store.getState().markEntryMilestoneAnnounced();
    assert.equal(store.getState().entryMilestoneAnnounced, true);
    store.getState().markEntryMilestoneAnnounced();
    assert.equal(store.getState().entryMilestoneAnnounced, true);
    assert.equal(inserted.length, 0);
  });
});

check('Keep Going preserves the original session and continues in overtime', () => {
  withMockedNow(4_000_000, ({ setNow }) => {
    const { store, inserted } = loadFocusHarness();
    store.getState().startEntrySession();
    const originalStartedAt = store.getState().startedAt;
    const originalRunningSince = store.getState().runningSince;
    setNow(4_121_000);
    store.getState().markOvertime();
    assert.equal(store.getState().keepGoingFromEntry(), true);
    assert.equal(store.getState().timerStatus, 'overtime');
    assert.equal(store.getState().entryMilestoneDismissed, true);
    assert.equal(store.getState().sessionMode, 'entry');
    assert.equal(store.getState().plannedSec, 120);
    assert.equal(store.getState().startedAt, originalStartedAt);
    assert.equal(store.getState().runningSince, originalRunningSince);
    assert.equal(inserted.length, 0);
  });
});

check('Continue to Profile default changes the total target without resetting elapsed time', () => {
  withMockedNow(5_000_000, ({ setNow }) => {
    const { module, store, inserted } = loadFocusHarness({ defaultFocusSec: 2700 });
    store.getState().startEntrySession();
    const originalStartedAt = store.getState().startedAt;
    setNow(5_127_000);
    assert.equal(store.getState().continueEntryToDefault(), true);
    assert.equal(store.getState().plannedSec, 2700);
    assert.equal(store.getState().sessionMode, 'standard');
    assert.equal(store.getState().timerStatus, 'running');
    assert.equal(store.getState().startedAt, originalStartedAt);
    assert.equal(module.getElapsedSec(store.getState()), 127);
    assert.equal(store.getState().plannedSec - module.getElapsedSec(store.getState()), 2573);
    assert.equal(inserted.length, 0);
  });
});

check('Malformed Profile duration falls back safely when extending an entry session', () => {
  withMockedNow(5_500_000, ({ setNow }) => {
    const { store } = loadFocusHarness({ defaultFocusSec: 123 });
    store.getState().startEntrySession();
    setNow(5_621_000);
    assert.equal(store.getState().continueEntryToDefault(), true);
    assert.equal(store.getState().plannedSec, 1500);
    assert.equal(store.getState().sessionMode, 'standard');
  });
});

check('Paused milestone can extend safely and resume against the new total target', () => {
  withMockedNow(6_000_000, ({ setNow }) => {
    const { store } = loadFocusHarness({ defaultFocusSec: 900 });
    store.getState().startEntrySession();
    setNow(6_125_000);
    store.getState().pauseTimer();
    assert.equal(store.getState().timerStatus, 'paused');
    assert.equal(store.getState().continueEntryToDefault(), true);
    assert.equal(store.getState().timerStatus, 'paused');
    assert.equal(store.getState().plannedSec, 900);
    assert.equal(store.getState().accumulatedSec, 125);
    store.getState().resumeTimer();
    assert.equal(store.getState().timerStatus, 'running');
  });
});

check('Finish persists one compatible Focus row and clears entry assistance state', () => {
  withMockedNow(7_000_000, ({ setNow }) => {
    const { store, inserted } = loadFocusHarness({ defaultFocusSec: 2700 });
    store.getState().startEntrySession({ committeeId: 'committee-1' });
    setNow(7_125_000);
    store.getState().finishSession();
    assert.equal(inserted.length, 1);
    assert.equal(inserted[0].plannedSec, 120);
    assert.equal(inserted[0].actualSec, 125);
    assert.equal(inserted[0].completed, true);
    assert.equal(inserted[0].cancelled, false);
    assert.equal(inserted[0].committeeId, 'committee-1');
    assert.equal('sessionMode' in inserted[0], false);
    assert.equal(store.getState().timerStatus, 'idle');
    assert.equal(store.getState().sessionMode, 'standard');
    assert.equal(store.getState().entryMilestoneDismissed, false);
    assert.equal(store.getState().entryMilestoneAnnounced, false);
    assert.equal(store.getState().plannedSec, 2700);
  });
});

check('Entry cancellation preserves the under-30-second false-start rule', () => {
  withMockedNow(8_000_000, ({ setNow }) => {
    const short = loadFocusHarness();
    short.store.getState().startEntrySession();
    setNow(8_029_000);
    short.store.getState().cancelSession();
    assert.equal(short.inserted.length, 0);
    assert.equal(short.store.getState().timerStatus, 'idle');
  });

  withMockedNow(9_000_000, ({ setNow }) => {
    const durable = loadFocusHarness();
    durable.store.getState().startEntrySession();
    setNow(9_030_000);
    durable.store.getState().cancelSession();
    assert.equal(durable.inserted.length, 1);
    assert.equal(durable.inserted[0].plannedSec, 120);
    assert.equal(durable.inserted[0].actualSec, 30);
    assert.equal(durable.inserted[0].cancelled, true);
    assert.equal(durable.inserted[0].completed, false);
  });
});

check('Dashboard preserves fixed primary Quick Start and hides Start Small when active', () => {
  const dashboard = read('app/(tabs)/index.tsx');
  const card = read('components/dashboard/QuickStartCard.tsx');
  assert.match(dashboard, /focusState\.setPlannedSec\(DEFAULT_FOCUS_SEC\)/);
  assert.match(dashboard, /focusState\.startTimer\(\)/);
  assert.match(dashboard, /focusState\.startEntrySession\(\{ committeeId \}\)/);
  assert.match(dashboard, /onStartSmall=\{timerStatus === 'idle'/);
  assertCopy(card, "Start small · 2 min");
  assert.match(card, /variant="secondary"/);
});

check('Milestone UI is calm, accessible, and offers all three explicit actions', () => {
  const milestone = read('components/focus/EntryMilestone.tsx');
  const focusScreen = read('app/(tabs)/focus.tsx');
  assertCopy(milestone, 'Two minutes done.');
  assertCopy(milestone, 'Finish here');
  assertCopy(milestone, 'Keep going');
  assert.match(milestone, /t\.focus\.milestone\.continueToDefault\(defaultMinutes\)/);
  assert.equal(en.focus.milestone.continueToDefault(25), 'Continue to 25 min total');
  assert.match(focusScreen, /announceForAccessibility/);
  assert.match(milestone, /accessibilityLabel/);
  assert.doesNotMatch(milestone, /Failed|Give up|Not enough|Push harder|should continue/i);
});

check('Adaptive matrix returns every approved recommendation deterministically', () => {
  const cases = [
    ['low', 'scattered', 120],
    ['low', 'okay', 900],
    ['low', 'focused', 900],
    ['steady', 'scattered', 900],
    ['steady', 'okay', 1500],
    ['steady', 'focused', 1500],
    ['good', 'scattered', 900],
    ['good', 'okay', 1500],
    ['good', 'focused', 2700],
  ];

  for (const [energy, attention, expected] of cases) {
    const first = studySupportRules.getAdaptiveRecommendation(energy, attention);
    const second = studySupportRules.getAdaptiveRecommendation(energy, attention);
    assert.equal(first?.durationSec, expected);
    assert.deepEqual(second, first);
    assert.equal(typeof first?.reason, 'string');
  }
});

check('Incomplete and unknown check-in values produce no recommendation', () => {
  assert.equal(studySupportRules.getAdaptiveRecommendation(null, 'okay'), null);
  assert.equal(studySupportRules.getAdaptiveRecommendation('steady', null), null);
  assert.equal(studySupportRules.getAdaptiveRecommendation('unknown', 'focused'), null);
  assert.equal(studySupportRules.getAdaptiveRecommendation('good', 'unknown'), null);
});

check('Answer selection and duration override never start Focus automatically', () => {
  const support = loadStudySupportHarness().store;
  const focus = loadFocusHarness().store;
  const now = new Date(2026, 8, 3, 10, 0, 0, 0).getTime();

  support.getState().setEnergy('steady', now);
  assert.equal(focus.getState().timerStatus, 'idle');
  assert.equal(support.getState().selectedDurationSec, null);

  support.getState().setAttention('okay', now + 1_000);
  assert.equal(support.getState().selectedDurationSec, 1500);
  assert.equal(focus.getState().timerStatus, 'idle');

  support.getState().selectDuration(900);
  assert.equal(support.getState().selectedDurationSec, 900);
  assert.equal(focus.getState().timerStatus, 'idle');
});

check('Two-minute adaptive selection continues to use the Phase 3.1 entry path', () => {
  withMockedNow(10_000_000, () => {
    const { store } = loadFocusHarness();
    assert.equal(store.getState().startEntrySession(), true);
    assert.equal(store.getState().plannedSec, 120);
    assert.equal(store.getState().sessionMode, 'entry');
  });
});

check('Atomic adaptive start accepts only 15, 25, and 45 minute standard sessions', () => {
  for (const durationSec of [900, 1500, 2700]) {
    withMockedNow(11_000_000 + durationSec, () => {
      const { store } = loadFocusHarness();
      assert.equal(
        store.getState().startAdaptiveSession({ durationSec, committeeId: 'committee-1' }),
        true
      );
      const state = store.getState();
      assert.equal(state.timerStatus, 'running');
      assert.equal(state.plannedSec, durationSec);
      assert.equal(state.sessionMode, 'standard');
      assert.equal(state.selectedCommitteeId, 'committee-1');
      assert.equal(state.startedAt, 11_000_000 + durationSec);
      assert.equal(state.runningSince, 11_000_000 + durationSec);
    });
  }

  const invalid = loadFocusHarness().store;
  assert.equal(invalid.getState().startAdaptiveSession({ durationSec: 120 }), false);
  assert.equal(invalid.getState().startAdaptiveSession({ durationSec: 3600 }), false);
  assert.equal(invalid.getState().timerStatus, 'idle');
});

check('Atomic adaptive start refuses to replace or duplicate active Focus', () => {
  withMockedNow(12_000_000, () => {
    const { store } = loadFocusHarness();
    assert.equal(store.getState().startAdaptiveSession({ durationSec: 900 }), true);
    const startedAt = store.getState().startedAt;
    assert.equal(store.getState().startAdaptiveSession({ durationSec: 2700 }), false);
    assert.equal(store.getState().startEntrySession(), false);
    assert.equal(store.getState().plannedSec, 900);
    assert.equal(store.getState().startedAt, startedAt);
  });
});

check('Adaptive Committee context is validated and stale context is cleared', () => {
  const valid = loadFocusHarness({ validCommitteeIds: ['committee-1'] });
  assert.equal(
    valid.store.getState().startAdaptiveSession({
      durationSec: 1500,
      committeeId: 'committee-1',
    }),
    true
  );
  assert.equal(valid.store.getState().selectedCommitteeId, 'committee-1');

  const stale = loadFocusHarness({ validCommitteeIds: [] });
  assert.equal(
    stale.store.getState().startAdaptiveSession({
      durationSec: 1500,
      committeeId: 'deleted',
    }),
    true
  );
  assert.equal(stale.store.getState().selectedCommitteeId, null);
});

check('Successful starts clear check-in while refused starts preserve it', () => {
  const now = new Date(2026, 8, 3, 11, 0, 0, 0).getTime();
  const successSupport = loadStudySupportHarness().store;
  const successFocus = loadFocusHarness().store;
  successSupport.getState().setEnergy('steady', now);
  successSupport.getState().setAttention('okay', now);
  const started = successFocus.getState().startAdaptiveSession({ durationSec: 1500 });
  if (started) successSupport.getState().resetCheckIn();
  assert.equal(started, true);
  assert.equal(successSupport.getState().energy, null);
  assert.equal(successSupport.getState().selectedDurationSec, null);

  const refusedSupport = loadStudySupportHarness().store;
  const refusedFocus = loadFocusHarness().store;
  refusedSupport.getState().setEnergy('good', now);
  refusedSupport.getState().setAttention('focused', now);
  refusedFocus.getState().startEntrySession();
  const refused = refusedFocus.getState().startAdaptiveSession({ durationSec: 2700 });
  if (refused) refusedSupport.getState().resetCheckIn();
  assert.equal(refused, false);
  assert.equal(refusedSupport.getState().energy, 'good');
  assert.equal(refusedSupport.getState().attention, 'focused');
  assert.equal(refusedSupport.getState().selectedDurationSec, 2700);
});

check('Check-in freshness enforces two hours, local midnight, and negative-age expiry', () => {
  const capturedAt = new Date(2026, 8, 3, 10, 0, 0, 0).getTime();
  const localDateKey = calendarDate.todayLocalDateKey(new Date(capturedAt));
  const freshness = { capturedAt, localDateKey };
  assert.equal(
    studySupportRules.isCheckInFresh(
      freshness,
      capturedAt + studySupportRules.CHECK_IN_FRESHNESS_MS - 1
    ),
    true
  );
  assert.equal(
    studySupportRules.isCheckInFresh(
      freshness,
      capturedAt + studySupportRules.CHECK_IN_FRESHNESS_MS
    ),
    false
  );
  assert.equal(studySupportRules.isCheckInFresh(freshness, capturedAt - 1), false);

  const lateCapture = new Date(2026, 8, 3, 23, 55, 0, 0).getTime();
  const afterMidnight = new Date(2026, 8, 4, 0, 1, 0, 0).getTime();
  const lateKey = calendarDate.todayLocalDateKey(new Date(lateCapture));
  assert.equal(
    studySupportRules.isCheckInFresh(
      { capturedAt: lateCapture, localDateKey: lateKey },
      afterMidnight
    ),
    false
  );
  assert.equal(
    studySupportRules.getCheckInExpiresAt({ capturedAt: lateCapture, localDateKey: lateKey }),
    calendarDate.getLocalDayRange(lateKey).endMs
  );
});

check('Runtime store clears expired and malformed state without persistence', () => {
  const { store } = loadStudySupportHarness();
  const now = new Date(2026, 8, 3, 12, 0, 0, 0).getTime();
  store.getState().setCommitteeContext('committee-1', 'Cardiovascular');
  store.getState().setEnergy('low', now);
  store.getState().setAttention('scattered', now);
  assert.equal(store.getState().selectedDurationSec, 120);
  assert.equal(
    store.getState().clearIfExpired(now + studySupportRules.CHECK_IN_FRESHNESS_MS),
    true
  );
  assert.equal(store.getState().energy, null);
  assert.equal(store.getState().committeeId, null);

  store.setState({
    energy: 'invalid',
    capturedAt: now,
    localDateKey: calendarDate.todayLocalDateKey(new Date(now)),
  });
  assert.equal(store.getState().clearIfExpired(now + 1), true);
  assert.equal(store.getState().energy, null);
});

check('Committee context is visible, removable, retryable, and optional', () => {
  const { store } = loadStudySupportHarness();
  store.getState().setCommitteeContext('committee-1', 'Cardiovascular');
  assert.equal(store.getState().committeeId, 'committee-1');
  assert.equal(store.getState().committeeName, 'Cardiovascular');
  store.getState().clearCommitteeContext();
  assert.equal(store.getState().committeeId, null);
  assert.equal(store.getState().committeeName, null);

  const route = read('app/study-support/check-in.tsx');
  const recommendation = read('components/study-support/AdaptiveRecommendationCard.tsx');
  assertCopy(recommendation, "Use without Committee");
  assertCopy(recommendation, 'Retry');
  assert.match(recommendation, /onPress=\{onRetryContext\}/);
  assertCopy(recommendation, "Continue without Committee");
  assert.match(route, /committeeRepo\.getById/);
});

check('Dashboard entry hierarchy and active-session guards remain explicit', () => {
  const dashboard = read('app/(tabs)/index.tsx');
  const card = read('components/dashboard/QuickStartCard.tsx');
  const route = read('app/study-support/check-in.tsx');
  assertCopy(card, "Start small · 2 min");
  assertCopy(card, "Not sure what fits? Check in");
  assert.match(card, /variant="ghost"/);
  assert.match(dashboard, /onCheckIn=\{timerStatus === 'idle'/);
  assertCopy(route, "A Focus session is already active.");
  assertCopy(route, "Continue Focus");
});

check('Check-in route has explicit start, skip, close, and Focus-setup behavior', () => {
  const route = read('app/study-support/check-in.tsx');
  const recommendation = read('components/study-support/AdaptiveRecommendationCard.tsx');
  assert.match(route, /function handleStart\(\)/);
  assert.match(route, /if \(!started\)[\s\S]*return;[\s\S]*resetCheckIn\(\)/);
  assertCopy(route, "Skip check-in");
  assert.match(route, /hardwareBackPress/);
  assertCopy(recommendation, "Open Focus setup");
  assertCopy(recommendation, "Start small · 2 min");
  assert.match(recommendation, /t\.adaptiveRec\.startFocus\(selectedDurationSec \/ 60\)/);
  assert.equal(en.adaptiveRec.startFocus(15), 'Start 15 min Focus');
});

check('Adaptive UI exposes exactly four overrides and no 60-minute compact option', () => {
  assert.deepEqual([...studySupportRules.ADAPTIVE_DURATION_OPTIONS], [120, 900, 1500, 2700]);
  assert.equal(studySupportRules.isAdaptiveDurationSec(3600), false);
  const recommendation = read('components/study-support/AdaptiveRecommendationCard.tsx');
  assert.match(recommendation, /Recommended/);
  assert.doesNotMatch(recommendation, /60 min/);
});

check('Check-in controls provide practical touch targets and non-color selection cues', () => {
  const choices = read('components/study-support/CheckInChoiceGroup.tsx');
  const recommendation = read('components/study-support/AdaptiveRecommendationCard.tsx');
  assert.match(choices, /minHeight: 56/);
  assert.match(choices, /accessibilityState=\{\{ checked: isSelected \}\}/);
  assert.match(choices, /check-circle/);
  assert.match(recommendation, /minHeight: 64| minHeight: 64|minHeight: 56|minHeight: 60|minHeight: 68/);
  assert.match(recommendation, /accessibilityLabel/);
  assert.match(recommendation, /name="check"/);
});

check('Phase 3.2 copy is optional, transparent, and non-punitive', () => {
  const copy = [
    read('app/study-support/check-in.tsx'),
    read('components/study-support/CheckInChoiceGroup.tsx'),
    read('components/study-support/AdaptiveRecommendationCard.tsx'),
    read('utils/studySupportRules.ts'),
  ].join('\n');
  assertCopy(copy, 'Optional. Used only for this suggestion.');
  assert.match(copy, /Steady energy · Okay attention|formatCheckInSummary/);
  assert.doesNotMatch(
    copy,
    /ADHD severity|severe ADHD|lazy|unproductive|you failed|you should|only handle|poor discipline/i
  );
});

check('Phase 3.2 remains runtime-only with no schema, dependency, or version change', () => {
  const migrations = read('db/migrations.ts');
  const focusRepo = read('db/repositories/focusRepo.ts');
  const appStore = read('store/useAppStore.ts');
  const supportStore = read('store/useStudySupportStore.ts');
  const packageJson = JSON.parse(read('package.json'));
  assert.match(migrations, /const CURRENT_VERSION = 10/);
  assert.doesNotMatch(migrations, /^\s*if \(currentVersion < 11\)/m);
  assert.doesNotMatch(migrations, /session_mode|entry_mode|check_in|study_check/);
  assert.doesNotMatch(focusRepo, /sessionMode|session_mode|entryMilestone|checkIn/);
  assert.doesNotMatch(appStore, /sessionMode|entryMilestone|CheckInEnergy|checkIn/);
  assert.doesNotMatch(supportStore, /persist\(|AsyncStorage|expo-sqlite|db\/repositories/);
  assert.equal(packageJson.dependencies.expo, '~57.0.18');
  assert.equal(packageJson.dependencies.react, '19.2.3');
  assert.equal(packageJson.dependencies['react-native'], '0.86.3');
  assert.equal(packageJson.dependencies['expo-router'], '~57.0.17');
  assert.equal(packageJson.dependencies['expo-sqlite'], '~57.0.2');
  assert.equal(Object.keys(packageJson.dependencies).length, 13);
});

check('Idle Lighter Plan builds one to three truthful actions in the approved order', () => {
  const focusOnly = recoveryRules.buildIdleRecoveryActions({
    committee: null,
    memory: null,
    calendar: null,
  });
  assert.deepEqual(focusOnly, [{ type: 'focus', committee: null }]);

  const memory = {
    deckId: 'deck-1',
    deckName: 'Anatomy',
    availableCardCount: 3,
    selectionReason: 'recent_again_hard',
  };
  const calendar = {
    eventId: 'event-1',
    title: 'Read notes',
    timingKind: 'future',
    displayedTime: '15:00',
  };
  assert.deepEqual(
    recoveryRules.buildIdleRecoveryActions({ committee: null, memory, calendar })
      .map((action) => action.type),
    ['focus', 'memory', 'calendar']
  );
  assert.equal(
    recoveryRules.buildIdleRecoveryActions({ committee: null, memory, calendar }).length,
    3
  );
  assert.equal(recoveryRules.RECOVERY_REVIEW_LIMIT, 5);
  assert.equal(recoveryRules.RECOVERY_ACTION_LIMIT, 3);
});

check('Calendar Recovery selects ongoing, then all-day, then future events', () => {
  const today = '2026-09-03';
  const now = new Date(2026, 8, 3, 10, 0, 0, 0).getTime();
  const event = (id, startTime, endTime, title = id) => ({
    id,
    title,
    description: '',
    date: today,
    startTime,
    endTime,
    committeeId: null,
    createdAt: 1,
    updatedAt: 1,
  });
  const allDay = event('all-day', null, null);
  const future = event('future', '10:30', '11:00');
  const ongoing = event('ongoing', '09:30', '10:30');
  assert.equal(
    recoveryRules.selectRecoveryCalendarCandidate([future, allDay, ongoing], today, now)
      .eventId,
    'ongoing'
  );
  assert.equal(
    recoveryRules.selectRecoveryCalendarCandidate([future, allDay], today, now).eventId,
    'all-day'
  );
  assert.equal(
    recoveryRules.selectRecoveryCalendarCandidate([future], today, now).eventId,
    'future'
  );
});

check('Calendar Recovery excludes passed timed events and uses stable tie-breakers', () => {
  const today = '2026-09-03';
  const now = new Date(2026, 8, 3, 10, 0, 0, 0).getTime();
  const base = {
    description: '',
    date: today,
    committeeId: null,
    createdAt: 1,
    updatedAt: 1,
  };
  const passed = { ...base, id: 'passed', title: 'Passed', startTime: '08:00', endTime: '09:00' };
  const noEndAtStart = { ...base, id: 'no-end', title: 'No end', startTime: '10:00', endTime: null };
  const b = { ...base, id: 'b', title: 'B', startTime: '11:00', endTime: '12:00' };
  const a = { ...base, id: 'a', title: 'A', startTime: '11:00', endTime: '12:00' };
  assert.equal(
    recoveryRules.selectRecoveryCalendarCandidate([passed, noEndAtStart], today, now),
    null
  );
  assert.equal(
    recoveryRules.selectRecoveryCalendarCandidate([b, a], today, now).eventId,
    'a'
  );
});

check('Calendar refresh boundary tracks event starts, ends, and local midnight', () => {
  const today = '2026-09-03';
  const now = new Date(2026, 8, 3, 10, 0, 0, 0).getTime();
  const event = {
    id: 'event-1',
    title: 'Study',
    description: '',
    date: today,
    startTime: '11:00',
    endTime: '12:00',
    committeeId: null,
    createdAt: 1,
    updatedAt: 1,
  };
  assert.equal(
    recoveryRules.getNextRecoveryCalendarRefreshAt([event], today, now),
    new Date(2026, 8, 3, 11, 0, 0, 0).getTime()
  );
  const during = new Date(2026, 8, 3, 11, 30, 0, 0).getTime();
  assert.equal(
    recoveryRules.getNextRecoveryCalendarRefreshAt([event], today, during),
    new Date(2026, 8, 3, 12, 0, 0, 0).getTime()
  );
  assert.equal(
    recoveryRules.getNextRecoveryCalendarRefreshAt([], today, now),
    calendarDate.getLocalDayRange(today).endMs
  );
});

check('Memory Recovery query is bounded, oldest-first, and leaves normal review unbounded', () => {
  const { memoryRepo, deckRows, cardRows } = createMemoryRepositoryHarness();
  deckRows.push({
    id: 'deck-1',
    name: 'Anatomy',
    description: '',
    committee_id: null,
    created_at: 1,
    updated_at: 100,
  });
  for (let index = 0; index < 20; index += 1) {
    cardRows.push({
      id: `card-${String(index).padStart(2, '0')}`,
      deck_id: 'deck-1',
      front: `Front ${index}`,
      back: `Back ${index}`,
      created_at: 20 - index,
      updated_at: 20 - index,
    });
  }

  for (const limit of [1, 3, 5]) {
    assert.equal(memoryRepo.getReviewQueue('deck-1', limit).length, limit);
  }
  const bounded = memoryRepo.getReviewQueue('deck-1', 5);
  assert.equal(bounded.length, 5);
  assert.deepEqual(bounded.map((card) => card.createdAt), [1, 2, 3, 4, 5]);
  assert.equal(memoryRepo.getReviewQueue('deck-1').length, 20);

  for (const cardCount of [1, 3, 5]) {
    const deckId = `small-${cardCount}`;
    for (let index = 0; index < cardCount; index += 1) {
      cardRows.push({
        id: `${deckId}-card-${index}`,
        deck_id: deckId,
        front: `Front ${index}`,
        back: `Back ${index}`,
        created_at: index,
        updated_at: index,
      });
    }
    assert.equal(memoryRepo.getReviewQueue(deckId, 5).length, cardCount);
  }
});

check('Most recently updated non-empty deck fallback is deterministic', () => {
  const { memoryRepo, deckRows, cardRows } = createMemoryRepositoryHarness();
  for (const id of ['b', 'a', 'empty']) {
    deckRows.push({
      id,
      name: id,
      description: '',
      committee_id: null,
      created_at: 1,
      updated_at: id === 'empty' ? 200 : 100,
    });
  }
  for (const id of ['a', 'b']) {
    cardRows.push({
      id: `card-${id}`,
      deck_id: id,
      front: id,
      back: id,
      created_at: 1,
      updated_at: 1,
    });
  }
  assert.equal(memoryRepo.getMostRecentlyUpdatedNonEmptyDeck().id, 'a');

  cardRows.length = 0;
  assert.equal(memoryRepo.getMostRecentlyUpdatedNonEmptyDeck(), null);
});

check('Recovery review retries stay bounded while rating writes advance exactly once', () => {
  const harness = createMemoryStoreHarness({ failReviewInsert: true });
  const store = harness.store;
  store.getState().startReview('deck-1', 5);
  assert.equal(store.getState().reviewQueue.length, 5);
  store.getState().revealAnswer();
  assert.equal(store.getState().reviewStatus, 'answer');
  assert.equal(store.getState().rateCurrentCard('hard'), false);
  assert.equal(store.getState().reviewIndex, 0);
  assert.equal(store.getState().reviewStatus, 'answer');
  assert.equal(harness.reviews.length, 0);

  harness.setFailReviewInsert(false);
  assert.equal(store.getState().rateCurrentCard('hard'), true);
  assert.equal(store.getState().reviewIndex, 1);
  assert.equal(harness.reviews.length, 1);
  assert.equal(store.getState().reviewSummary.hard, 1);
  store.getState().startReview('deck-1', 5);
  assert.deepEqual(harness.calls, [5, 5]);
});

check('Deleted deck produces a truthful unavailable state before review begins', () => {
  const { store, calls } = createMemoryStoreHarness({ deletedDeck: true });
  store.getState().startReview('deck-1', 5);
  assert.equal(store.getState().reviewStatus, 'idle');
  assert.equal(store.getState().reviewDeckId, null);
  assert.match(store.getState().error, /no longer available/i);
  assert.equal(calls.length, 0);
});

check('Lighter Plan entry is universal, low-emphasis, and absent from Dashboard', () => {
  const checkIn = read('app/study-support/check-in.tsx');
  const recommendation = read('components/study-support/AdaptiveRecommendationCard.tsx');
  const dashboard = read('app/(tabs)/index.tsx');
  assert.match(checkIn, /onOpenRecovery=\{handleOpenRecovery\}/);
  assert.match(checkIn, /pathname: '\/study-support\/recovery'/);
  assertCopy(recommendation, "Choose a lighter plan");
  assert.match(recommendation, /variant="ghost"/);
  assert.doesNotMatch(dashboard, /Lighter plan|study-support\/recovery/);
});

check('Active Focus protection renders only Continue Focus and never replaces the timer', () => {
  const route = read('app/study-support/recovery.tsx');
  assert.match(route, /timerStatus !== 'idle'/);
  assert.match(route, /title=\{t\.recovery\.continueFocus\}/);
  assertCopy(route, 'Continue Focus');
  assert.match(route, /if \(useFocusStore\.getState\(\)\.timerStatus !== 'idle'\)/);
  assert.match(route, /setMemoryCandidate\(null\)/);
  assert.match(route, /setCalendarCandidate\(null\)/);
  assert.equal((route.match(/startEntrySession/g) ?? []).length, 1);
  assert.doesNotMatch(route, /resetTimer\(|startTimer\(|startAdaptiveSession\(/);

  for (const activeStatus of ['running', 'paused', 'overtime']) {
    const harness = loadFocusHarness();
    harness.store.setState({ timerStatus: activeStatus });
    const startedAt = harness.store.getState().startedAt;
    assert.equal(harness.store.getState().startEntrySession(), false);
    assert.equal(harness.store.getState().timerStatus, activeStatus);
    assert.equal(harness.store.getState().startedAt, startedAt);
  }
});

check('Committee inheritance is visible, removable, retryable, and revalidated before start', () => {
  const route = read('app/study-support/recovery.tsx');
  assert.match(route, /committeeRepo\.getById\(committeeHint\)/);
  assert.match(route, /committeeRepo\.getById\(committeeState\.context\.id\)/);
  assertCopy(route, "Use without Committee");
  assertCopy(route, "Continue without Committee");
  assert.match(route, /label=\{t\.common\.retry\}/);
  assertCopy(route, "This Committee is no longer available");
  assert.match(route, /startEntrySession\(\{ committeeId: verifiedCommitteeId \}\)/);
});

check('Memory candidate selection reuses the seven-day signal and approved tie-breakers', () => {
  const route = read('app/study-support/recovery.tsx');
  const dashboardRepo = read('db/repositories/dashboardRepo.ts');
  const memoryRepo = read('db/repositories/memoryRepo.ts');
  assert.match(route, /getDashboardDayWindow\(today\)/);
  assert.match(route, /dashboardRepo\.getWeakDeck/);
  assert.match(route, /selectionReason: 'recent_again_hard'/);
  assert.match(route, /getMostRecentlyUpdatedNonEmptyDeck/);
  assert.match(route, /selectionReason: 'recently_updated'/);
  assert.match(
    dashboardRepo,
    /ORDER BY attention_count DESC, last_attention_at DESC,[\s\S]*d\.name COLLATE NOCASE ASC, d\.id ASC/
  );
  assert.match(memoryRepo, /ORDER BY d\.updated_at DESC, d\.id ASC/);
});

check('Recovery review mode preserves the five-card limit on load, retry, and Review Again', () => {
  const review = read('app/decks/[id]/review.tsx');
  const memoryRepo = read('db/repositories/memoryRepo.ts');
  assert.match(review, /mode\) === 'recovery'/);
  assert.match(review, /RECOVERY_REVIEW_LIMIT/);
  assert.ok((review.match(/startReview\(id, reviewLimit, dueMode \? 'due' : 'all'\)/g) ?? []).length >= 3);
  assert.match(memoryRepo, /LIMIT \?/);
  assert.match(memoryRepo, /\[deckId, safeLimit\]/);
  assertCopy(read('components/memory/ReviewSummary.tsx'), 'Ratings are saved locally.');
});

check('Recovery route refreshes bounded Calendar data without polling', () => {
  const route = read('app/study-support/recovery.tsx');
  assert.match(route, /calendarRepo\.getByDateRange/);
  assert.match(route, /selectRecoveryCalendarCandidate/);
  assert.match(route, /getNextRecoveryCalendarRefreshAt/);
  assert.match(route, /useFocusEffect/);
  assert.match(route, /AppState\.addEventListener/);
  assert.match(route, /setTimeout/);
  assert.doesNotMatch(route, /setInterval/);
  assert.match(route, /router\.push\(`\/calendar\/\$\{action\.eventId\}`/);
});

check('Opening Lighter Plan starts nothing and every domain action requires an explicit press', () => {
  const route = read('app/study-support/recovery.tsx');
  assert.match(route, /onAction=\{handleStartFocus\}/);
  assert.match(route, /onAction=\{\(\) => handleOpenMemory\(memoryAction\)\}/);
  assert.match(route, /onAction=\{\(\) => handleOpenCalendar\(calendarAction\)\}/);
  assert.doesNotMatch(route, /useEffect\([\s\S]{0,500}startEntrySession/);
  assert.match(route, /router\.canGoBack\(\)/);
  assert.match(route, /router\.dismissTo\('\/\(tabs\)' as Href\)/);
});

check('Lighter Plan is route-local, migration-free, dependency-free, and non-clinical', () => {
  const route = read('app/study-support/recovery.tsx');
  const supportStore = read('store/useStudySupportStore.ts');
  const migrations = read('db/migrations.ts');
  const packageJson = JSON.parse(read('package.json'));
  assert.doesNotMatch(supportStore, /recoveryOpen|RecoveryAction|selectedRecoveryAction|microSteps/);
  assert.doesNotMatch(route, /AsyncStorage|persist\(|telemetry|analytics/);
  assert.equal(fs.existsSync(path.join(root, 'db/repositories/recoveryRepo.ts')), false);
  assert.match(migrations, /const CURRENT_VERSION = 10/);
  assert.doesNotMatch(migrations, /^\s*if \(currentVersion < 11\)/m);
  assert.equal(Object.keys(packageJson.dependencies).length, 13);
  assertCopy(route, "Lighter plan");
  assertCopy(route, "Choose one small useful thing.");
  assertCopy(route, "You can stop after that, or continue if it helps.");
  assert.doesNotMatch(
    route,
    /Minimum Viable Day|Bad day|Failure|Crisis|Low productivity|You should|Due|Mastery|Weakness score|Complete your Recovery/i
  );
});

check('Recovery controls and phone/tablet layouts remain accessible and constrained', () => {
  const route = read('app/study-support/recovery.tsx');
  const card = read('components/study-support/RecoveryActionCard.tsx');
  assert.match(card, /accessibilityLabel/);
  assert.match(card, /height: 44/);
  assert.match(card, /width: 44/);
  assert.doesNotMatch(card, /numberOfLines/);
  assert.match(route, /isLargeTablet\s*&&\s*isLandscape/);
  assert.match(route, /fontScale <= 1\.3/);
  assert.match(route, /maxWidth: isTablet \? 720 : 560/);
  assert.match(route, /includeBottomSafeArea/);
  assert.doesNotMatch(route, /useSafeAreaInsets|insets\.bottom/);
  assert.match(route, /flexDirection: 'row'/);
  assert.match(route, /ScreenWrapper/);
});

check('Gentle break duration and remaining time are timestamp-derived', () => {
  assert.equal(gentleReturnRules.GENTLE_BREAK_DURATION_SEC, 120);
  assert.equal(gentleReturnRules.getGentleBreakRemainingSec(10_000, 10_000), 120);
  assert.equal(gentleReturnRules.getGentleBreakRemainingSec(10_000, 11_000), 119);
  assert.equal(gentleReturnRules.getGentleBreakRemainingSec(10_000, 129_999), 1);
  assert.equal(gentleReturnRules.getGentleBreakRemainingSec(10_000, 130_000), 0);
  assert.equal(gentleReturnRules.getGentleBreakRemainingSec(10_000, 140_000), 0);
  assert.equal(gentleReturnRules.getGentleBreakRemainingSec(10_000, 9_000), 120);
  assert.equal(gentleReturnRules.getGentleBreakRemainingSec(Number.NaN, 10_000), 0);
});

check('Explicit Gentle break atomically pauses once without changing session identity', () => {
  withMockedNow(20_000_000, ({ setNow }) => {
    const { module, store, inserted } = loadFocusHarness();
    store.getState().setSelectedCommittee('committee-1');
    store.getState().startTimer();
    const original = store.getState();

    setNow(20_050_000);
    assert.equal(store.getState().startGentleBreak(), true);
    const paused = store.getState();
    assert.equal(paused.timerStatus, 'paused');
    assert.equal(paused.accumulatedSec, 50);
    assert.equal(paused.runningSince, null);
    assert.equal(paused.pausedAt, 20_050_000);
    assert.equal(paused.gentleBreakStartedAt, 20_050_000);
    assert.equal(paused.startedAt, original.startedAt);
    assert.equal(paused.plannedSec, original.plannedSec);
    assert.equal(paused.sessionMode, original.sessionMode);
    assert.equal(paused.selectedCommitteeId, original.selectedCommitteeId);
    assert.equal(module.getElapsedSec(paused, 20_110_000), 50);
    assert.equal(inserted.length, 0);

    setNow(20_080_000);
    assert.equal(store.getState().startGentleBreak(), false);
    assert.equal(store.getState().gentleBreakStartedAt, 20_050_000);
    assert.equal(store.getState().accumulatedSec, 50);
  });
});

check('Gentle break return resumes the same session and excludes break time', () => {
  withMockedNow(21_000_000, ({ setNow }) => {
    const { module, store, inserted } = loadFocusHarness();
    store.getState().startTimer();
    const startedAt = store.getState().startedAt;
    setNow(21_030_000);
    assert.equal(store.getState().startGentleBreak(), true);

    setNow(21_180_000);
    assert.equal(module.getElapsedSec(store.getState()), 30);
    store.getState().resumeTimer();
    assert.equal(store.getState().timerStatus, 'running');
    assert.equal(store.getState().gentleBreakStartedAt, null);
    assert.equal(store.getState().startedAt, startedAt);
    assert.equal(store.getState().accumulatedSec, 30);
    assert.equal(store.getState().runningSince, 21_180_000);
    setNow(21_190_000);
    assert.equal(module.getElapsedSec(store.getState()), 40);
    assert.equal(inserted.length, 0);
  });
});

check('Manual pause offers no extra break and valid resume semantics remain unchanged', () => {
  withMockedNow(22_000_000, ({ setNow }) => {
    const { store } = loadFocusHarness();
    store.getState().startTimer();
    setNow(22_015_000);
    store.getState().pauseTimer();
    assert.equal(store.getState().timerStatus, 'paused');
    assert.equal(store.getState().gentleBreakStartedAt, null);
    assert.equal(store.getState().startGentleBreak(), false);
    store.getState().resumeTimer();
    assert.equal(store.getState().timerStatus, 'running');
    assert.equal(store.getState().gentleBreakStartedAt, null);
  });
});

check('Gentle break preserves overtime, entry milestones, and Committee context', () => {
  withMockedNow(23_000_000, ({ setNow }) => {
    const { module, store, inserted } = loadFocusHarness();
    store.getState().startEntrySession({ committeeId: 'committee-1' });
    setNow(23_125_000);
    store.getState().markOvertime();
    store.getState().markEntryMilestoneAnnounced();
    const beforeBreak = store.getState();
    assert.equal(beforeBreak.timerStatus, 'overtime');
    assert.equal(module.isEntryMilestoneVisible('entry', false, 125), true);

    assert.equal(store.getState().startGentleBreak(), true);
    const duringBreak = store.getState();
    assert.equal(duringBreak.timerStatus, 'paused');
    assert.equal(duringBreak.sessionMode, 'entry');
    assert.equal(duringBreak.plannedSec, 120);
    assert.equal(duringBreak.entryMilestoneDismissed, false);
    assert.equal(duringBreak.entryMilestoneAnnounced, true);
    assert.equal(duringBreak.selectedCommitteeId, 'committee-1');

    setNow(23_245_000);
    store.getState().resumeTimer();
    const resumed = store.getState();
    assert.equal(resumed.timerStatus, 'overtime');
    assert.equal(resumed.sessionMode, 'entry');
    assert.equal(resumed.plannedSec, 120);
    assert.equal(resumed.entryMilestoneDismissed, false);
    assert.equal(resumed.entryMilestoneAnnounced, true);
    assert.equal(resumed.selectedCommitteeId, 'committee-1');
    assert.equal(module.isEntryMilestoneVisible('entry', false, 125), true);
    assert.equal(inserted.length, 0);
  });
});

check('Finish, cancel, reset, and fresh process state clear the runtime break marker', () => {
  withMockedNow(24_000_000, ({ setNow }) => {
    const finished = loadFocusHarness();
    finished.store.getState().startTimer();
    setNow(24_040_000);
    assert.equal(finished.store.getState().startGentleBreak(), true);
    finished.store.getState().finishSession();
    assert.equal(finished.inserted.length, 1);
    assert.equal(finished.store.getState().timerStatus, 'idle');
    assert.equal(finished.store.getState().gentleBreakStartedAt, null);
  });

  withMockedNow(25_000_000, ({ setNow }) => {
    const cancelled = loadFocusHarness();
    cancelled.store.getState().startTimer();
    setNow(25_045_000);
    assert.equal(cancelled.store.getState().startGentleBreak(), true);
    cancelled.store.getState().cancelSession();
    assert.equal(cancelled.inserted.length, 1);
    assert.equal(cancelled.store.getState().timerStatus, 'idle');
    assert.equal(cancelled.store.getState().gentleBreakStartedAt, null);
  });

  const reset = loadFocusHarness();
  reset.store.setState({ gentleBreakStartedAt: 123 });
  reset.store.getState().resetTimer();
  assert.equal(reset.store.getState().gentleBreakStartedAt, null);
  assert.equal(loadFocusHarness().store.getState().gentleBreakStartedAt, null);
});

check('Gentle Return entry is active-Focus-only and opening it has no timer action', () => {
  const focusScreen = read('app/(tabs)/focus.tsx');
  const otherSurfaces = [
    read('app/(tabs)/index.tsx'),
    read('app/study-support/check-in.tsx'),
    read('app/study-support/recovery.tsx'),
    read('app/(tabs)/memory.tsx'),
    read('app/(tabs)/calendar.tsx'),
  ].join('\n');
  const activeBranchIndex = focusScreen.indexOf('if (isActive)');
  const entryIndex = focusScreen.indexOf('t.focus.controls.iGotDistracted');
  const idleBranchIndex = focusScreen.indexOf('{t.focus.title}');
  assert.ok(activeBranchIndex >= 0 && entryIndex > activeBranchIndex && entryIndex < idleBranchIndex);
  assert.equal((focusScreen.match(/t\.focus\.controls\.iGotDistracted/g) ?? []).length, 2);
  assert.doesNotMatch(otherSurfaces, /I got distracted|GentleReturnCard/);
  assert.match(
    focusScreen,
    /const handleOpenGentleReturn = \(\) => \{[\s\S]*?setGentleReturnOpen\(true\);[\s\S]*?\};/
  );
  const openHandler = focusScreen.match(
    /const handleOpenGentleReturn = \(\) => \{[\s\S]*?\n  \};/
  )?.[0] ?? '';
  assert.doesNotMatch(openHandler, /pauseTimer|resumeTimer|startGentleBreak|setState/);
});

check('Gentle Return card implements approved running, paused, and break behavior', () => {
  const component = read('components/focus/GentleReturnCard.tsx');
  const focusScreen = read('app/(tabs)/focus.tsx');
  assertCopy(component, "Return gently");
  assertCopy(component, "Nothing to reset. Pick up where you left off.");
  assertCopy(component, "Continue with the next small action.");
  assertCopy(component, "Return to focus");
  assertCopy(component, "Take a 2 min break");
  assertCopy(component, "Not now");
  assertCopy(component, "Stay paused");
  assertCopy(component, "Take a short break");
  assertCopy(component, "No rush. Return when you're ready.");
  assertCopy(component, "Ready when you are.");
  assert.match(component, /const isPaused = status === 'paused'/);
  assert.match(component, /\{isPaused \? \(/);
  assert.match(focusScreen, /showGentleReturn \? \(/);
  assert.match(focusScreen, /breakStartedAt=\{gentleBreakStartedAt\}/);
});

check('Gentle Return countdown is foreground-safe, accessible, and never auto-resumes', () => {
  const component = read('components/focus/GentleReturnCard.tsx');
  assert.match(component, /AppState\.addEventListener\('change'/);
  assert.match(component, /Date\.now\(\)/);
  assert.match(component, /getGentleBreakRemainingSec/);
  assert.match(component, /setInterval\(updateNow, 500\)/);
  assert.match(component, /clearInterval/);
  assert.match(component, /appStateSubscription\.remove\(\)/);
  assert.match(component, /accessibilityLabel=\{breakComplete[\s\S]*t\.gentleReturn\.breakAnnouncement[\s\S]*t\.gentleReturn\.breakCountdown\(remainingSec\)/);
  assert.match(component, /announcedBreakRef\.current !== breakStartedAt/);
  assert.equal((component.match(/announceForAccessibility/g) ?? []).length, 1);
  assert.doesNotMatch(component, /resumeTimer|startTimer|finishSession|focusRepo/);
  assert.doesNotMatch(component, /AccessibilityLiveRegion|accessibilityLiveRegion/);
});

check('Gentle Return remains scrollable, runtime-only, migration-free, and dependency-free', () => {
  const focusScreen = read('app/(tabs)/focus.tsx');
  const component = read('components/focus/GentleReturnCard.tsx');
  const focusStore = read('store/useFocusStore.ts');
  const focusRepo = read('db/repositories/focusRepo.ts');
  const migrations = read('db/migrations.ts');
  const packageJson = JSON.parse(read('package.json'));
  assert.match(focusScreen, /<ScreenWrapper contentStyle=\{styles\.activeScreen\}>/);
  assert.doesNotMatch(focusScreen, /<ScreenWrapper scrollable=\{false\} contentStyle=\{styles\.activeScreen\}>/);
  assert.match(focusScreen, /minHeight: 44/);
  assert.match(focusScreen, /accessibilityLabel=\{t\.focus\.controls\.iGotDistracted\}/);
  assertCopy(focusScreen, 'I got distracted');
  assert.doesNotMatch(component, /numberOfLines/);
  assert.doesNotMatch(focusStore, /persist\(|AsyncStorage/);
  assert.doesNotMatch(focusRepo, /gentleBreak|distraction|break_/i);
  assert.match(migrations, /const CURRENT_VERSION = 10/);
  assert.doesNotMatch(migrations, /^\s*if \(currentVersion < 11\)/m);
  assert.equal(Object.keys(packageJson.dependencies).length, 13);
});

check('Gentle Return adds no detection, alerts, history, analytics, or punitive copy', () => {
  const userInterfaceSource = [
    read('app/(tabs)/focus.tsx'),
    read('components/focus/GentleReturnCard.tsx'),
  ].join('\n');
  const source = [
    userInterfaceSource,
    read('utils/gentleReturnRules.ts'),
    read('store/useFocusStore.ts'),
  ].join('\n');
  assert.doesNotMatch(
    source,
    /Accelerometer|DeviceMotion|Microphone|Camera|Notifications|Haptics|Vibration|Audio\.|distractionCount|breakHistory|telemetry|analytics/i
  );
  assert.doesNotMatch(
    userInterfaceSource,
    /focus broken|bad focus|ADHD severity|crisis|productivity score|failure/i
  );
  assert.doesNotMatch(source, /setTimeout\([\s\S]*resumeTimer/);
});

check('Low-Stimulation and Gentle Nudges are Profile-owned persisted preferences', () => {
  const appStore = read('store/useAppStore.ts');
  const profile = read('app/(tabs)/profile.tsx');
  const toggle = read('components/profile/PreferenceToggleRow.tsx');
  const persistedSection = appStore.slice(
    appStore.indexOf('partialize:'),
    appStore.indexOf('merge:')
  );

  assert.match(appStore, /lowStimulationMode: false/);
  assert.match(appStore, /gentleNudgesEnabled: false/);
  assert.match(appStore, /setLowStimulationMode/);
  assert.match(appStore, /setGentleNudgesEnabled/);
  assert.match(persistedSection, /lowStimulationMode/);
  assert.match(persistedSection, /gentleNudgesEnabled/);
  assert.match(appStore, /normalizeBooleanPreference/);
  assertCopy(profile, "Study support");
  assertCopy(profile, "Low-stimulation mode");
  assertCopy(profile, en.profile.lowStimModeDesc);
  assert.equal(en.profile.lowStimModeDesc, 'Reduce non-essential visual intensity during active Focus. Core controls stay visible.');
  assertCopy(profile, "Gentle nudges");
  assertCopy(profile, en.profile.gentleNudgesDesc);
  assert.match(en.profile.gentleNudgesDesc, /MedOS does not use this setting yet and sends no reminders or notifications\./);
  assert.match(toggle, /\bSwitch\b/);
  assert.match(toggle, /accessibilityRole="switch"/);
  assert.match(toggle, /accessibilityState=\{\{ checked: value \}\}/);
  assert.match(toggle, /value \? t\.common\.on : t\.common\.off/);
  assert.equal(en.common.on, 'On');
  assert.equal(tr.common.off, 'Kapalı');
  assert.match(toggle, /minHeight: 44/);
  assert.doesNotMatch(profile, /useState/);
});

check('Low-Stimulation presentation is confined to the active Focus workspace', () => {
  const focusScreen = read('app/(tabs)/focus.tsx');
  const dashboard = read('app/(tabs)/index.tsx');
  const checkIn = read('app/study-support/check-in.tsx');
  const recovery = read('app/study-support/recovery.tsx');
  const activeStart = focusScreen.indexOf('if (isActive)');
  const idleStart = focusScreen.indexOf('{t.focus.title}');
  const activeBranch = focusScreen.slice(activeStart, idleStart);
  const idleBranch = focusScreen.slice(idleStart);

  assert.match(
    focusScreen,
    /useAppStore\(\s*\(state\) => state\.lowStimulationMode\s*\)/
  );
  assert.equal((activeBranch.match(/lowStimulation=\{lowStimulationMode\}/g) ?? []).length, 3);
  // Phase 6.1 explicitly allows a quiet just-completed acknowledgement.
  // Idle setup itself must still have no Low-Stimulation variant.
  assert.doesNotMatch(idleBranch.replace(
    '{showVictory && <MiniVictory kind="focus" lowStimulation={lowStimulationMode} />}', ''
  ), /lowStimulation/);
  assert.doesNotMatch(dashboard, /lowStimulationMode|gentleNudgesEnabled/);
  // Phase 6.3 allows only the existing recommendation card's quiet visual prop.
  assert.doesNotMatch(checkIn
    .replace('const lowStimulationMode = useAppStore((state) => state.lowStimulationMode);', '')
    .replace('lowStimulation={lowStimulationMode}', ''), /lowStimulationMode|gentleNudgesEnabled/);
  assert.doesNotMatch(recovery, /lowStimulationMode|gentleNudgesEnabled/);
  assert.doesNotMatch(read('store/useFocusStore.ts'), /lowStimulation|gentleNudges/);
  assert.doesNotMatch(read('store/useStudySupportStore.ts'), /lowStimulation|gentleNudges/);
});

check('Low-Stimulation timer treatment stays neutral while preserving status and context', () => {
  const timer = read('components/focus/TimerDisplay.tsx');
  assert.match(timer, /lowStimulation\?: boolean/);
  assert.match(timer, /active && lowStimulation/);
  assert.match(timer, /variant: 'default' as const, dot: false/);
  assert.match(timer, /colors\.textPrimary/);
    assert.match(timer, /\? 72[\s\S]*: 88[\s\S]*\? 48[\s\S]*: 64/);
  assert.match(timer, /minHeight: 220/);
  assert.match(timer, /elevated=\{!isLowStimulationActive\}/);
  assert.match(timer, /!isLowStimulationActive && \(/);
  assertCopy(timer, 'Planned time is a guide, not a stopping point.');
  assert.match(timer, /label=\{displayedBadge\.label\}/);
  assert.match(timer, /committeeName !== undefined/);
  assert.match(timer, /\{isOvertime \? '\+' : ''\}/);
});

check('Low-Stimulation milestone and Gentle Return variants are visual only', () => {
  const milestone = read('components/focus/EntryMilestone.tsx');
  const gentleReturn = read('components/focus/GentleReturnCard.tsx');
  const controls = read('components/focus/SessionControls.tsx');

  assert.match(milestone, /lowStimulation\?: boolean/);
  assert.match(milestone, /elevated=\{!lowStimulation\}/);
  assert.match(milestone, /!lowStimulation \? \(/);
  assertCopy(milestone, 'Finish here');
  assertCopy(milestone, 'Keep going');
  assert.match(milestone, /t\.focus\.milestone\.continueToDefault\(defaultMinutes\)/);
  assert.equal(en.focus.milestone.continueToDefault(25), 'Continue to 25 min total');

  assert.match(gentleReturn, /lowStimulation\?: boolean/);
  assert.ok((gentleReturn.match(/elevated=\{!lowStimulation\}/g) ?? []).length >= 2);
  assert.ok((gentleReturn.match(/!lowStimulation \? \(/g) ?? []).length >= 2);
  assert.match(gentleReturn, /lowStimulation[\s\S]*colors\.textPrimary/);
  for (const copy of [
    'Return to focus',
    'Take a 2 min break',
    'Stay paused',
    'Not now',
    'Ready when you are.',
  ]) {
    assertCopy(gentleReturn, copy);
  }
  for (const control of ['Pause', 'Resume', 'Finish', 'Cancel session']) {
    assertCopy(controls, control);
  }
  assert.equal(gentleReturnRules.GENTLE_BREAK_DURATION_SEC, 120);
});

check('Neither preference can auto-enable or alter existing study-support rules', () => {
  const profile = read('app/(tabs)/profile.tsx');
  const nonProfileConsumers = [
    read('app/(tabs)/index.tsx'),
    read('app/study-support/check-in.tsx'),
    read('app/study-support/recovery.tsx'),
    read('components/study-support/AdaptiveRecommendationCard.tsx'),
    read('utils/studySupportRules.ts'),
    read('utils/recoveryRules.ts'),
    read('store/useFocusStore.ts'),
    read('store/useStudySupportStore.ts'),
  ].join('\n');

  assert.match(profile, /setLowStimulationMode/);
  assert.match(profile, /setGentleNudgesEnabled/);
  assert.doesNotMatch(
    nonProfileConsumers,
    /setLowStimulationMode|setGentleNudgesEnabled|gentleNudgesEnabled/
  );
  assert.deepEqual(studySupportRules.getAdaptiveRecommendation('low', 'scattered'), {
    durationSec: 120,
    reason: 'A two-minute start may make beginning easier right now.',
  });
  const recoveryActions = recoveryRules.buildIdleRecoveryActions({
    committee: null,
    memory: {
      deckId: 'deck-1',
      deckName: 'Deck',
      availableCardCount: 20,
      selectionReason: 'recently_updated',
    },
    calendar: {
      eventId: 'event-1',
      title: 'Study',
      timingKind: 'future',
      displayedTime: '14:00',
    },
  });
  assert.deepEqual(recoveryActions.map((action) => action.type), [
    'focus',
    'memory',
    'calendar',
  ]);
  assert.equal(recoveryRules.RECOVERY_REVIEW_LIMIT, 5);
});

check('Phase 3.5 adds no notification, background, analytics, theme, schema, or dependency system', () => {
  const phase35Source = [
    read('store/useAppStore.ts'),
    read('utils/preferences.ts'),
    read('app/(tabs)/profile.tsx'),
    read('app/(tabs)/focus.tsx'),
    read('components/profile/PreferenceToggleRow.tsx'),
    read('components/focus/TimerDisplay.tsx'),
    read('components/focus/EntryMilestone.tsx'),
    read('components/focus/GentleReturnCard.tsx'),
  ].join('\n');
  const packageJson = JSON.parse(read('package.json'));
  const migrations = read('db/migrations.ts');

  assert.doesNotMatch(
    phase35Source,
    /from ['"]expo-notifications|Notifications\.[A-Za-z_$]|requestPermissions(?:Async)?\s*\(|scheduleNotification\w*\s*\(|registerForPush\w*\s*\(|TaskManager\.|BackgroundTask\.|Haptics\.|Vibration\.|Audio\./i
  );
  assert.doesNotMatch(
    phase35Source,
    /from ['"][^'"]*(?:analytics|telemetry)|\b(?:analytics|telemetry)\s*\./i
  );
  assert.doesNotMatch(
    phase35Source,
    /overstimulated|ADHD severity|sensory overload detected|cognitive overload|poor attention|attention problem detected/i
  );
  assert.doesNotMatch(read('hooks/useTheme.ts'), /lowStimulation/);
  assert.doesNotMatch(read('theme/colors.ts'), /lowStimulation/);
  assert.doesNotMatch(read('components/ui/Card.tsx'), /lowStimulation/);
  assert.doesNotMatch(read('components/ui/Button.tsx'), /lowStimulation/);
  assert.equal(packageJson.dependencies['expo-notifications'], undefined);
  assert.equal(Object.keys(packageJson.dependencies).length, 13);
  assert.match(migrations, /const CURRENT_VERSION = 10/);
  assert.doesNotMatch(migrations, /^\s*if \(currentVersion < 11\)/m);
});

check('Phase 3.5 Profile controls remain responsive, explicit, and large-text safe', () => {
  const profile = read('app/(tabs)/profile.tsx');
  const toggle = read('components/profile/PreferenceToggleRow.tsx');
  const studySupportIndex = profile.indexOf('t.profile.studySupport');
  const dailyGoalIndex = profile.indexOf('t.profile.dailyFocusGoal');

  assert.ok(studySupportIndex > dailyGoalIndex);
  assert.match(profile, /isLargeTablet && styles\.sectionsWide/);
  assert.match(profile, /<Card style=\{\{ marginTop: spacing\.lg \}\}>[\s\S]*t\.profile\.studySupport/);
  assert.match(toggle, /flex: 1/);
  assert.match(toggle, /minWidth: 0/);
  assert.match(toggle, /minHeight: 64/);
  assert.match(toggle, /hitSlop=\{8\}/);
  assert.match(toggle, /accessibilityHint=\{description\}/);
  assert.doesNotMatch(toggle, /numberOfLines|opacity:/);
});

check('Phase 3.6 final copy is consistent without changing study-support rules', () => {
  const recommendation = read('components/study-support/AdaptiveRecommendationCard.tsx');
  const reviewControls = read('components/memory/ReviewControls.tsx');
  const reviewSummary = read('components/memory/ReviewSummary.tsx');
  const profile = read('app/(tabs)/profile.tsx');

  assertCopy(recommendation, "Start small · 2 min");
  assert.doesNotMatch(recommendation, /Start 2 min/);
  assertCopy(reviewControls, "Not recalled this time");
  assertCopy(reviewControls, "Recalled with effort");
  assert.match(reviewControls, /label: t\.review\.ratings\.good,\s*hint: t\.review\.ratingAccessibility\.good/);
  assertCopy(reviewControls, 'Recalled');
  assertCopy(reviewControls, "Recalled quickly");
  assertCopy(reviewSummary, "Ratings are saved locally.");
  assert.match(reviewSummary, /label=\{t\.review\.reviewAgain\}/);
  assertCopy(reviewSummary, 'Review again');
  assert.doesNotMatch(reviewSummary, /Review Again/);
  assertCopy(profile, "Low-stimulation mode");
  assertCopy(profile, en.profile.gentleNudgesDesc);
  assert.equal(en.profile.gentleNudgesDesc, 'Save your preference for softer in-app prompts. MedOS does not use this setting yet and sends no reminders or notifications.');
  assert.deepEqual(studySupportRules.getAdaptiveRecommendation('low', 'scattered'), {
    durationSec: 120,
    reason: 'A two-minute start may make beginning easier right now.',
  });
});

check('Phase 3.6 review exits are destination-aware and direct-route safe', () => {
  const review = read('app/decks/[id]/review.tsx');
  const summary = read('components/memory/ReviewSummary.tsx');

  assert.match(review, /recoveryMode \? t\.review\.backToLighterPlan : t\.review\.backToDeck/);
  assertCopy(review, 'Back to lighter plan');
  assertCopy(review, 'Back to deck');
  assert.match(review, /router\.canGoBack\(\)/);
  assert.match(review, /router\.back\(\)/);
  assert.match(review, /'\/study-support\/recovery' as Href/);
  assert.match(review, /`\/decks\/\$\{id\}` as Href/);
  assert.match(review, /doneLabel=\{backLabel\}/);
  assertCopy(summary, "doneLabel ?? t.review.backToDeck");
  assert.match(review, /!recoveryMode && !dueMode && deck \? \(/);
  assertCopy(review, "Return to Lighter plan to choose another small step.");
  assert.doesNotMatch(review, /Back to Deck/);
});

check('Phase 3.6 review accessibility and large-text layout remain usable', () => {
  const review = read('app/decks/[id]/review.tsx');
  const completeBranch = review.slice(
    review.indexOf("if (reviewStatus === 'complete')"),
    review.indexOf('if (!card)')
  );

  assert.match(review, /accessibilityRole="button"[\s\S]*accessibilityLabel=\{backLabel\}/);
  assert.match(review, /height: 44/);
  assert.match(review, /width: 44/);
  assert.match(review, /numberOfLines=\{2\}/);
  assert.match(review, /accessibilityElementsHidden/);
  assert.match(completeBranch, /<ScreenWrapper includeBottomSafeArea/);
  assert.doesNotMatch(completeBranch, /scrollable=\{false\}/);
});

check('Phase 3.6 Calendar back behavior is accessible and direct-route safe', () => {
  const detail = read('app/calendar/[id].tsx');

  assert.match(detail, /function handleBack\(\)/);
  assert.match(detail, /router\.canGoBack\(\)/);
  assert.match(detail, /router\.back\(\)/);
  assert.match(detail, /router\.replace\('\/\(tabs\)\/calendar' as Href\)/);
  assert.match(detail, /accessibilityRole="button"[\s\S]*accessibilityLabel=\{t.sweep.back\}/);
  assert.match(detail, /minHeight: 44/);
  assert.match(detail, /minWidth: 44/);
});

check('Phase 3.6 standalone routes opt into bottom safe area without changing tabs', () => {
  const wrapper = read('components/layout/ScreenWrapper.tsx');
  const checkIn = read('app/study-support/check-in.tsx');
  const recovery = read('app/study-support/recovery.tsx');
  const review = read('app/decks/[id]/review.tsx');
  const calendarDetail = read('app/calendar/[id].tsx');
  const tabScreens = [
    read('app/(tabs)/index.tsx'),
    read('app/(tabs)/focus.tsx'),
    read('app/(tabs)/memory.tsx'),
    read('app/(tabs)/calendar.tsx'),
    read('app/(tabs)/profile.tsx'),
  ].join('\n');

  assert.match(wrapper, /includeBottomSafeArea\?: boolean/);
  assert.match(wrapper, /includeBottomSafeArea = false/);
  assert.match(wrapper, /\['top', 'right', 'bottom', 'left'\]/);
  assert.match(wrapper, /\['top', 'left', 'right'\]/);
  assert.match(checkIn, /includeBottomSafeArea/);
  assert.match(recovery, /includeBottomSafeArea/);
  assert.match(review, /includeBottomSafeArea/);
  assert.match(calendarDetail, /includeBottomSafeArea/);
  assert.doesNotMatch(tabScreens, /includeBottomSafeArea/);
  assert.doesNotMatch(recovery, /useSafeAreaInsets|insets\.bottom/);
});

check('Phase 3.6 Recovery refresh and listeners are scoped to screen focus', () => {
  const recovery = read('app/study-support/recovery.tsx');
  const focusEffectCount = (recovery.match(/useFocusEffect\(/g) ?? []).length;

  assert.ok(focusEffectCount >= 4);
  assert.match(recovery, /useFocusEffect\([\s\S]*AppState\.addEventListener\('change'/);
  assert.match(recovery, /useFocusEffect\([\s\S]*calendarRefreshAt[\s\S]*setTimeout/);
  assert.match(recovery, /useFocusEffect\([\s\S]*BackHandler\.addEventListener/);
  assert.doesNotMatch(recovery, /setInterval/);
  assert.match(recovery, /buildIdleRecoveryActions/);
  assert.deepEqual(recoveryRules.buildIdleRecoveryActions({ committee: null, memory: null, calendar: null })[0], {
    type: 'focus',
    committee: null,
  });
  assert.equal(recoveryRules.RECOVERY_REVIEW_LIMIT, 5);
});

check('Phase 3.6 Check-In uses radio semantics without changing selection behavior', () => {
  const choices = read('components/study-support/CheckInChoiceGroup.tsx');
  const recommendation = read('components/study-support/AdaptiveRecommendationCard.tsx');

  assert.match(choices, /accessibilityRole="radiogroup"/);
  assert.match(choices, /accessibilityRole="radio"/);
  assert.match(choices, /accessibilityState=\{\{ checked: isSelected \}\}/);
  assert.match(choices, /onPress=\{\(\) => onSelect\(choice\.value\)\}/);
  assert.match(recommendation, /accessibilityRole="radiogroup"/);
  assert.match(recommendation, /accessibilityRole="radio"/);
  assert.match(recommendation, /accessibilityState=\{\{ checked: isSelected \}\}/);
  assert.match(recommendation, /onPress=\{\(\) => onSelectDuration\(durationSec\)\}/);
});

check('Phase 3.6 timer is semantically labelled and fits large text without live updates', () => {
  const timer = read('components/focus/TimerDisplay.tsx');
  const typography = read('components/ui/Typography.tsx');

  assert.match(timer, /getTimerAccessibilityLabel/);
  assert.match(timer, /t\.focus\.timerRunning\(duration\)/);
  assert.equal(en.focus.timerRunning('12 minutes'), 'Focus running, 12 minutes remaining');
  assert.match(timer, /t\.focus\.timerPaused\(duration\)/);
  assert.equal(en.focus.timerPaused('8 minutes'), 'Focus paused, 8 minutes remaining');
  assert.match(timer, /t\.focus\.timerOvertime\(duration\)/);
  assert.equal(en.focus.timerOvertime('3 minutes'), 'Focus overtime, 3 minutes');
  assert.match(timer, /accessibilityLabel=\{getTimerAccessibilityLabel\(status, displaySec, isOvertime, t\)\}/);
  assert.match(timer, /adjustsFontSizeToFit/);
  assert.match(timer, /minimumFontScale=\{0\.55\}/);
  assert.match(timer, /numberOfLines=\{1\}/);
  assert.doesNotMatch(timer, /accessibilityLiveRegion|AccessibilityLiveRegion/);
  assert.match(typography, /adjustsFontSizeToFit\?: boolean/);
  assert.match(typography, /minimumFontScale\?: number/);
});

check('Phase 3.6 contrast corrections use readable shared and selected-state colors', () => {
  const colors = read('theme/colors.ts');
  const button = read('components/ui/Button.tsx');
  const badge = read('components/ui/Badge.tsx');
  const choices = read('components/study-support/CheckInChoiceGroup.tsx');
  const recommendation = read('components/study-support/AdaptiveRecommendationCard.tsx');
  const profile = read('app/(tabs)/profile.tsx');

  assert.match(colors, /textMuted: '#7C8BA1'/);
  assert.match(colors, /textInverse: '#000000'/);
  assert.match(button, /ghost:\s+colors\.textSecondary/);
  assert.match(badge, /primary: colors\.textPrimary/);
  assert.match(choices, /isSelected \? colors\.textPrimary : undefined/);
  assert.match(recommendation, /isSelected \? colors\.textPrimary : undefined/);
  assert.match(profile, /color=\{colors\.textPrimary\}/);
});

check('Phase 3.6 adds no feature state, notification, analytics, schema, dependency, or Phase 4 work', () => {
  const closureSource = [
    read('app/study-support/check-in.tsx'),
    read('app/study-support/recovery.tsx'),
    read('app/decks/[id]/review.tsx'),
    read('app/calendar/[id].tsx'),
    read('components/focus/TimerDisplay.tsx'),
    read('components/memory/ReviewControls.tsx'),
    read('components/memory/ReviewSummary.tsx'),
  ].join('\n');
  const stores = [
    read('store/useFocusStore.ts'),
    read('store/useStudySupportStore.ts'),
    read('store/useAppStore.ts'),
    read('store/useMemoryStore.ts'),
  ].join('\n');
  const migrations = read('db/migrations.ts');
  const packageJson = JSON.parse(read('package.json'));

  assert.doesNotMatch(
    closureSource,
    /expo-notifications|Notifications\.|TaskManager\.|BackgroundTask\.|analytics|telemetry|automatic distraction detection/i
  );
  assert.doesNotMatch(stores, /phase36|phase3Closure|accessibilityHistory/i);
  assert.match(migrations, /const CURRENT_VERSION = 10/);
  assert.doesNotMatch(migrations, /^\s*if \(currentVersion < 11\)/m);
  assert.equal(Object.keys(packageJson.dependencies).length, 13);
  assert.equal(packageJson.dependencies['expo-notifications'], undefined);
  assert.equal(packageJson.dependencies['expo-task-manager'], undefined);
  assert.doesNotMatch(closureSource, /subjectId|topicId|spaced repetition|reward points|artificial intelligence/i);
  assert.equal(gentleReturnRules.GENTLE_BREAK_DURATION_SEC, 120);
  assert.doesNotMatch(read('components/focus/GentleReturnCard.tsx'), /setTimeout\([\s\S]*resumeTimer/);
});

check('English and Turkish catalogs have matching, non-empty typed leaves', () => {
  function compare(a, b, prefix = '') {
    assert.deepEqual(Object.keys(b).sort(), Object.keys(a).sort(), prefix);
    for (const key of Object.keys(a)) {
      const field = `${prefix}.${key}`;
      assert.equal(typeof b[key], typeof a[key], field);
      if (typeof a[key] === 'object') compare(a[key], b[key], field);
      else if (typeof a[key] === 'string') assert.ok(b[key].trim().length > 0, field);
      else assert.equal(typeof a[key], 'function', field);
    }
  }
  compare(en, tr);
  for (const locale of [en, tr]) {
    const reviewCopy = JSON.stringify({ memory: locale.memory, review: locale.review });
    assert.doesNotMatch(reviewCopy, /spaced repetition|\bdue\b|show sooner|show later|aralıklı tekrar|daha erken göster|daha geç göster/i);
  }
  const i18n = loadTypeScript('i18n/index.ts', {
    './en': { default: en, __esModule: true },
    './tr': { default: tr, __esModule: true },
    './studySupport': supportTranslation,
    '@/utils/preferences': preferences,
    '@/store/useAppStore': { useAppStore: (select) => select({ language: 'tr' }) },
  });
  assert.equal(i18n.useTranslation(), tr);
  assert.equal(i18n.getTranslation(null), en);
  assert.equal(i18n.getTranslation('invalid'), en);
});

// Render these presentation components into plain element trees; no native UI,
// effects, timers, or persistence are executed. Physical QA remains separate.
function renderLocalized(file, exportName, locale, props) {
  const react = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useState: (initial) => [typeof initial === 'function' ? initial() : initial, () => {}],
    useRef: (initial) => ({ current: initial }),
    useEffect: () => {},
  };
  const component = loadTypeScript(file, {
    react,
    'react-native': { StyleSheet: { create: (styles) => styles }, View: 'View', Pressable: 'Pressable', Switch: 'Switch', TouchableOpacity: 'TouchableOpacity' },
    '@expo/vector-icons': { Feather: 'Feather' },
    '@/components/ui/Badge': { Badge: 'Badge' },
    '@/components/ui/Button': { Button: 'Button' },
    '@/components/ui/Card': { Card: 'Card' },
    '@/components/ui/Typography': { AppText: 'AppText' },
    '@/hooks/useTheme': { useTheme: () => ({ colors: {}, spacing: {}, radius: {} }) },
    '@/hooks/useResponsive': { useResponsive: () => ({ isTablet: false }) },
    '@/utils/dashboardRules': dashboardRules,
    '@/utils/calendarDate': calendarDate,
    '@/utils/gentleReturnRules': gentleReturnRules,
    '@/utils/studySupportRules': studySupportRules,
    '@/i18n': { useTranslation: () => locale, ...supportTranslation },
    '@/i18n/errors': errorTranslation,
  })[exportName];
  const nodes = [];
  function visit(node) {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!node || typeof node !== 'object') return;
    nodes.push(node);
    visit(node.props.children);
  }
  visit(component(props));
  return nodes;
}

check('Localized review summary keeps truthful copy and destination/action wiring', () => {
  for (const locale of [en, tr]) {
    const onDone = () => {};
    const onReviewAgain = () => {};
    const nodes = renderLocalized('components/memory/ReviewSummary.tsx', 'ReviewSummary', locale, {
      summary: { reviewed: 3, again: 1, hard: 1, good: 1, easy: 0 },
      onDone, onReviewAgain, doneLabel: locale.review.backToLighterPlan,
    });
    const buttons = nodes.filter((node) => node.type === 'Button');
    assert.equal(buttons[0].props.label, locale.review.backToLighterPlan);
    assert.equal(buttons[0].props.onPress, onDone);
    assert.equal(buttons[1].props.label, locale.review.reviewAgain);
    assert.equal(buttons[1].props.onPress, onReviewAgain);
    assert.ok(nodes.some((node) => node.props.children.includes(locale.review.sessionDoneDesc)));
  }
});

check('Localized Gentle Return retains paused/break actions and neutral low-stimulation copy', () => {
  for (const locale of [en, tr]) {
    for (const [status, breakStartedAt] of [['running', null], ['paused', null], ['paused', Date.now() - 130_000]]) {
      const onReturn = () => {};
      const onStayPaused = () => {};
      const onStartBreak = () => {};
      const onDismiss = () => {};
      const nodes = renderLocalized('components/focus/GentleReturnCard.tsx', 'GentleReturnCard', locale, {
        status, breakStartedAt, error: null, lowStimulation: true,
        onReturn, onStayPaused, onStartBreak, onDismiss,
      });
      const buttons = nodes.filter((node) => node.type === 'Button');
      assert.equal(buttons[0].props.onPress, onReturn);
      if (status === 'running') {
        assert.deepEqual(buttons.map((node) => node.props.label), [locale.gentleReturn.returnToFocus, locale.gentleReturn.takeTwoMinBreak, locale.gentleReturn.notNow]);
        assert.equal(buttons[1].props.onPress, onStartBreak);
        assert.equal(buttons[2].props.onPress, onDismiss);
      } else {
        assert.deepEqual(buttons.map((node) => node.props.label), [locale.gentleReturn.returnToFocus, locale.gentleReturn.stayPaused]);
        assert.equal(buttons[1].props.onPress, onStayPaused);
      }
      if (breakStartedAt !== null) {
        assert.ok(nodes.some((node) => node.props.children.includes(locale.gentleReturn.breakOver)));
        assert.ok(nodes.some((node) => node.props.children.includes(locale.gentleReturn.breakOverBody)));
      }
    }
  }
});

check('Localized timer labels preserve paused overtime semantics and user Committee names', () => {
  for (const locale of [en, tr]) {
    const committeeName = 'USER CONTENT: Kalp / Heart';
    const nodes = renderLocalized('components/focus/TimerDisplay.tsx', 'TimerDisplay', locale, {
      status: 'paused', displaySec: 180, isOvertime: true, active: true,
      lowStimulation: true, committeeName,
    });
    assert.ok(nodes.some((node) => node.props.accessibilityLabel === locale.focus.timerPausedOvertime(locale.time.minutes(3))));
    assert.ok(nodes.some((node) => node.props.children.includes(committeeName)));
    assert.ok(nodes.every((node) => node.props.accessibilityLiveRegion === undefined));
  }
});

check('All existing recommendation reasons and support notices translate without changing state', () => {
  for (const [message, translated] of Object.entries(tr.studySupportMessages)) {
    assert.equal(supportTranslation.translateStudySupportMessage(message, en), message);
    assert.equal(supportTranslation.translateStudySupportMessage(message, tr), translated);
    assert.notEqual(translated, message);
  }
  for (const energy of ['low', 'steady', 'good']) {
    for (const attention of ['scattered', 'okay', 'focused']) {
      const recommendation = studySupportRules.getAdaptiveRecommendation(energy, attention);
      assert.ok(Object.hasOwn(tr.studySupportMessages, recommendation.reason));
    }
  }
  for (const unknown of ['USER: Kalp / Heart', '__proto__', 'constructor', 'toString']) {
    assert.equal(supportTranslation.translateStudySupportMessage(unknown, tr), unknown);
  }
  const checkIn = read('app/study-support/check-in.tsx');
  const recovery = read('app/study-support/recovery.tsx');
  assert.match(checkIn, /\[clearCommitteeContext, committeeHint, setCommitteeContext, setContextError\]/);
  assert.match(checkIn, /\[loadCommitteeContext, resetCheckIn\]/);
  assert.match(recovery, /\[committeeHint, committeeOptedOut\]/);
  for (const expression of ['actionNotice', 'committeeState.message', 'committeeState.notice']) {
    assert.ok(recovery.includes(`translateStudySupportMessage(${expression}, t)`));
  }
});

check('Bilingual recommendations preserve every duration, explicit start, and universal Lighter Plan entry', () => {
  for (const locale of [en, tr]) {
    for (const energy of ['low', 'steady', 'good']) {
      for (const attention of ['scattered', 'okay', 'focused']) {
        const recommendation = studySupportRules.getAdaptiveRecommendation(energy, attention);
        const before = JSON.stringify(recommendation);
        let starts = 0;
        const onStart = () => { starts += 1; };
        const onOpenRecovery = () => {};
        const nodes = renderLocalized('components/study-support/AdaptiveRecommendationCard.tsx', 'AdaptiveRecommendationCard', locale, {
          energy, attention, recommendation, selectedDurationSec: recommendation.durationSec,
          committeeName: 'USER: Kalp / Heart', contextError: null,
          onSelectDuration: () => {}, onStart, onOpenRecovery,
        });
        assert.equal(starts, 0);
        assert.equal(JSON.stringify(recommendation), before);
        const start = nodes.find((node) => node.type === 'Button' && node.props.onPress === onStart);
        assert.equal(start.props.label, recommendation.durationSec === 120
          ? locale.recovery.smallStart : locale.adaptiveRec.startFocus(recommendation.durationSec / 60));
        const lighter = nodes.find((node) => node.type === 'Button' && node.props.onPress === onOpenRecovery);
        assert.equal(lighter.props.label, locale.adaptiveRec.chooseLighterPlan);
        assert.equal(lighter.props.variant, 'ghost');
        assert.ok(nodes.some((node) => node.props.children.includes('USER: Kalp / Heart')));
        assert.ok(nodes.some((node) => node.props.children.includes(supportTranslation.translateStudySupportMessage(recommendation.reason, locale))));
        const radios = nodes.filter((node) => node.props.accessibilityRole === 'radio');
        assert.equal(radios.length, 4);
        assert.equal(radios.filter((node) => node.props.accessibilityState.checked).length, 1);
      }
    }
  }
});

check('Check-In radio labels use the selected language without duplicate spoken selection text', () => {
  for (const locale of [en, tr]) {
    const nodes = renderLocalized('components/study-support/CheckInChoiceGroup.tsx', 'CheckInChoiceGroup', locale, {
      title: locale.checkIn.energyTitle,
      choices: Object.entries(locale.checkIn.energy).map(([value, label]) => ({ value, label })),
      selected: 'low', onSelect: () => {},
    });
    const radios = nodes.filter((node) => node.props.accessibilityRole === 'radio');
    assert.equal(radios[0].props.accessibilityLabel, locale.checkIn.energy.low);
    assert.equal(radios[0].props.accessibilityState.checked, true);
    assert.equal(radios[1].props.accessibilityState.checked, false);
    assert.ok(nodes.some((node) => node.props.accessibilityRole === 'radiogroup' && node.props.accessibilityLabel === locale.checkIn.energyTitle));
  }
});


check('Dashboard bilingual Quick Start preserves names, explicit actions and recommendation priority', () => {
  const name = 'USER Exam starts Committee removed';
  const committee = { id: 'c', name, status: 'active', daysToExam: 1 };
  const weak = { deckId: 'd', deckName: name, attentionCount: 2 };
  const manual = { title: name, time: '14:30', committeeId: 'c' };
  for (const locale of [en, tr]) {
    const cases = [
      [dashboardRules.buildQuickStart(manual, committee, weak), locale.dashboard.manualDetail('14:30'), locale.dashboard.start25],
      [dashboardRules.buildQuickStart({ ...manual, time: null }, committee, weak), locale.dashboard.manualDetail(null), locale.dashboard.start25],
      [dashboardRules.buildQuickStart(null, committee, weak), locale.dashboard.committeeDetail(1), locale.dashboard.start25],
      [dashboardRules.buildQuickStart(null, { ...committee, daysToExam: 31 }, weak), locale.dashboard.memoryDetail(2), locale.dashboard.reviewCards],
      [dashboardRules.buildQuickStart(null, null, null), locale.dashboard.genericDetail, locale.dashboard.start25],
      [{ kind: 'continue_focus', title: locale.dashboard.pausedTitle, detail: locale.dashboard.pausedDetail }, locale.dashboard.pausedDetail, locale.recovery.continueFocus],
    ];
    for (const [recommendation, detail, action] of cases) {
      let invoked = 0;
      const onAction = () => { invoked++; };
      const onStartSmall = recommendation.kind === 'continue_focus' ? undefined : () => {};
      const onCheckIn = onStartSmall;
      const before = JSON.stringify(recommendation);
      const nodes = renderLocalized('components/dashboard/QuickStartCard.tsx', 'QuickStartCard', locale,
        { recommendation, onAction, onStartSmall, onCheckIn });
      assert.equal(invoked, 0);
      assert.equal(JSON.stringify(recommendation), before);
      assert.ok(nodes.some(n => n.props.children.includes(detail)));
      if (['manual_focus', 'committee_focus', 'memory_review'].includes(recommendation.kind))
        assert.ok(nodes.some(n => n.props.children.includes(name)));
      const buttons = nodes.filter(n => n.type === 'Button');
      assert.equal(buttons[0].props.label, action);
      assert.equal(buttons[0].props.onPress, onAction);
      assert.equal(buttons.length, onStartSmall ? 3 : 1);
      if (onStartSmall) {
        assert.equal(buttons[1].props.accessibilityLabel, locale.dashboard.smallStartHint);
        assert.equal(buttons[2].props.accessibilityLabel, locale.dashboard.checkInHint);
        assert.equal(buttons[2].props.variant, 'ghost');
      }
    }
  }
});

check('Dashboard agenda localizes generated titles but never user content or navigation targets', () => {
  const today = '2026-09-05';
  const now = new Date(2026, 8, 5, 12).getTime();
  const name = 'USER Exam starts Committee removed';
  const sources = [
    { event: { id: 'm', title: name, date: today, startTime: null, endTime: null, committeeId: 'c' }, committeeName: name },
    { event: { id: 'deleted', title: name, date: today, startTime: null, endTime: null, committeeId: 'gone' }, committeeName: null },
  ];
  const built = dashboardRules.buildTodayAgenda(sources, [{ id: 'c', name, startDate: now, examDate: now }], today, now);
  const start = dashboardRules.buildTodayAgenda([], [{ id: 's', name, startDate: now, examDate: now + 86400000 }], today, now).items[0];
  for (const locale of [en, tr]) {
    const items = [...built.items, start];
    const onOpenItem = () => {};
    const nodes = renderLocalized('components/dashboard/TodayAgenda.tsx', 'TodayAgenda', locale,
      { items, total: 4, onOpenItem, onOpenCalendar: () => {} });
    const labels = nodes.filter(n => n.props.accessibilityRole === 'button').map(n => n.props.accessibilityLabel);
    assert.ok(labels.includes(locale.dashboard.openItem(locale.dashboard.agendaTypes.committee_exam, locale.dashboard.examTitle(name))));
    assert.ok(labels.includes(locale.dashboard.openItem(locale.dashboard.agendaTypes.committee_start, locale.dashboard.startTitle(name))));
    assert.ok(labels.includes(locale.dashboard.openItem(locale.dashboard.agendaTypes.manual, name)));
    assert.ok(nodes.some(n => n.props.children.includes(name)));
    assert.ok(nodes.some(n => n.props.children.includes(locale.dashboard.committeeRemoved)));
    const empty = renderLocalized('components/dashboard/TodayAgenda.tsx', 'TodayAgenda', locale,
      { items: [], total: 0, error: 'RAW ERROR', onOpenItem, onOpenCalendar: () => {} });
    assert.ok(empty.some(n => n.props.children.includes(locale.dashboard.agendaError)));
    assert.ok(empty.some(n => n.props.children.includes(locale.dashboard.openDay)));
    assert.ok(empty.every(n => !n.props.children.includes('RAW ERROR')));
  }
});

check('Dashboard metrics and Committee states use localized counts, errors and accessibility', () => {
  for (const locale of [en, tr]) {
    for (const count of [0, 1, 2]) {
      const nodes = renderLocalized('components/dashboard/TodayMetrics.tsx', 'TodayMetrics', locale, {
        focus: { completedSessions: count, totalSeconds: 3660 },
        memory: { reviewCount: count, decksReviewed: count, againCount: count, hardCount: 0 },
        onOpenFocus: () => {}, onOpenMemory: () => {},
      });
      assert.ok(nodes.some(n => n.props.accessibilityLabel === locale.dashboard.openFocus));
      assert.ok(nodes.some(n => n.props.accessibilityLabel === locale.dashboard.openMemory));
      assert.ok(nodes.some(n => n.props.children.includes(count ? locale.dashboard.completed(count) : locale.dashboard.noCompleted)));
      assert.ok(nodes.some(n => n.props.children.includes(count ? locale.dashboard.reviewSummary(count, count) : locale.dashboard.noReviews)));
    }
    const unavailable = renderLocalized('components/dashboard/TodayMetrics.tsx', 'TodayMetrics', locale,
      { focus: null, memory: null, focusError: 'RAW ERROR', memoryError: 'RAW ERROR' });
    assert.equal(unavailable.filter(n => n.props.children.includes(locale.dashboard.summaryUnavailable)).length, 2);
    for (const status of ['active', 'upcoming', 'recently_completed']) {
      const committee = { id: 'c', name: 'USER NAME', color: '#000', status, daysToExam: status === 'recently_completed' ? -2 : 1, examDate: Date.now() };
      const nodes = renderLocalized('components/dashboard/CommitteeOverviewCard.tsx', 'CommitteeOverviewCard', locale,
        { committee, onOpen: () => {}, onCreate: () => {} });
      assert.ok(nodes.some(n => n.props.label === locale.dashboard.committeeStatuses[status]));
      assert.ok(nodes.some(n => n.props.accessibilityLabel === locale.dashboard.openCommittee(committee.name)));
      assert.ok(nodes.some(n => n.props.children.includes(locale.dashboard.examTiming(committee.daysToExam, status === 'recently_completed'))));
    }
    for (const error of [undefined, 'RAW ERROR']) {
      const nodes = renderLocalized('components/dashboard/CommitteeOverviewCard.tsx', 'CommitteeOverviewCard', locale,
        { committee: null, error, onCreate: () => {} });
      assert.ok(nodes.some(n => n.props.children.includes(error ? locale.dashboard.committeeError : locale.dashboard.firstCommittee)));
    }
  }
});

check('Dashboard date/duration/copy coverage preserves responsive layout and frozen domain rules', () => {
  for (const [seconds, expected] of [[0, '0 dk'], [1, '<1 dk'], [60, '1 dk'], [3599, '1 sa'], [3660, '1 sa 1 dk']]) {
    assert.equal(tr.dashboard.duration(dashboardRules.formatDashboardDuration(seconds)), expected);
    assert.equal(en.dashboard.duration(dashboardRules.formatDashboardDuration(seconds)), dashboardRules.formatDashboardDuration(seconds));
  }
  assert.equal(en.dashboard.completed(1), '1 completed session');
  assert.equal(en.dashboard.reviews(2), '2 reviews');
  assert.equal(tr.dashboard.examTiming(0, false), 'Sınav bugün');
  const screen = read('app/(tabs)/index.tsx');
  assert.match(screen, /toLocaleDateString\(t.dashboard.locale/);
  assert.match(screen, /t.dashboard.greeting\(getDashboardGreeting\(\)\)/);
  assert.match(screen, /t.dashboard.partialError/);
  assert.doesNotMatch(screen, /t.common.noData/);
  assert.match(screen, /useDashboardRefresh\(isDBReady, refresh\)/);
  assert.match(screen, /isLargeTablet \?/);
  assert.match(screen, /onCheckIn=\{timerStatus === 'idle'/);
  for (const file of ['app/(tabs)/index.tsx', ...['QuickStartCard', 'TodayAgenda', 'TodayMetrics', 'CommitteeOverviewCard'].map(n => 'components/dashboard/' + n + '.tsx')]) {
    const source = read(file);
    assert.match(source, /useTranslation/);
    assert.doesNotMatch(source, /(?:label|accessibilityLabel|accessibilityHint)="[A-Za-z]/);
    assert.doesNotMatch(source, /<AppText\b[^>]*>\s*[A-Za-z][^<{]*</);
  }
  const rules = read('utils/dashboardRules.ts');
  assert.match(rules, /committee.daysToExam <= 30/);
  assert.match(rules, /shiftLocalDateKey\(date, -6\)/);
  assert.match(rules, /items.slice\(0, 3\)/);
  assert.match(read('db/repositories/dashboardRepo.ts'), /getWeakDeck/);
});

check('Full localization catalogs have recursive EN/TR key, type and interpolation-parameter parity', () => {
  function compare(a, b, key) {
    assert.equal(typeof a, typeof b, key);
    if (typeof a === 'function') {
      const params = fn => {
        const source = ts.createSourceFile('copy.ts', `const f = ${fn.toString()}`, ts.ScriptTarget.Latest, true);
        return source.statements[0].declarationList.declarations[0].initializer.parameters.map(p => p.name.getText(source));
      };
      assert.deepEqual(params(a), params(b), key);
    } else if (a && typeof a === 'object') {
      assert.deepEqual(Object.keys(a).sort(), Object.keys(b).sort(), key);
      for (const part of Object.keys(a)) compare(a[part], b[part], `${key}.${part}`);
    } else assert.ok(typeof b !== 'string' || b.trim().length > 0, key);
  }
  compare(en, tr, 'locale');
});

check('All screen/component static translation references exist; literal UI copy uses catalogs', () => {
  for (const folder of ['app', 'components']) {
    for (const file of fs.readdirSync(path.join(root, folder), { recursive: true }).filter(f => /\.tsx?$/.test(f))) {
      const filename = `${folder}/${file}`, source = read(filename);
      const tree = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
      function visit(node) {
        if (ts.isPropertyAccessExpression(node)) {
          const parts = []; let current = node;
          while (ts.isPropertyAccessExpression(current)) { parts.unshift(current.name.text); current = current.expression; }
          if (ts.isIdentifier(current) && current.text === 't') {
            for (const locale of [en, tr]) {
              let value = locale;
              for (const part of parts) { assert.ok(value != null && part in Object(value), `${filename}: t.${parts.join('.')}`); value = value[part]; }
            }
          }
        }
        if (ts.isJsxText(node)) assert.doesNotMatch(node.text.trim(), /[A-Za-z]/, `${filename}: literal JSX text`);
        if (ts.isJsxAttribute(node) && ['label', 'title', 'placeholder', 'accessibilityLabel', 'accessibilityHint'].includes(node.name.text)
          && node.initializer && ts.isStringLiteral(node.initializer)) assert.doesNotMatch(node.initializer.text, /[A-Za-z]/, `${filename}: ${node.name.text}`);
        ts.forEachChild(node, visit);
      }
      visit(tree);
    }
  }
});

check('Calendar generated copy localizes at render time while raw user names and descriptions stay intact', () => {
  const timeline = loadTypeScript('utils/calendarTimeline.ts', { './calendarDate': calendarDate });
  const name = 'Committee removed / Kalp — O\'Brien';
  const at = new Date(2026, 8, 6, 12).getTime();
  const items = timeline.buildCalendarItems({
    startDate: '2026-09-01', endDateExclusive: '2026-10-01',
    manualEvents: [{ event: { id: 'e', title: name, description: name, committeeId: null, date: '2026-09-06', startTime: null }, committeeName: null }],
    committeeDates: [{ id: 'c', name, startDate: at, examDate: at }],
    focusSessions: [{ id: 'f', startedAt: at, actualSec: 3660, committeeId: 'c', committeeName: name }],
    memoryReviews: [{ deckId: 'd', deckName: name, reviewedAt: at }],
  });
  assert.equal(items.length, 5);
  for (const locale of [en, tr]) {
    for (const item of items) {
      const nodes = renderLocalized('components/calendar/TimelineItemRow.tsx', 'TimelineItemRow', locale, { item });
      assert.ok(nodes.some(n => n.props.label === locale.sweep.timelineTypes[item.type]));
      const expected = item.type === 'manual' ? name : item.type === 'committee_start' ? locale.dashboard.startTitle(name)
        : item.type === 'committee_exam' ? locale.dashboard.examTitle(name) : item.type === 'focus' ? locale.sweep.focusTitle(name) : locale.sweep.memoryTitle(name);
      assert.ok(nodes.some(n => n.props.children.includes(expected)), item.type);
    }
  }
  assert.equal(calendarDate.formatMonthLabel('2026-09-01', 'tr-TR'), 'Eylül 2026');
  assert.match(calendarDate.formatAgendaDate('2026-09-06', 'tr-TR'), /Eylül/);
  assert.equal(en.sweep.items(1), '1 item'); assert.equal(en.sweep.items(2), '2 items');
  assert.equal(tr.sweep.items(2), '2 öğe');
  assert.equal(en.sweep.focused(3660), '1h 1m focused'); assert.equal(tr.sweep.focused(3660), '1 sa 1 dk odaklanma');
});

check('System error localization follows active language without mutating diagnostics or user data', () => {
  for (const key of Object.keys(en.systemErrors)) {
    assert.equal(errorTranslation.translateError(key, tr), tr.systemErrors[key]);
    assert.ok(Object.values(en.systemErrors).includes(errorTranslation.translateError(tr.systemErrors[key], en)));
  }
  assert.equal(errorTranslation.translateError('driver diagnostic', tr), tr.sweep.operationError);
  assert.equal(errorTranslation.translateError(en.sweep.frontRequired, tr), tr.sweep.frontRequired);
  assert.equal(errorTranslation.translateError(tr.sweep.frontRequired, en), en.sweep.frontRequired);
  const name = 'Türkçe / English O\'Brien';
  for (const locale of [en, tr]) {
    assert.ok(locale.sweep.deleteDeckBody(name).includes(name));
    assert.ok(locale.sweep.deleteEventBody(name).includes(name));
    assert.ok(locale.sweep.openCommittee(name, 'STATUS', 'DAYS').includes(name));
  }
});

check('Localization preserves persisted stores, schema, SRS, evidence, recommendations and Exam Plan rules', () => {
  const { execFileSync } = require('node:child_process');
  for (const file of ['db/migrations.ts', 'package.json', 'package-lock.json', 'store/useAppStore.ts',
    'store/useFocusStore.ts', 'store/useMemoryStore.ts', 'store/useStudySupportStore.ts',
    'utils/memoryScheduling.ts', 'utils/examPlanRules.ts', 'utils/studySupportRules.ts', 'utils/recoveryRules.ts',
    'utils/topicEvidenceRules.ts', 'utils/subjectEvidenceRules.ts', 'utils/committeeEvidenceRules.ts',
    'db/repositories/memoryRepo.ts']) {
    const before = execFileSync('git', ['show', `a119bc1:${file}`], { cwd: root, encoding: 'utf8' });
    assert.equal(read(file).replace(/\r\n/g, '\n'), before.replace(/\r\n/g, '\n'), file);
  }
  // Semantic validation for dashboardRepo getFocusSummary invariant
  const dashboardRepo = read('db/repositories/dashboardRepo.ts');
  const focusSummaryBlock = dashboardRepo.slice(
    dashboardRepo.indexOf('getFocusSummary('),
    dashboardRepo.indexOf('getMemorySummary(')
  );
  assert.match(focusSummaryBlock, /completed\s*=\s*1\s+AND\s+cancelled\s*=\s*0/);
  assert.match(focusSummaryBlock, /ended_at\s*>=\s*started_at/);
  assert.match(focusSummaryBlock, /ended_at\s*>=\s*\?\s+AND\s+ended_at\s*<\s*\?/);
  assert.match(focusSummaryBlock, /typeof\(actual_duration_sec\)\s*=\s*'integer'\s+AND\s+actual_duration_sec\s*>\s*0/);
  // Calendar's only store-source addition is erased presentation metadata typing.
  const compile = source => ts.transpileModule(source, { compilerOptions: { removeComments: true, target: ts.ScriptTarget.ES2022 } }).outputText;
  const previous = execFileSync('git', ['show', 'a119bc1:store/useCalendarStore.ts'], { cwd: root, encoding: 'utf8' });
  assert.equal(compile(read('store/useCalendarStore.ts')), compile(previous));
});

process.stdout.write(`\nPhase 3 + localization static/in-memory validation passed: ${passed} checks.\n`);
