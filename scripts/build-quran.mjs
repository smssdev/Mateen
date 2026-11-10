// Converts the Tanzil Uthmani text (as served by api.alquran.cloud, edition
// "quran-uthmani") into the compact per-surah files the app loads lazily.
//
// Usage:
//   curl -sS https://api.alquran.cloud/v1/quran/quran-uthmani -o quran-src.json
//   curl -sS https://api.alquran.cloud/v1/quran/ar.muyassar -o muyassar.json
//   node scripts/build-quran.mjs quran-src.json [muyassar.json]
//
// Output:
//   public/quran/index.json   – surah metadata
//   public/quran/parts.json   – juz / manzil boundaries
//   public/quran/<n>.json     – { n, ayahs: string[][], sim }  (words per ayah + similar verses)
//   public/tafsir/<n>.json    – string[]  (al-Muyassar, one entry per ayah)

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const src = process.argv[2];
const tafsirSrc = process.argv[3];
if (!src) {
  console.error('usage: node scripts/build-quran.mjs <quran-uthmani.json>');
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'quran');
mkdirSync(outDir, { recursive: true });

const surahs = JSON.parse(readFileSync(src, 'utf8')).data.surahs;

// Stand-alone pause marks (ۖ ۗ ۚ …) are attached to the previous word so a
// "word" in the app is always something the reader actually recites.
const isPauseMark = (w) => /^[ۖ-ۭ]+$/u.test(w);

const index = [];
const allAyahs = [];
let total = 0;

for (const s of surahs) {
  const ayahs = s.ayahs.map((a, i) => {
    let words = a.text.replace(/^\uFEFF/, '').trim().split(/\s+/);
    // The source prefixes the basmala to the first ayah of every surah except
    // al-Fatiha (where it *is* ayah 1) and at-Tawba (which has none).
    if (i === 0 && s.number !== 1 && s.number !== 9) words = words.slice(4);
    const merged = [];
    for (const w of words) {
      if (isPauseMark(w) && merged.length) merged[merged.length - 1] += ' ' + w;
      else merged.push(w);
    }
    return merged;
  });
  total += ayahs.length;
  allAyahs.push(ayahs);
  index.push({
    n: s.number,
    name: s.name.replace(/^سُورَةُ\s+/u, ''),
    en: s.englishName,
    type: s.revelationType === 'Meccan' ? 'مكية' : 'مدنية',
    ayahs: ayahs.length,
    words: ayahs.reduce((t, a) => t + a.length, 0),
    juz: s.ayahs[0].juz,
  });
}

writeFileSync(join(outDir, 'index.json'), JSON.stringify(index));

// ---------- similar verses (mutashabihat) ----------
// Two ayahs are "similar" when they share a run of at least N normalised words.
// Formulaic phrases that occur everywhere (e.g. «يا أيها الذين آمنوا») are
// skipped – they rarely cause confusion and would drown out the useful hits.
const N = 4;
const MAX_OCCURRENCES = 12;
const MAX_PER_AYAH = 4;
const norm = (w) =>
  w
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u08D3-\u08FF\u0640]/g, '')
    .replace(/[ٱأإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/\s+/g, '');
const plainAyahs = allAyahs.map((ayahs) => ayahs.map((a) => a.map(norm)));
const grams = new Map();
plainAyahs.forEach((ayahs, si) =>
  ayahs.forEach((words, ai) => {
    for (let i = 0; i + N <= words.length; i++) {
      const key = words.slice(i, i + N).join(' ');
      let list = grams.get(key);
      if (!list) grams.set(key, (list = []));
      list.push([si, ai, i]);
    }
  }),
);
// sim[surahIdx][ayahIdx] = [[surah, ayah, startHere, startThere, length], ...]
const sim = allAyahs.map((ayahs) => ayahs.map(() => new Map()));
for (const list of grams.values()) {
  const distinct = new Set(list.map(([s, a]) => `${s}:${a}`));
  if (distinct.size < 2 || distinct.size > MAX_OCCURRENCES) continue;
  for (const [s1, a1, i1] of list) {
    for (const [s2, a2, i2] of list) {
      if (s1 === s2 && a1 === a2) continue;
      const key = `${s2}:${a2}`;
      const prev = sim[s1][a1].get(key);
      if (prev && i1 >= prev[2] && i1 < prev[2] + prev[4]) continue; // inside a run we already have
      // extend the match in both directions
      const w1 = plainAyahs[s1][a1];
      const w2 = plainAyahs[s2][a2];
      let st1 = i1, st2 = i2;
      while (st1 > 0 && st2 > 0 && w1[st1 - 1] === w2[st2 - 1]) { st1--; st2--; }
      let len = 0;
      while (st1 + len < w1.length && st2 + len < w2.length && w1[st1 + len] === w2[st2 + len]) len++;
      if (!prev || len > prev[4]) sim[s1][a1].set(key, [s2 + 1, a2, st1, st2, len]);
    }
  }
}
let simCount = 0;
allAyahs.forEach((ayahs, si) => {
  const out = {};
  sim[si].forEach((m, ai) => {
    if (!m.size) return;
    out[ai] = [...m.values()].sort((x, y) => y[4] - x[4]).slice(0, MAX_PER_AYAH);
    simCount++;
  });
  writeFileSync(join(outDir, `${si + 1}.json`), JSON.stringify({ n: si + 1, ayahs, sim: out }));
});
console.log(`${simCount} ayahs have similar verses`);

// ---------- tafsir ----------
if (tafsirSrc) {
  const tDir = join(root, 'public', 'tafsir');
  mkdirSync(tDir, { recursive: true });
  const tSurahs = JSON.parse(readFileSync(tafsirSrc, 'utf8')).data.surahs;
  for (const s of tSurahs) {
    writeFileSync(join(tDir, `${s.number}.json`), JSON.stringify(s.ayahs.map((a) => a.text.trim())));
  }
  console.log(`wrote tafsir for ${tSurahs.length} surahs`);
}

// Juz and manzil (the companions' seven-part division) boundaries as
// [surah, firstAyah, surah, lastAyah] with 1-based ayah numbers.
const bounds = (key) => {
  const out = [];
  for (const s of surahs) {
    for (const a of s.ayahs) {
      const k = a[key];
      if (!out[k - 1]) out[k - 1] = [s.number, a.numberInSurah, s.number, a.numberInSurah];
      else out[k - 1].splice(2, 2, s.number, a.numberInSurah);
    }
  }
  return out;
};
writeFileSync(join(outDir, 'parts.json'), JSON.stringify({ juz: bounds('juz'), manzil: bounds('manzil') }));
console.log(`wrote ${index.length} surahs, ${total} ayahs to ${outDir}`);
