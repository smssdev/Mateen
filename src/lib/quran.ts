export interface SurahMeta {
  n: number;
  name: string;
  en: string;
  type: string;
  ayahs: number;
  words: number;
  juz: number;
}

/** [surah (1-based), ayah (0-based), startHere, startThere, sharedLength] */
export type SimilarRef = [number, number, number, number, number];

export interface SurahText {
  n: number;
  ayahs: string[][];
  /** ayah index → verses elsewhere that share a run of words with it (mutashabihat) */
  sim?: Record<number, SimilarRef[]>;
}

const base = import.meta.env.BASE_URL;
let indexPromise: Promise<SurahMeta[]> | undefined;
const surahCache = new Map<number, Promise<SurahText>>();

export function loadIndex(): Promise<SurahMeta[]> {
  indexPromise ??= fetch(`${base}quran/index.json`).then((r) => {
    if (!r.ok) throw new Error('تعذر تحميل فهرس السور');
    return r.json();
  });
  return indexPromise;
}

export function loadSurah(n: number): Promise<SurahText> {
  let p = surahCache.get(n);
  if (!p) {
    p = fetch(`${base}quran/${n}.json`).then((r) => {
      if (!r.ok) throw new Error('تعذر تحميل السورة');
      return r.json();
    });
    p.catch(() => surahCache.delete(n));
    surahCache.set(n, p);
  }
  return p;
}

/** Removes diacritics and Quranic annotation marks so names can be searched. */
export function plain(text: string): string {
  return text
    .replace(/[ؐ-ًؚ-ٰٟۖ-ۭ࣓-ࣿ]/g, '')
    .replace(/[ٱأإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .trim();
}

export const toArabicDigits = (n: number) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[+d]);

export const RECITERS: { id: string; name: string }[] = [
  { id: 'Husary_128kbps', name: 'محمود خليل الحصري' },
  { id: 'Husary_Muallim_128kbps', name: 'الحصري (المعلم)' },
  { id: 'Minshawy_Murattal_128kbps', name: 'محمد صديق المنشاوي' },
  { id: 'Alafasy_128kbps', name: 'مشاري العفاسي' },
  { id: 'Abdul_Basit_Murattal_192kbps', name: 'عبد الباسط عبد الصمد' },
];

export function audioUrl(reciter: string, surah: number, ayahIndex: number): string {
  const pad = (n: number) => String(n).padStart(3, '0');
  return `https://everyayah.com/data/${reciter}/${pad(surah)}${pad(ayahIndex + 1)}.mp3`;
}

/** [surah, firstAyah, surah, lastAyah] (1-based) for every juz and manzil. */
export interface Parts {
  juz: [number, number, number, number][];
  manzil: [number, number, number, number][];
}
let partsPromise: Promise<Parts> | undefined;
export function loadParts(): Promise<Parts> {
  partsPromise ??= fetch(`${base}quran/parts.json`).then((r) => {
    if (!r.ok) throw new Error('تعذر تحميل الأجزاء');
    return r.json();
  });
  return partsPromise;
}

const tafsirCache = new Map<number, Promise<string[]>>();
/** al-Muyassar tafsir, one string per ayah. */
export function loadTafsir(n: number): Promise<string[]> {
  let p = tafsirCache.get(n);
  if (!p) {
    p = fetch(`${base}tafsir/${n}.json`).then((r) => {
      if (!r.ok) throw new Error('تعذر تحميل التفسير');
      return r.json();
    });
    p.catch(() => tafsirCache.delete(n));
    tafsirCache.set(n, p);
  }
  return p;
}
