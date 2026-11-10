import { describe, expect, it } from 'vitest';
import { divergenceAt, Similar } from './linking';
import baqara from '../../public/quran/2.json';

const make = (here: [number, number]): Similar => ({ surah: 2, ayah: 122, name: 'البقرة', words: [], there: here, here });

describe('divergenceAt', () => {
  it('points at the first word after a shared run of 3+ words', () => {
    expect(divergenceAt([make([0, 11])], 11)?.ayah).toBe(122);
    expect(divergenceAt([make([0, 11])], 10)).toBeUndefined();
  });

  it('ignores very short shared runs', () => {
    expect(divergenceAt([make([4, 6])], 6)).toBeUndefined();
  });
});

describe('precomputed mutashabihat', () => {
  it('links al-Baqarah 48 and 123, which part ways after 11 words', () => {
    const sim = (baqara as { sim: Record<string, number[][]> }).sim;
    const ref = sim['47'].find(([s, a]) => s === 2 && a === 122);
    expect(ref).toEqual([2, 122, 0, 0, 11]);
    const back = sim['122'].find(([s, a]) => s === 2 && a === 47);
    expect(back?.[4]).toBe(11);
  });

  it('keeps the mushaf text intact (basmala stripped from ayah 1 only)', () => {
    const ayahs = (baqara as { ayahs: string[][] }).ayahs;
    expect(ayahs).toHaveLength(286);
    expect(ayahs[0]).toEqual(['الٓمٓ']);
  });
});
