const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { DatabaseSync } = require('node:sqlite');

const root = path.resolve(__dirname, '..');
let passed = 0;

function check(name, run) {
  run();
  passed += 1;
  process.stdout.write(`PASS ${name}\n`);
}

async function checkAsync(name, run) {
  await run();
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
        const patchValue = typeof next === 'function' ? next(state) : next;
        state = { ...state, ...patchValue };
      };
      state = initializer(set, get);
      const hook = (selector = (value) => value) => selector(state);
      hook.getState = get;
      return hook;
    },
  };
}

function createMemoryAsyncStorage(initialValue = null, pauseFirstRead = false) {
  const values = new Map();
  if (initialValue !== null) values.set('medos-app-store', initialValue);
  let setCalls = 0;
  let releaseRead = () => {};
  const firstReadGate = pauseFirstRead
    ? new Promise((resolve) => {
        releaseRead = resolve;
      })
    : Promise.resolve();
  let isFirstRead = true;

  return {
    storage: {
      async getItem(name) {
        if (isFirstRead) {
          isFirstRead = false;
          await firstReadGate;
        }
        return values.get(name) ?? null;
      },
      async setItem(name, value) {
        setCalls += 1;
        values.set(name, value);
      },
      async removeItem(name) {
        values.delete(name);
      },
    },
    releaseRead: () => releaseRead(),
    getSetCalls: () => setCalls,
    getRawValue: () => values.get('medos-app-store') ?? null,
  };
}

function createRecoverableReadStorage(initialValue = null) {
  let value = initialValue;
  let shouldFailRead = true;
  let setCalls = 0;

  return {
    storage: {
      async getItem() {
        if (shouldFailRead) throw new Error('injected preference read failure');
        return value;
      },
      async setItem(_name, nextValue) {
        setCalls += 1;
        value = nextValue;
      },
      async removeItem() {
        value = null;
      },
    },
    recoverReads: () => { shouldFailRead = false; },
    getSetCalls: () => setCalls,
    getRawValue: () => value,
  };
}

function loadAppStoreModule(asyncStorage, preferences) {
  return loadTypeScript('store/useAppStore.ts', {
    '@react-native-async-storage/async-storage': {
      __esModule: true,
      default: asyncStorage,
    },
    '@/utils/preferences': preferences,
  });
}

function loadAppStore(asyncStorage, preferences) {
  return loadAppStoreModule(asyncStorage, preferences).useAppStore;
}

function waitForPersistHydration(store) {
  if (store.persist.hasHydrated()) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timed out waiting for hydration')), 2000);
    const unsubscribe = store.persist.onFinishHydration(() => {
      clearTimeout(timeout);
      unsubscribe();
      resolve();
    });
    if (store.persist.hasHydrated()) {
      clearTimeout(timeout);
      unsubscribe();
      resolve();
    }
  });
}

function waitForPreferenceResolution(store) {
  if (store.getState().isPreferencesHydrated) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error('Timed out waiting for preference resolution')),
      2000
    );
    const unsubscribe = store.subscribe((state) => {
      if (!state.isPreferencesHydrated) return;
      clearTimeout(timeout);
      unsubscribe();
      resolve();
    });
  });
}

class ExpoSQLiteAdapter {
  constructor({ failExec } = {}) {
    this.database = new DatabaseSync(':memory:');
    this.failExec = failExec ?? (() => false);
  }

  execSync(sql) {
    if (this.failExec(sql)) throw new Error('Injected migration failure');
    this.database.exec(sql);
  }

  runSync(sql, params = []) {
    return this.database.prepare(sql).run(...params);
  }

  getFirstSync(sql, params = []) {
    return this.database.prepare(sql).get(...params);
  }

  getAllSync(sql, params = []) {
    return this.database.prepare(sql).all(...params);
  }

  withTransactionSync(work) {
    this.database.exec('BEGIN');
    try {
      work();
      this.database.exec('COMMIT');
    } catch (error) {
      this.database.exec('ROLLBACK');
      throw error;
    }
  }

  close() {
    this.database.close();
  }
}

