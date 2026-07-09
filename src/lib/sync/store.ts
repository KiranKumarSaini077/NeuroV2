import { writable, get } from 'svelte/store';
import type { AppData, TblState, CustomFact } from '$lib/types';
import { safeGet, safeSet } from '$lib/utils';
import { readFromFirestore, writeToFirestore, listenToFirestore } from './firebase';

function defaultAppData(): AppData {
  return {
    _version: 1,
    globalScore: 0,
    streak: 0,
    history: [],
    arithModes: ['Addition'],
    arithOperandCount: 2,
    arithDigits: { first: 2, second: 2, num: 2, den: 1 },
    rootModes: ['sq-to-root'],
    rootSqRanges: ['13-19','21-29','31-39','41-49'],
    fracPoolMode: 'all',
    fracSelected: [],
    memCfg: { sets: 3, nums: 2, time: 30, ops: ['+'] },
    tblState: {
      tablesMastered: 0, totalMastered: 0, score: 0,
      currentTable: 1, factsMastered: 0, customFactIdx: null, leitner: {}
    },
    tblCustomFacts: [],
    memorySessions: []
  };
}

function loadFromLS(): AppData {
  const d = defaultAppData();
  try {
    const saved = safeGet('nc_app_data', null);
    if (saved) Object.assign(d, saved);
  } catch {}
  return d;
}

function saveToLS(data: AppData): void {
  safeSet('nc_app_data', data);
}

function createAppStore() {
  const initial = loadFromLS();
  const { subscribe, set, update } = writable<AppData>(initial);

  let syncTimer: ReturnType<typeof setTimeout> | null = null;
  let unsubFirestore: (() => void) | null = null;

  // Firestore listener for cross-device sync
  async function initSync() {
    const remote = await readFromFirestore();
    if (remote) {
      const local = get({ subscribe });
      // Merge: remote wins for settings, local wins for session state (score, streak)
      const merged = { ...local, ...(remote as Partial<AppData>) };
      merged.globalScore = Math.max(local.globalScore, (remote as AppData).globalScore || 0);
      merged.streak = Math.max(local.streak, (remote as AppData).streak || 0);
      set(merged);
      saveToLS(merged);
    }
    unsubFirestore = listenToFirestore((remote) => {
      const current = get({ subscribe });
      const merged = { ...current, ...(remote as Partial<AppData>) };
      merged.globalScore = Math.max(current.globalScore, (remote as AppData).globalScore || 0);
      merged.streak = Math.max(current.streak, (remote as AppData).streak || 0);
      set(merged);
      saveToLS(merged);
    });
  }

  // Debounced Firestore write
  function scheduleSync(data: AppData) {
    if (syncTimer) clearTimeout(syncTimer);
    syncTimer = setTimeout(() => {
      writeToFirestore(data);
    }, 1000);
  }

  // Override update to auto-save
  const origUpdate = update;
  const updater = (fn: (d: AppData) => AppData) => {
    origUpdate(fn);
    const data = get({ subscribe });
    saveToLS(data);
    scheduleSync(data);
  };

  const setter = (val: AppData) => {
    set(val);
    saveToLS(val);
    scheduleSync(val);
  };

  initSync();

  return {
    subscribe,
    set: setter,
    update: updater,
    // Convenience: update a nested path
    patch(partial: Partial<AppData>) {
      updater(d => ({ ...d, ...partial }));
    }
  };
}

export const appData = createAppStore();
