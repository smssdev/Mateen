import { Parts, SurahMeta, toArabicDigits } from './quran';

export type GoalKind = 'surah' | 'juz' | 'manzil';

export interface Goal {
  kind: GoalKind;
  n: number;
  addedAt: number;
}

/** A contiguous run of ayahs inside one surah (0-based, inclusive). */
export interface Segment {
  surah: number;
  from: number;
  to: number;
}

export interface AyahRef {
  surah: number;
  ayah: number;
}

export const goalId = (g: Pick<Goal, 'kind' | 'n'>) => `${g.kind}:${g.n}`;

/** The companions' seven-part division is remembered by «فمي بشوق». */
export const MANZIL_LETTERS = ['ف', 'م', 'ي', 'ب', 'ش', 'و', 'ق'];

export function segments(g: Pick<Goal, 'kind' | 'n'>, index: SurahMeta[], parts: Parts): Segment[] {
  if (g.kind === 'surah') return [{ surah: g.n, from: 0, to: index[g.n - 1].ayahs - 1 }];
  const [s1, a1, s2, a2] = (g.kind === 'juz' ? parts.juz : parts.manzil)[g.n - 1];
  const out: Segment[] = [];
  for (let s = s1; s <= s2; s++) {
    out.push({ surah: s, from: s === s1 ? a1 - 1 : 0, to: s === s2 ? a2 - 1 : index[s - 1].ayahs - 1 });
  }
  return out;
}

export function goalTitle(g: Pick<Goal, 'kind' | 'n'>, index: SurahMeta[]): string {
  if (g.kind === 'surah') return `سورة ${index[g.n - 1].name}`;
  if (g.kind === 'juz') return `الجزء ${toArabicDigits(g.n)}`;
  return `الحزب ${toArabicDigits(g.n)} «${MANZIL_LETTERS[g.n - 1]}»`;
}

export function goalSubtitle(g: Pick<Goal, 'kind' | 'n'>, index: SurahMeta[], parts: Parts): string {
  if (g.kind === 'surah') {
    const m = index[g.n - 1];
    return `${m.type} · ${toArabicDigits(m.ayahs)} آية`;
  }
  const [s1, a1, s2, a2] = (g.kind === 'juz' ? parts.juz : parts.manzil)[g.n - 1];
  const from = `${index[s1 - 1].name}${a1 > 1 ? ` ${toArabicDigits(a1)}` : ''}`;
  const to = `${index[s2 - 1].name}${a2 < index[s2 - 1].ayahs ? ` ${toArabicDigits(a2)}` : ''}`;
  return s1 === s2 && a1 === 1 && a2 === index[s1 - 1].ayahs ? from : `من ${from} إلى ${to}`;
}

export const segmentAyahs = (segs: Segment[]) => segs.reduce((t, s) => t + s.to - s.from + 1, 0);