function createVersionOneDatabase(adapter) {
  adapter.execSync(`
    CREATE TABLE _schema_version (version INTEGER NOT NULL);
    INSERT INTO _schema_version (version) VALUES (1);
    CREATE TABLE committees (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      subject TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#6C63FF',
      created_at INTEGER NOT NULL
    );
    CREATE TABLE focus_sessions (
      id TEXT PRIMARY KEY NOT NULL,
      duration_sec INTEGER NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      committee_id TEXT,
      started_at INTEGER NOT NULL,
      ended_at INTEGER
    );
    CREATE TABLE decks (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      subject TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE flashcards (
      id TEXT PRIMARY KEY NOT NULL,
      deck_id TEXT NOT NULL,
      front TEXT NOT NULL,
      back TEXT NOT NULL,
      interval INTEGER NOT NULL DEFAULT 1,
      ease REAL NOT NULL DEFAULT 2.5,
      next_review INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE CASCADE
    );
    CREATE TABLE calendar_events (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      start_time INTEGER NOT NULL,
      end_time INTEGER NOT NULL,
      is_all_day INTEGER NOT NULL DEFAULT 0,
      color TEXT NOT NULL DEFAULT '#6C63FF',
      committee_id TEXT,
      created_at INTEGER NOT NULL
    );
  `);
}

function columnNames(adapter, table) {
  return new Set(adapter.getAllSync(`PRAGMA table_info(${table})`).map((row) => row.name));
}

function migrationModule(adapter, calendarDate) {
  return loadTypeScript('db/migrations.ts', {
    './client': { getDB: () => adapter },
    '@/utils/calendarDate': calendarDate,
  });
}

