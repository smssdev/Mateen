import { useEffect, useState } from 'react';
import { loadSurah, loadTafsir, SurahMeta, SurahText } from './quran';

export interface Similar {
  surah: number;
  ayah: number;
  name: string;
  /** words of the other ayah */
  words: string[];
  /** shared run in the other ayah */
  there: [number, number];
  /** shared run in this ayah */
  here: [number, number];
}

/** Resolves the similar-verse references of one ayah into displayable data. */
export function useSimilar(text: SurahText | undefined, ayah: number, index: SurahMeta[]): Similar[] {
  const [list, setList] = useState<Similar[]>([]);
  useEffect(() => {
    let alive = true;
    const refs = text?.sim?.[ayah] ?? [];
    setList([]);
    Promise.all(
      refs.map(async ([s, a, st1, st2, len]) => {
        const other = await loadSurah(s);
        return {
          surah: s,
          ayah: a,
          name: index[s - 1].name,
          words: other.ayahs[a],
          there: [st2, st2 + len] as [number, number],
          here: [st1, st1 + len] as [number, number],
        };
      }),
    ).then(
      (r) => alive && setList(r),
      () => undefined,
    );
    return () => {
      alive = false;
    };
  }, [text, ayah, index]);
  return list;
}

export function useTafsir(surah: number, ayah: number): string | undefined {
  const [t, setT] = useState<string>();
  useEffect(() => {
    let alive = true;
    setT(undefined);
    if (!surah) return;
    loadTafsir(surah).then(
      (all) => alive && setT(all[ayah]),
      () => undefined,
    );
    return () => {
      alive = false;
    };
  }, [surah, ayah]);
  return t;
}

/** The similar verse whose shared run ends right before word `i` of this ayah –
 *  i.e. the point where the two verses part ways and confusion usually happens. */
export function divergenceAt(similar: Similar[], i: number): Similar | undefined {
  return similar.find((s) => s.here[1] === i && s.here[1] - s.here[0] >= 3);
}
