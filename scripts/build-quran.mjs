// Converts the Tanzil Uthmani text (as served by api.alquran.cloud, edition
// "quran-uthmani") into the compact per-surah files the app loads lazily.
//
// Usage:
//   curl -sS https://api.alquran.cloud/v1/quran/quran-uthmani -o quran-src.json
//   node scripts/build-quran.mjs quran-src.json
//
// Output:
//   public/quran/index.json   – surah metadata
//   public/quran/<n>.json     – { n, ayahs: string[][] }  (words per ayah)

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const src = process.argv[2];
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
let total = 0;

for (const s of surahs) {
  const ayahs = s.ayahs.map((a, i) => {
    let words = a.text.replace(/^﻿/, '').trim().split(/\s+/);
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
  writeFileSync(join(outDir, `${s.number}.json`), JSON.stringify({ n: s.number, ayahs }));
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
console.log(`wrote ${index.length} surahs, ${total} ayahs to ${outDir}`);