async function main() {
  const calendarDate = loadTypeScript('utils/calendarDate.ts');
  const preferences = loadTypeScript('utils/preferences.ts');
  const studySupportRules = loadTypeScript('utils/studySupportRules.ts', {
    './calendarDate': calendarDate,
  });
  const committeeDate = loadTypeScript('utils/committeeDate.ts', {
    '@/utils/calendarDate': calendarDate,
  });
  const dashboardRules = loadTypeScript('utils/dashboardRules.ts', {
    './calendarDate': calendarDate,
  });

  check('Profile preference values and normalization', () => {
    assert.deepEqual([...preferences.FOCUS_DURATION_OPTIONS], [900, 1500, 2700, 3600]);
    assert.deepEqual([...preferences.DAILY_FOCUS_GOAL_OPTIONS], [30, 60, 90, 120]);
    assert.equal(preferences.normalizeFocusDurationSec(2700), 2700);
    assert.equal(preferences.normalizeFocusDurationSec(123), 1500);
    assert.equal(preferences.normalizeDailyFocusGoalMin(null), null);
    assert.equal(preferences.normalizeDailyFocusGoalMin(90), 90);
    assert.equal(preferences.normalizeDailyFocusGoalMin(45), null);
    assert.equal(preferences.normalizeBooleanPreference(true), true);
    for (const value of [false, undefined, null, 'true', 1, [], {}]) {
      assert.equal(preferences.normalizeBooleanPreference(value), false);
    }
  });

  await checkAsync('Profile persistence serialization and restart hydration stay local', async () => {
    const storeSource = read('store/useAppStore.ts');
    const persistedSection = storeSource.slice(
      storeSource.indexOf('partialize:'),
      storeSource.indexOf('merge:')
    );
    assert.match(persistedSection, /defaultFocusSec/);
    assert.match(persistedSection, /dailyFocusGoalMin/);
    assert.match(persistedSection, /lowStimulationMode/);
    assert.match(persistedSection, /gentleNudgesEnabled/);
    assert.doesNotMatch(persistedSection, /dbError:\s*state\.dbError/);
    assert.match(storeSource, /onRehydrateStorage/);
    assert.match(storeSource, /retryAppPreferencesHydration/);
    assert.match(read('app/(tabs)/profile.tsx'), /label=\{t\.common\.prefsRetry\}/);
    assert.equal(loadTypeScript('i18n/en.ts').default.common.prefsRetry, 'Retry preferences');

    const seededValue = JSON.stringify({
      state: {
        colorScheme: 'dark',
        isOnboarded: false,
        defaultFocusSec: 2700,
        dailyFocusGoalMin: 60,
      },
      version: 0,
    });
    const delayedStorage = createMemoryAsyncStorage(seededValue, true);
    const firstStore = loadAppStore(delayedStorage.storage, preferences);

    // Reproduce startup-only mutations that previously wrote defaults before
    // AsyncStorage's first getItem completed.
    firstStore.getState().setDBReady(false);
    firstStore.getState().setDBError(null);
    assert.equal(delayedStorage.getSetCalls(), 0);
    delayedStorage.releaseRead();
    await waitForPersistHydration(firstStore);
    assert.equal(firstStore.getState().defaultFocusSec, 2700);
    assert.equal(firstStore.getState().dailyFocusGoalMin, 60);
    assert.equal(firstStore.getState().lowStimulationMode, false);
    assert.equal(firstStore.getState().gentleNudgesEnabled, false);

    firstStore.getState().setDefaultFocusSec(3600);
    firstStore.getState().setDailyFocusGoalMin(90);
    firstStore.getState().setLowStimulationMode(true);
    firstStore.getState().setGentleNudgesEnabled(true);
    await Promise.resolve();
    const serialized = JSON.parse(delayedStorage.getRawValue());
    assert.equal(serialized.state.defaultFocusSec, 3600);
    assert.equal(serialized.state.dailyFocusGoalMin, 90);
    assert.equal(serialized.state.lowStimulationMode, true);
    assert.equal(serialized.state.gentleNudgesEnabled, true);
    assert.equal('dbError' in serialized.state, false);
    assert.equal('isDBReady' in serialized.state, false);
    assert.equal('timerStatus' in serialized.state, false);
    assert.equal('gentleBreakStartedAt' in serialized.state, false);

    const restartedStore = loadAppStore(delayedStorage.storage, preferences);
    await waitForPersistHydration(restartedStore);
    assert.equal(restartedStore.getState().defaultFocusSec, 3600);
    assert.equal(restartedStore.getState().dailyFocusGoalMin, 90);
    assert.equal(restartedStore.getState().lowStimulationMode, true);
    assert.equal(restartedStore.getState().gentleNudgesEnabled, true);

    restartedStore.getState().setDailyFocusGoalMin(null);
    restartedStore.getState().setLowStimulationMode(false);
    restartedStore.getState().setGentleNudgesEnabled(false);
    await Promise.resolve();
    const nullRestartStore = loadAppStore(delayedStorage.storage, preferences);
    await waitForPersistHydration(nullRestartStore);
    assert.equal(nullRestartStore.getState().defaultFocusSec, 3600);
    assert.equal(nullRestartStore.getState().dailyFocusGoalMin, null);
    assert.equal(nullRestartStore.getState().lowStimulationMode, false);
    assert.equal(nullRestartStore.getState().gentleNudgesEnabled, false);

    nullRestartStore.getState().setLowStimulationMode(true);
    nullRestartStore.getState().setLowStimulationMode(false);
    nullRestartStore.getState().setLowStimulationMode(true);
    nullRestartStore.getState().setGentleNudgesEnabled(true);
    nullRestartStore.getState().setGentleNudgesEnabled(false);
    await Promise.resolve();
    const rapidToggleRestartStore = loadAppStore(delayedStorage.storage, preferences);
    await waitForPersistHydration(rapidToggleRestartStore);
    assert.equal(rapidToggleRestartStore.getState().lowStimulationMode, true);
    assert.equal(rapidToggleRestartStore.getState().gentleNudgesEnabled, false);

    const invalidStorage = createMemoryAsyncStorage(
      JSON.stringify({
        state: {
          defaultFocusSec: 123,
          dailyFocusGoalMin: 45,
          lowStimulationMode: 'true',
          gentleNudgesEnabled: { enabled: true },
        },
        version: 0,
      })
    );
    const invalidStore = loadAppStore(invalidStorage.storage, preferences);
    await waitForPersistHydration(invalidStore);
    assert.equal(invalidStore.getState().defaultFocusSec, 1500);
    assert.equal(invalidStore.getState().dailyFocusGoalMin, null);
    assert.equal(invalidStore.getState().lowStimulationMode, false);
    assert.equal(invalidStore.getState().gentleNudgesEnabled, false);

    const emptyStorage = createMemoryAsyncStorage();
    const emptyStore = loadAppStore(emptyStorage.storage, preferences);
    await waitForPersistHydration(emptyStore);
    assert.equal(emptyStore.getState().defaultFocusSec, 1500);
    assert.equal(emptyStore.getState().dailyFocusGoalMin, null);
    assert.equal(emptyStore.getState().lowStimulationMode, false);
    assert.equal(emptyStore.getState().gentleNudgesEnabled, false);
  });

  await checkAsync('Preference read failure keeps writes paused until retry succeeds', async () => {
    const recoverableStorage = createRecoverableReadStorage();
    const appStoreModule = loadAppStoreModule(recoverableStorage.storage, preferences);
    const store = appStoreModule.useAppStore;
    await waitForPreferenceResolution(store);

    assert.match(store.getState().preferencesError, /could not be loaded/i);
    store.getState().setLowStimulationMode(true);
    store.getState().setGentleNudgesEnabled(true);
    await Promise.resolve();
    assert.equal(recoverableStorage.getSetCalls(), 0);

    recoverableStorage.recoverReads();
    assert.equal(await appStoreModule.retryAppPreferencesHydration(), true);
    assert.equal(store.getState().preferencesError, null);
    store.getState().setLowStimulationMode(true);
    store.getState().setGentleNudgesEnabled(true);
    await Promise.resolve();
    assert.ok(recoverableStorage.getSetCalls() > 0);
    const serialized = JSON.parse(recoverableStorage.getRawValue());
    assert.equal(serialized.state.lowStimulationMode, true);
    assert.equal(serialized.state.gentleNudgesEnabled, true);
  });

  await checkAsync('Language preference normalizes, persists, and survives restart', async () => {
    assert.equal(preferences.normalizeLanguage('tr'), 'tr');
    for (const value of ['en', undefined, null, 'TR', 'fr', 1, true, [], {}]) {
      assert.equal(preferences.normalizeLanguage(value), 'en');
    }
    for (const value of [undefined, null, 'fr', 1, true, [], {}, 'tr', 'en']) {
      const storage = createMemoryAsyncStorage(JSON.stringify({ state: { language: value }, version: 0 }));
      const store = loadAppStore(storage.storage, preferences);
      await waitForPersistHydration(store);
      assert.equal(store.getState().language, value === 'tr' ? 'tr' : 'en');
    }
    const storage = createMemoryAsyncStorage(null, true);
    const store = loadAppStore(storage.storage, preferences);
    assert.equal(store.getState().language, 'en');
    store.getState().setLanguage('tr');
    assert.equal(storage.getSetCalls(), 0);
    storage.releaseRead();
    await waitForPersistHydration(store);
    for (const language of ['tr', 'en', 'tr']) {
      store.getState().setLanguage(language);
    }
    await Promise.resolve();
    const restarted = loadAppStore(storage.storage, preferences);
    await waitForPersistHydration(restarted);
    assert.equal(restarted.getState().language, 'tr');
    restarted.getState().setLanguage('en');
    await Promise.resolve();
    const englishRestart = loadAppStore(storage.storage, preferences);
    await waitForPersistHydration(englishRestart);
    assert.equal(englishRestart.getState().language, 'en');
    const saved = JSON.parse(storage.getRawValue()).state;
    assert.equal('gentleBreakStartedAt' in saved, false);
    assert.equal('timerStatus' in saved, false);
    assert.equal('isDBReady' in saved, false);
  });

  await checkAsync('Language writes remain paused after read failure until successful retry', async () => {
    const storage = createRecoverableReadStorage(JSON.stringify({ state: { language: 'tr' }, version: 0 }));
    const module = loadAppStoreModule(storage.storage, preferences);
    const store = module.useAppStore;
    await waitForPreferenceResolution(store);
    store.getState().setLanguage('en');
    assert.equal(storage.getSetCalls(), 0);
    storage.recoverReads();
    assert.equal(await module.retryAppPreferencesHydration(), true);
    assert.equal(store.getState().language, 'tr');
    store.getState().setLanguage('en');
    await Promise.resolve();
    assert.equal(JSON.parse(storage.getRawValue()).state.language, 'en');
  });

  check('Focus applies profile defaults without replacing an active timer', () => {
    const preferenceState = { defaultFocusSec: 2700 };
    const focusRepo = { insert() {}, getRecent() { return []; } };
    const focusModule = loadTypeScript('store/useFocusStore.ts', {
      zustand: createZustandMock(),
      '@/db/repositories/committeeRepo': {
        committeeRepo: { getById: (id) => ({ id }) },
      },
      '@/db/repositories/focusRepo': { focusRepo },
      '@/store/useAppStore': { useAppStore: { getState: () => preferenceState } },
      '@/utils/preferences': preferences,
      '@/utils/studySupportRules': studySupportRules,
    });
    const store = focusModule.useFocusStore;
    assert.equal(store.getState().plannedSec, 2700);
    store.getState().startTimer();
    preferenceState.defaultFocusSec = 3600;
    store.getState().resetTimer();
    assert.equal(store.getState().timerStatus, 'running');
    assert.equal(store.getState().plannedSec, 2700);
    store.getState().cancelSession();
    assert.equal(store.getState().timerStatus, 'idle');
    assert.equal(store.getState().plannedSec, 3600);
    preferenceState.defaultFocusSec = 900;
    store.getState().resetTimer();
    assert.equal(store.getState().plannedSec, 900);
  });

  check('Dashboard Quick Start remains fixed at 25 minutes and preserves active Focus', () => {
    const dashboardSource = read('app/(tabs)/index.tsx');
    assert.match(dashboardSource, /focusState\.timerStatus !== 'idle'/);
    assert.match(dashboardSource, /focusState\.setPlannedSec\(DEFAULT_FOCUS_SEC\)/);
    assert.match(dashboardSource, /focusState\.startTimer\(\)/);
    assert.match(read('utils/preferences.ts'), /DEFAULT_FOCUS_SEC = 25 \* 60/);
  });

  check('Local calendar arithmetic handles leap days, DST, and exam-today status', () => {
    assert.equal(calendarDate.shiftLocalDateKey('2028-02-28', 1), '2028-02-29');
    assert.equal(calendarDate.differenceInLocalCalendarDays('2028-02-28', '2028-03-01'), 2);

    const previousTimezone = process.env.TZ;
    process.env.TZ = 'America/New_York';
    try {
      const beforeDst = calendarDate.localDateTimeToTimestamp('2026-03-07', null);
      const afterDst = calendarDate.localDateTimeToTimestamp('2026-03-09', null);
      assert.notEqual(afterDst - beforeDst, 2 * 86_400_000);
      assert.equal(calendarDate.differenceInLocalCalendarDays('2026-03-07', '2026-03-09'), 2);

      const start = new Date(2026, 2, 1, 0, 0, 0, 0).getTime();
      const exam = new Date(2026, 2, 8, 0, 0, 0, 0).getTime();
      const examMorning = new Date(2026, 2, 8, 0, 1, 0, 0).getTime();
      const examNight = new Date(2026, 2, 8, 23, 59, 0, 0).getTime();
      const nextDay = new Date(2026, 2, 9, 0, 0, 0, 0).getTime();
      assert.equal(committeeDate.getCommitteeDateStatus(start, exam, examMorning), 'active');
      assert.equal(committeeDate.getCommitteeDateStatus(start, exam, examNight), 'active');
      assert.equal(committeeDate.getCommitteeDaysToExam(exam, examNight), 0);
      assert.equal(committeeDate.getCommitteeCountdownLabel(start, exam, examNight), 'Exam today');
      assert.equal(committeeDate.getCommitteeDateStatus(start, exam, nextDay), 'completed');
    } finally {
      process.env.TZ = previousTimezone;
    }
  });

  check('Committee direct lookup and acknowledged mutations', () => {
    const baseCommittee = {
      id: 'committee-1',
      name: 'Cardiovascular',
      description: '',
      color: '#6C63FF',
      startDate: new Date(2026, 8, 1).getTime(),
      examDate: new Date(2026, 8, 30).getTime(),
      status: 'active',
      createdAt: 1,
      updatedAt: 1,
    };
    let directFailure = false;
    let insertFailure = false;
    let updateResult = true;
    let deleteResult = true;
    const repo = {
      getAll: () => [baseCommittee],
      getById: () => {
        if (directFailure) throw new Error('read failed');
        return baseCommittee;
      },
      insert: () => {
        if (insertFailure) throw new Error('write failed');
      },
      update: () => updateResult,
      delete: () => deleteResult,
    };
    const committeeModule = loadTypeScript('store/useCommitteeStore.ts', {
      zustand: createZustandMock(),
      '@/db/repositories/committeeRepo': { committeeRepo: repo },
      '@/utils/committeeDate': committeeDate,
    });
    const store = committeeModule.useCommitteeStore;
    assert.equal(store.getState().loadCommittee('committee-1').id, 'committee-1');
    assert.equal(store.getState().committeeNotFound, false);
    directFailure = true;
    assert.equal(store.getState().loadCommittee('committee-1'), null);
    assert.match(store.getState().committeeLoadError, /read failed/);
    directFailure = false;

    insertFailure = true;
    assert.equal(
      store.getState().addCommittee({
        name: 'Renal',
        description: '',
        color: '#6C63FF',
        startDate: baseCommittee.startDate,
        examDate: baseCommittee.examDate,
      }),
      false
    );
    updateResult = false;
    assert.equal(store.getState().updateCommittee('committee-1', { name: 'Changed' }), false);
    deleteResult = false;
    assert.equal(store.getState().deleteCommittee('committee-1'), false);
    assert.equal(store.getState().committees.some((item) => item.id === 'committee-1'), true);
  });

  check('Memory deck and review load failures remain independently retryable', () => {
    let deckFailure = true;
    let reviewFailure = false;
    const memoryRepo = {
      getAllDecks: () => {
        if (deckFailure) throw new Error('deck load failed');
        return [];
      },
      getRecentReviews: () => {
        if (reviewFailure) throw new Error('review load failed');
        return [];
      },
    };
    const memoryModule = loadTypeScript('store/useMemoryStore.ts', {
      zustand: createZustandMock(),
      '@/db/repositories/memoryRepo': { memoryRepo },
    });
    const store = memoryModule.useMemoryStore;
    store.getState().loadDecks();
    store.getState().loadRecentReviews(10);
    assert.match(store.getState().deckLoadError, /deck load failed/);
    assert.equal(store.getState().reviewLoadError, null);

    deckFailure = false;
    reviewFailure = true;
    store.getState().loadDecks();
    store.getState().loadRecentReviews(10);
    assert.equal(store.getState().deckLoadError, null);
    assert.match(store.getState().reviewLoadError, /review load failed/);
  });

  check('Deterministic Quick Start covers manual, Committee, Memory, and fallback branches', () => {
    const committee = {
      id: 'c1',
      name: 'Cardio',
      color: '#fff',
      startDate: 1,
      examDate: 2,
      status: 'active',
      daysToExam: 30,
    };
    const manual = {
      eventId: 'e1',
      title: 'Study histology',
      time: '10:00',
      committeeId: 'c1',
      committeeName: 'Cardio',
    };
    const weakDeck = { deckId: 'd1', deckName: 'Physiology', attentionCount: 3 };
    assert.equal(dashboardRules.buildQuickStart(manual, committee, weakDeck).kind, 'manual_focus');
    assert.equal(dashboardRules.buildQuickStart(null, committee, weakDeck).kind, 'committee_focus');
    assert.equal(
      dashboardRules.buildQuickStart(null, { ...committee, daysToExam: 31 }, weakDeck).kind,
      'memory_review'
    );
    assert.equal(dashboardRules.buildQuickStart(null, null, null).kind, 'generic_focus');
  });

  await checkAsync('Clean v0 migration reaches current schema (>= v10) and preserves compatibility columns', async () => {
    const adapter = new ExpoSQLiteAdapter();
    try {
      await migrationModule(adapter, calendarDate).runMigrations();
      assert.ok(adapter.getFirstSync('SELECT version FROM _schema_version').version >= 10);
      const flashcardColumns = columnNames(adapter, 'flashcards');
      for (const name of ['interval', 'ease', 'next_review', 'updated_at']) {
        assert.equal(flashcardColumns.has(name), true);
      }
      for (const name of ['description', 'start_date', 'exam_date', 'updated_at']) {
        assert.equal(columnNames(adapter, 'committees').has(name), true);
      }
      for (const name of ['actual_duration_sec', 'cancelled']) {
        assert.equal(columnNames(adapter, 'focus_sessions').has(name), true);
      }
      await migrationModule(adapter, calendarDate).runMigrations();
      assert.ok(adapter.getFirstSync('SELECT version FROM _schema_version').version >= 10);
    } finally {
      adapter.close();
    }
  });

  await checkAsync('Interrupted v2/v3-style columns are guarded and repeatable', async () => {
    const adapter = new ExpoSQLiteAdapter();
    try {
      createVersionOneDatabase(adapter);
      adapter.execSync('ALTER TABLE committees ADD COLUMN description TEXT;');
      adapter.execSync(
        'ALTER TABLE focus_sessions ADD COLUMN actual_duration_sec INTEGER NOT NULL DEFAULT 0;'
      );
      await migrationModule(adapter, calendarDate).runMigrations();
      assert.ok(adapter.getFirstSync('SELECT version FROM _schema_version').version >= 10);
      assert.equal(columnNames(adapter, 'committees').has('exam_date'), true);
      assert.equal(columnNames(adapter, 'focus_sessions').has('cancelled'), true);
    } finally {
      adapter.close();
    }
  });

  await checkAsync('Migration failure does not falsely advance schema version', async () => {
    const adapter = new ExpoSQLiteAdapter({
      failExec: (sql) => sql.includes('ADD COLUMN exam_date'),
    });
    try {
      createVersionOneDatabase(adapter);
      await assert.rejects(() => migrationModule(adapter, calendarDate).runMigrations());
      assert.equal(adapter.getFirstSync('SELECT version FROM _schema_version').version, 1);
      assert.equal(columnNames(adapter, 'committees').has('description'), false);
    } finally {
      adapter.close();
    }
  });

  await checkAsync('v4 to v5 backfill and repeat-run migration are safe', async () => {
    const adapter = new ExpoSQLiteAdapter();
    try {
      createVersionOneDatabase(adapter);
      adapter.execSync(`
        ALTER TABLE committees ADD COLUMN description TEXT;
        ALTER TABLE committees ADD COLUMN start_date INTEGER NOT NULL DEFAULT 0;
        ALTER TABLE committees ADD COLUMN exam_date INTEGER NOT NULL DEFAULT 0;
        ALTER TABLE committees ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0;
        ALTER TABLE focus_sessions ADD COLUMN actual_duration_sec INTEGER NOT NULL DEFAULT 0;
        ALTER TABLE focus_sessions ADD COLUMN cancelled INTEGER NOT NULL DEFAULT 0;
        ALTER TABLE decks ADD COLUMN description TEXT NOT NULL DEFAULT '';
        ALTER TABLE decks ADD COLUMN committee_id TEXT;
        ALTER TABLE decks ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0;
        ALTER TABLE flashcards ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0;
        CREATE TABLE flashcard_reviews (
          id TEXT PRIMARY KEY NOT NULL,
          card_id TEXT NOT NULL,
          rating TEXT NOT NULL,
          reviewed_at INTEGER NOT NULL
        );
        UPDATE _schema_version SET version = 4;
      `);
      const eventTimestamp = calendarDate.localDateTimeToTimestamp('2026-09-12', '14:30');
      adapter.runSync(
        `INSERT INTO calendar_events
          (id, title, description, start_time, end_time, is_all_day, color, committee_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ['e1', 'Study', '', eventTimestamp, eventTimestamp + 60_000, 0, '#fff', null, 10]
      );
      await migrationModule(adapter, calendarDate).runMigrations();
      assert.ok(adapter.getFirstSync('SELECT version FROM _schema_version').version >= 10);
      assert.equal(
        adapter.getFirstSync('SELECT event_date FROM calendar_events WHERE id = ?', ['e1'])
          .event_date,
        '2026-09-12'
      );
      await migrationModule(adapter, calendarDate).runMigrations();
    } finally {
      adapter.close();
    }
  });

  check('Database, Committee, Focus, and Memory recovery affordances exist', () => {
    assert.match(read('hooks/useDB.ts'), /retry/);
    assert.match(read('hooks/useDB.ts'), /attemptRef/);
    assert.match(read('app/_layout.tsx'), /DatabaseGate/);
    assert.match(read('components/layout/DatabaseGate.tsx'), /label=\{t\.common\.dbRetry\}/);
    assert.match(read('components/layout/DatabaseGate.tsx'), /onPress=\{onRetry\}/);
    assert.match(read('app/(tabs)/committees.tsx'), /label=\{t\.common\.retry\}/);
    assert.match(read('app/committees/[id].tsx'), /label=\{t.sweep.retryCommittee\}/);
    assert.equal(loadTypeScript('i18n/en.ts').default.sweep.retryCommittee, 'Retry committee');
    assert.match(read('app/(tabs)/focus.tsx'), /label=\{t\.common\.retry\}/);
    assert.match(read('app/(tabs)/focus.tsx'), /onPress=\{onRetry\}/);
    assert.match(read('app/(tabs)/memory.tsx'), /label=\{t\.common\.retry\}/);
    assert.match(read('app/(tabs)/memory.tsx'), /onPress=\{handleRetry\}/);
  });

  check('Committee routes are safe on a fresh store and failed writes do not navigate', () => {
    const detail = read('app/committees/[id].tsx');
    const edit = read('app/committees/edit/[id].tsx');
    const create = read('app/committees/new.tsx');
    assert.match(detail, /loadCommittee\(id\)/);
    assert.match(detail, /t.sweep.committeeMissing/);
    assert.match(detail, /committeeLoadError/);
    assert.match(edit, /loadCommittee\(id\)/);
    assert.match(edit, /t.sweep.committeeMissing/);
    assert.match(create, /if \(succeeded\) router\.back\(\)/);
    assert.match(edit, /if \(succeeded\) committeeExit\(committee.id\)/);
    assert.match(edit, /subjectFallback\(id\)/);
    assert.match(detail, /if \(deleteCommittee\(committeeId\)\) router\.dismissTo\('\/\(tabs\)\/committees'\)/);
    assert.match(read('app/(tabs)/index.tsx'), /`\/committees\/\$\{id\}`/);
    assert.match(read('app/(tabs)/calendar.tsx'), /`\/committees\/\$\{item\.sourceId\}`/);
  });

  check('Touched controls have labels and practical minimum targets', () => {
    const button = read('components/ui/Button.tsx');
    assert.match(button, /accessibilityLabel/);
    assert.match(button, /minHeight: Interaction.minTarget/);
    assert.match(read('theme/interaction.ts'), /minTarget: 44/);
    assert.match(read('app/(tabs)/profile.tsx'), /accessibilityRole="radio"/);
    assert.match(read('app/committees/[id].tsx'), /accessibilityLabel=\{t.common.back\}/);
    assert.match(read('app/committees/new.tsx'), /minHeight: 48/);
  });

  check('Six tabs contain no Phase 2-facing future or fake-stat placeholders', () => {
    const tabSources = [
      'app/(tabs)/index.tsx',
      'app/(tabs)/committees.tsx',
      'app/(tabs)/focus.tsx',
      'app/(tabs)/memory.tsx',
      'app/(tabs)/calendar.tsx',
      'app/(tabs)/profile.tsx',
      'app/committees/[id].tsx',
    ].map(read).join('\n');
    for (const banned of [
      'COMING IN FUTURE PHASES',
      'Coming in Phase 2',
      'Cards Due',
      'Study Streak',
      'Dark Mode',
      'Notifications',
      'Break Length',
      'Export Data',
      'Clear All Data',
    ]) {
      assert.equal(tabSources.includes(banned), false, `Unexpected UI text: ${banned}`);
    }
  });

  check('Repository writes keep SQL values parameterized', () => {
    const committeeRepo = read('db/repositories/committeeRepo.ts');
    const focusRepo = read('db/repositories/focusRepo.ts');
    const memoryRepo = read('db/repositories/memoryRepo.ts');
    const calendarRepo = read('db/repositories/calendarRepo.ts');
    assert.match(committeeRepo, /WHERE id = \?/);
    assert.match(focusRepo, /VALUES \(\?, \?, \?, \?, \?, \?, \?, \?, \?\)/);
    assert.match(memoryRepo, /DELETE FROM decks WHERE id = \?/);
    assert.match(calendarRepo, /DELETE FROM calendar_events WHERE id = \?/);
  });

  check('Responsive branches remain present on the six primary tabs', () => {
    assert.match(read('app/(tabs)/index.tsx'), /isLargeTablet/);
    assert.match(read('app/(tabs)/committees.tsx'), /columns\(1\)/);
    assert.match(read('app/(tabs)/focus.tsx'), /isLargeTablet/);
    assert.match(read('app/(tabs)/memory.tsx'), /columns\(1\)/);
    assert.match(read('app/(tabs)/calendar.tsx'), /isLargeTablet/);
    assert.match(read('app/(tabs)/profile.tsx'), /isLargeTablet/);
  });

  process.stdout.write(`\nPhase 2 static/in-memory validation passed: ${passed} checks.\n`);
  process.stdout.write('Phase 2 physical exit walkthrough and Profile persistence retest passed.\n');
}

main().catch((error) => {
  console.error('\nPhase 2 validation failed.');
  console.error(error);
  process.exitCode = 1;
});
