import { useSyncExternalStore } from 'react';
import { AyahCard, dayNumber } from './srs';
import { Goal, GoalKind, goalId } from './goals';

export type { Goal };

export interface Settings {
  newPerDay: number;
  fontScale: number;
  hintLength: boolean;
  showContext: boolean;
  reciter: string;
  autoPlay: boolean;
  theme: 'auto' | 'light' | 'dark';
  /** cards: one word at a time (swipe up); ayah: whole ayah with blanks */
  mode: 'cards' | 'ayah';
}

export interface DayLog {
  reviews: number;
  learned: number;
  words: number;
  mistakes: number;
}

export interface State {
  version: 1;
  goals: Goal[];
  /** surah number → ayah index → card */
  progress: Record<number, Record<number, AyahCard>>;
  /** day number → log */
  log: Record<number, DayLog>;
  /** day number → goal id → new ayahs introduced that day */
  newToday: Record<number, Record<string, number>>;
  settings: Settings;
}

export const DEFAULT_SETTINGS: Settings = {
  newPerDay: 3,
  fontScale: 1,
  hintLength: true,
  showContext: true,
  reciter: 'Husary_128kbps',
  autoPlay: false,
  theme: 'auto',
  mode: 'cards',
};

const KEY = 'mateen:v1';

function initial(): State {
  return { version: 1, goals: [], progress: {}, log: {}, newToday: {}, settings: { ...DEFAULT_SETTINGS } };
}

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return initial();
    return normalize(JSON.parse(raw));
  } catch {
    return initial();
  }
}

export function normalize(data: Partial<State>): State {
  const base = initial();
  // v0.1 stored goals as { surah, addedAt }
  const goals = (data.goals ?? []).map((g: Goal | { surah: number; addedAt: number }) =>
    'surah' in g ? { kind: 'surah' as const, n: g.surah, addedAt: g.addedAt } : g,
  );
  return {
    ...base,
    ...data,
    goals,
    version: 1,
    settings: { ...DEFAULT_SETTINGS, ...(data.settings ?? {}) },
  } as State;
}

let state: State = load();
const listeners = new Set<() => void>();
let saveTimer: ReturnType<typeof setTimeout> | undefined;

function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* storage full or unavailable – keep working in memory */
    }
  }, 150);
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  });
}

export function getState(): State {
  return state;
}

export function setState(update: (s: State) => State) {
  state = update(state);
  persist();
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useStore<T>(select: (s: State) => T): T {
  return useSyncExternalStore(subscribe, () => select(state));
}

// ---------- actions ----------

export function addGoal(kind: GoalKind, n: number) {
  setState((s) =>
    s.goals.some((g) => g.kind === kind && g.n === n)
      ? s
      : { ...s, goals: [...s.goals, { kind, n, addedAt: Date.now() }] },
  );
}

export function removeGoal(id: string) {
  setState((s) => ({ ...s, goals: s.goals.filter((g) => goalId(g) !== id) }));
}

export function resetRange(segs: { surah: number; from: number; to: number }[]) {
  setState((s) => {
    const progress = { ...s.progress };
    for (const seg of segs) {
      const cards = { ...(progress[seg.surah] ?? {}) };
      for (let i = seg.from; i <= seg.to; i++) delete cards[i];
      progress[seg.surah] = cards;
    }
    return { ...s, progress };
  });
}

export function putCard(surah: number, ayah: number, card: AyahCard) {
  setState((s) => ({
    ...s,
    progress: { ...s.progress, [surah]: { ...(s.progress[surah] ?? {}), [ayah]: card } },
  }));
}

export function logAttempt(opts: { words: number; mistakes: number; review?: boolean; learnedGoal?: string }) {
  const today = dayNumber();
  setState((s) => {
    const prev = s.log[today] ?? { reviews: 0, learned: 0, words: 0, mistakes: 0 };
    const log = {
      ...s.log,
      [today]: {
        reviews: prev.reviews + (opts.review ? 1 : 0),
        learned: prev.learned + (opts.learnedGoal ? 1 : 0),
        words: prev.words + opts.words,
        mistakes: prev.mistakes + opts.mistakes,
      },
    };
    let newToday = s.newToday;
    if (opts.learnedGoal) {
      // keep only today's counters
      const day = s.newToday[today] ?? {};
      newToday = { [today]: { ...day, [opts.learnedGoal]: (day[opts.learnedGoal] ?? 0) + 1 } };
    }
    return { ...s, log, newToday };
  });
}

export function updateSettings(patch: Partial<Settings>) {
  setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
}

export function replaceState(next: State) {
  setState(() => normalize(next));
}

export function resetAll() {
  setState(() => initial());
}

export function newIntroducedToday(s: State, goal: string): number {
  return s.newToday[dayNumber()]?.[goal] ?? 0;
}

export function streak(s: State): number {
  let d = dayNumber();
  if (!s.log[d]) d -= 1; // today not started yet doesn't break the streak
  let n = 0;
  while (s.log[d]) {
    n++;
    d--;
  }
  return n;
}
