import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_FOCUS_SEC,
  normalizeBooleanPreference,
  normalizeDailyFocusGoalMin,
  normalizeFocusDurationSec,
  normalizeLanguage,
  type Language,
  type DailyFocusGoalMin,
  type FocusDurationSec,
} from '@/utils/preferences';

type ColorScheme = 'dark' | 'light';

// Zustand persist writes after every store mutation, including mutations whose
// fields are removed by partialize. Keep writes paused until AsyncStorage has
// finished loading so startup-only DB state cannot replace saved preferences.
let canWritePersistedAppState = false;

const hydrationSafeStorage = {
  getItem: (name: string) => AsyncStorage.getItem(name),
  setItem: (name: string, value: string) =>
    canWritePersistedAppState ? AsyncStorage.setItem(name, value) : Promise.resolve(),
  removeItem: (name: string) => AsyncStorage.removeItem(name),
};

interface AppState {
  colorScheme: ColorScheme;
  isOnboarded: boolean;
  defaultFocusSec: FocusDurationSec;
  dailyFocusGoalMin: DailyFocusGoalMin | null;
  lowStimulationMode: boolean;
  gentleNudgesEnabled: boolean;
  language: Language;
  isPreferencesHydrated: boolean;
  preferencesError: string | null;
  isDBReady: boolean;
  dbError: string | null;

  // Actions
  setColorScheme: (scheme: ColorScheme) => void;
  setIsOnboarded: (value: boolean) => void;
  setDefaultFocusSec: (value: FocusDurationSec) => void;
  setDailyFocusGoalMin: (value: DailyFocusGoalMin | null) => void;
  setLowStimulationMode: (value: boolean) => void;
  setGentleNudgesEnabled: (value: boolean) => void;
  setLanguage: (value: Language) => void;
  setPreferencesHydrationState: (hydrated: boolean, error: string | null) => void;
  setDBReady: (value: boolean) => void;
  setDBError: (error: string | null) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      colorScheme: 'dark',
      isOnboarded: false,
      defaultFocusSec: DEFAULT_FOCUS_SEC,
      dailyFocusGoalMin: null,
      lowStimulationMode: false,
      gentleNudgesEnabled: false,
      language: normalizeLanguage(undefined),
      isPreferencesHydrated: false,
      preferencesError: null,
      isDBReady: false,
      dbError: null,

      setColorScheme: (colorScheme) => set({ colorScheme }),
      setIsOnboarded: (isOnboarded) => set({ isOnboarded }),
      setDefaultFocusSec: (defaultFocusSec) => set({ defaultFocusSec }),
      setDailyFocusGoalMin: (dailyFocusGoalMin) => set({ dailyFocusGoalMin }),
      setLowStimulationMode: (lowStimulationMode) => set({ lowStimulationMode }),
      setGentleNudgesEnabled: (gentleNudgesEnabled) => set({ gentleNudgesEnabled }),
      setLanguage: (language) => set({ language: normalizeLanguage(language) }),
      setPreferencesHydrationState: (isPreferencesHydrated, preferencesError) =>
        set({ isPreferencesHydrated, preferencesError }),
      setDBReady: (isDBReady) => set({ isDBReady }),
      setDBError: (dbError) => set({ dbError }),
    }),
    {
      name: 'medos-app-store',
      storage: createJSONStorage(() => hydrationSafeStorage),
      partialize: (state) => ({
        colorScheme: state.colorScheme,
        isOnboarded: state.isOnboarded,
        defaultFocusSec: state.defaultFocusSec,
        dailyFocusGoalMin: state.dailyFocusGoalMin,
        lowStimulationMode: state.lowStimulationMode,
        gentleNudgesEnabled: state.gentleNudgesEnabled,
        language: state.language,
        // Database and hydration errors are runtime-only state.
      }),
      merge: (persistedState, currentState) => {
        const persisted = (persistedState ?? {}) as Partial<AppState>;
        const language = normalizeLanguage(persisted.language);
        return {
          ...currentState,
          ...persisted,
          defaultFocusSec: normalizeFocusDurationSec(persisted.defaultFocusSec),
          dailyFocusGoalMin: normalizeDailyFocusGoalMin(persisted.dailyFocusGoalMin),
          lowStimulationMode: normalizeBooleanPreference(
            persisted.lowStimulationMode
          ),
          gentleNudgesEnabled: normalizeBooleanPreference(
            persisted.gentleNudgesEnabled
          ),
          language,
          isPreferencesHydrated: false,
          preferencesError: null,
          isDBReady: currentState.isDBReady,
          dbError: currentState.dbError,
        };
      },
      onRehydrateStorage: (state) => {
        canWritePersistedAppState = false;
        return (_hydratedState, error) => {
          if (error) {
            // Keep persistence paused so a transient read failure cannot replace
            // previously stored preferences with in-memory defaults.
            state.setPreferencesHydrationState(
              true,
              'Your local preferences could not be loaded.'
            );
            return;
          }

          canWritePersistedAppState = true;
          state.setPreferencesHydrationState(true, null);
        };
      },
    }
  )
);

export async function retryAppPreferencesHydration(): Promise<boolean> {
  canWritePersistedAppState = false;
  useAppStore.getState().setPreferencesHydrationState(false, null);

  try {
    await useAppStore.persist.rehydrate();
  } catch {
    useAppStore
      .getState()
      .setPreferencesHydrationState(true, 'Your local preferences could not be loaded.');
  }

  return useAppStore.getState().preferencesError === null;
}
