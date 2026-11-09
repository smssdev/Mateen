import { describe, expect, it } from 'vitest';
import { buildQueue, gradeFor, mastery, newCard, schedule } from './srs';

const ok = (n: number) => new Array(n).fill(false);
const withErrors = (n: number, idx: number[]) => ok(n).map((_, i) => idx.includes(i));

describe('gradeFor', () => {
  it('grades by number of mistakes relative to ayah length', () => {
    expect(gradeFor(10, 0)).toBe('good');
    expect(gradeFor(10, 1)).toBe('hard');
    expect(gradeFor(20, 2)).toBe('hard');
    expect(gradeFor(20, 3)).toBe('again');
    expect(gradeFor(3, 2)).toBe('again');
  });
});

describe('schedule', () => {
  it('grows the interval on successive perfect reviews once words are strong', () => {
    let c = newCard(5, 100);
    let day = 100;
    const intervals: number[] = [];
    for (let i = 0; i < 6; i++) {
      c = schedule(c, ok(5), day);
      intervals.push(c.ivl);
      day = c.due;
    }
    // weak words cap early intervals; once strong they expand
    expect(intervals[0]).toBe(1);
    expect(intervals[intervals.length - 1]).toBeGreaterThan(intervals[2]);
    expect(c.w.every((w) => w === 5)).toBe(true);
  });

  it('resets a lapse and remembers which word failed', () => {
    let c = newCard(6, 0);
    for (let d = 0; d < 5; d++) c = schedule(c, ok(6), c.due);
    const before = c.ivl;
    c = schedule(c, withErrors(6, [1, 2, 4]), c.due);
    expect(c.ivl).toBe(1);
    expect(c.ivl).toBeLessThan(before);
    expect(c.lapses).toBe(1);
    expect(c.w[1]).toBe(0);
    expect(c.errs).toEqual([0, 1, 1, 0, 1, 0]);
  });

  it('keeps intervals short while a word is still weak', () => {
    let c = newCard(10, 0);
    for (let d = 0; d < 6; d++) c = schedule(c, ok(10), c.due);
    c = schedule(c, withErrors(10, [3]), c.due); // one slip → "hard"
    expect(c.ivl).toBeLessThanOrEqual(2);
  });
});

describe('buildQueue', () => {
  it('puts due reviews first, then the next unseen ayahs in order across surahs', () => {
    const progress = {
      2: { 0: { ...newCard(3, 0), due: 5 }, 1: { ...newCard(3, 0), due: 10 }, 3: { ...newCard(3, 0), due: 2 } },
      3: { 0: { ...newCard(3, 0), due: 1 } },
    };
    const q = buildQueue(progress, [{ surah: 2, from: 0, to: 4 }, { surah: 3, from: 0, to: 2 }], 5, 3);
    expect(q).toEqual([
      { surah: 2, ayah: 0, kind: 'review' },
      { surah: 2, ayah: 3, kind: 'review' },
      { surah: 3, ayah: 0, kind: 'review' },
      { surah: 2, ayah: 2, kind: 'new' },
      { surah: 2, ayah: 4, kind: 'new' },
      { surah: 3, ayah: 1, kind: 'new' },
    ]);
  });
});

describe('mastery', () => {
  it('is 0 for unseen and rises with strength and interval', () => {
    expect(mastery(undefined)).toBe(0);
    let c = newCard(4, 0);
    const m0 = mastery(c);
    for (let i = 0; i < 6; i++) c = schedule(c, ok(4), c.due);
    expect(mastery(c)).toBeGreaterThan(m0);
  });
});
