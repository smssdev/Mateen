import { describe, expect, it } from 'vitest';
import { goalId, goalSubtitle, goalTitle, segmentAyahs, segments } from './goals';
import index from '../../public/quran/index.json';
import parts from '../../public/quran/parts.json';
import type { Parts, SurahMeta } from './quran';

const idx = index as SurahMeta[];
const p = parts as Parts;

describe('goal segments', () => {
  it('covers a whole surah', () => {
    expect(segments({ kind: 'surah', n: 2 }, idx, p)).toEqual([{ surah: 2, from: 0, to: 285 }]);
  });

  it('splits a juz across surahs at the right ayahs', () => {
    // Juz 3 runs from al-Baqarah 253 to Al Imran 92
    expect(segments({ kind: 'juz', n: 3 }, idx, p)).toEqual([
      { surah: 2, from: 252, to: 285 },
      { surah: 3, from: 0, to: 91 },
    ]);
  });

  it('adds up every juz and every manzil to the whole Quran', () => {
    const sum = (kind: 'juz' | 'manzil', count: number) =>
      Array.from({ length: count }, (_, i) => segmentAyahs(segments({ kind, n: i + 1 }, idx, p))).reduce((a, b) => a + b);
    expect(sum('juz', 30)).toBe(6236);
    expect(sum('manzil', 7)).toBe(6236);
  });

  it('names goals', () => {
    expect(goalId({ kind: 'juz', n: 30 })).toBe('juz:30');
    expect(goalTitle({ kind: 'manzil', n: 7 }, idx)).toBe('الحزب ٧ «ق»');
    expect(goalSubtitle({ kind: 'manzil', n: 1 }, idx, p)).toContain('إلى');
  });
});
