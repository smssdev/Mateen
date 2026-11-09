// Spaced-repetition engine.
//
// The unit that is scheduled is the ayah, but the engine keeps a strength
// value for every single word. Word strength drives both the grade of an ayah
// review and the ordering of what you see, so the places you stumble on come
// back far more often than the ones you already know well.

export const MAX_STRENGTH = 5;
export const MIN_EASE = 1.3;
export const MAX_EASE = 3.0;
export const START_EASE = 2.3;

export interface AyahCard {
  /** Local day number on which the ayah is due again. */
  due: number;
  /** Current interval in days. */
  ivl: number;
  ease: number;
  /** Consecutive successful reviews. */
  reps: number;
  lapses: number;
  /** Day number of the last scheduled review. */
  last: number;
  /** Per-word strength, 0 (just failed) … MAX_STRENGTH (solid). */
  w: number[];
  /** Lifetime number of mistakes per word. */
  errs: number[];
}

export type Grade = 'good' | 'hard' | 'again';

/** Days since the Unix epoch in the user's local time zone. A day starts at 03:00
 *  so a late-night session still counts towards the day it belongs to. */
export function dayNumber(date: Date = new Date()): number {
  const shifted = new Date(date.getTime() - 3 * 3600_000);
  const local = Date.UTC(shifted.getFullYear(), shifted.getMonth(), shifted.getDate());
  return Math.floor(local / 86_400_000);
}

export function newCard(wordCount: number, today: number): AyahCard {
  return {
    due: today,
    ivl: 0,
    ease: START_EASE,
    reps: 0,
    lapses: 0,
    last: today,
    w: new Array(wordCount).fill(0),
    errs: new Array(wordCount).fill(0),
  };
}

export function gradeFor(wordCount: number, mistakes: number): Grade {
  if (mistakes === 0) return 'good';
  if (mistakes <= Math.max(1, Math.floor(wordCount * 0.15)) && mistakes <= 2) return 'hard';
  return 'again';
}

/** Updates word strengths only (used for every attempt, including in-session repeats
 *  and free practice). */
export function applyWordResults(card: AyahCard, wrong: boolean[]): AyahCard {
  const w = card.w.slice();
  const errs = card.errs.slice();
  wrong.forEach((isWrong, i) => {
    if (isWrong) {
      w[i] = 0;
      errs[i] = (errs[i] ?? 0) + 1;
    } else {
      w[i] = Math.min(MAX_STRENGTH, (w[i] ?? 0) + 1);
    }
  });
  return { ...card, w, errs };
}

/** Applies the first, scheduled attempt of the day for an ayah. */
export function schedule(card: AyahCard, wrong: boolean[], today: number): AyahCard {
  const mistakes = wrong.filter(Boolean).length;
  const grade = gradeFor(wrong.length, mistakes);
  const next = applyWordResults(card, wrong);
  let { ivl, ease, reps, lapses } = next;

  // Overdue reviews that were still recalled perfectly earn extra credit.
  const elapsed = Math.max(0, today - card.last);

  switch (grade) {
    case 'good':
      reps += 1;
      if (reps === 1) ivl = 1;
      else if (reps === 2) ivl = 3;
      else ivl = Math.round(Math.max(ivl, elapsed) * ease);
      ease = Math.min(MAX_EASE, ease + 0.05);
      break;
    case 'hard':
      ivl = Math.max(1, Math.round(ivl * 1.2));
      ease = Math.max(MIN_EASE, ease - 0.15);
      break;
    case 'again':
      lapses += 1;
      reps = 0;
      ivl = 1;
      ease = Math.max(MIN_EASE, ease - 0.2);
      break;
  }

  // Weak words keep the interval short even if this particular run went well.
  const weakest = Math.min(...next.w);
  if (weakest < 2) ivl = Math.min(ivl, 2);
  else if (weakest < 3) ivl = Math.min(ivl, 7);

  ivl = Math.min(ivl, 365);
  return { ...next, ivl, ease, reps, lapses, last: today, due: today + ivl };
}

/** 0 … 1 – how well the ayah is held overall. */
export function mastery(card: AyahCard | undefined): number {
  if (!card || card.w.length === 0) return 0;
  const avg = card.w.reduce((a, b) => a + b, 0) / card.w.length;
  const stability = Math.min(1, card.ivl / 30);
  return Math.min(1, 0.6 * (avg / MAX_STRENGTH) + 0.4 * stability);
}

export interface QueueItem {
  ayah: number; // 0-based index within the surah
  kind: 'review' | 'new';
}

/** Builds today's queue for one surah: due reviews first (in mushaf order, so
 *  the meaning carries from ayah to ayah), then the next new ayahs. */
export function buildQueue(
  cards: Record<number, AyahCard>,
  ayahCount: number,
  today: number,
  newAllowance: number,
): QueueItem[] {
  const queue: QueueItem[] = [];
  for (let i = 0; i < ayahCount; i++) {
    const c = cards[i];
    if (c && c.due <= today) queue.push({ ayah: i, kind: 'review' });
  }
  let added = 0;
  for (let i = 0; i < ayahCount && added < newAllowance; i++) {
    if (!cards[i]) {
      queue.push({ ayah: i, kind: 'new' });
      added++;
    }
  }
  return queue;
}

export function dueCount(cards: Record<number, AyahCard>, today: number): number {
  return Object.values(cards).filter((c) => c.due <= today).length;
}
