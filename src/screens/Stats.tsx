import { useEffect, useMemo, useState } from 'react';
import { loadSurah, SurahMeta, SurahText, toArabicDigits } from '../lib/quran';
import { dayNumber, mastery } from '../lib/srs';
import { streak, useStore } from '../lib/store';
import { Stat } from './Session';

interface Weak {
  surah: number;
  ayah: number;
  word: number;
  errs: number;
  strength: number;
}

export function Stats({ index, onPractice }: { index: SurahMeta[]; onPractice: (surah: number, ayahs: number[]) => void }) {
  const state = useStore((s) => s);
  const today = dayNumber();
  const [texts, setTexts] = useState<Record<number, SurahText>>({});

  const totals = useMemo(() => {
    let ayahs = 0;
    let words = 0;
    let solid = 0;
    const weak: Weak[] = [];
    for (const [s, cards] of Object.entries(state.progress)) {
      for (const [a, c] of Object.entries(cards)) {
        ayahs++;
        words += c.w.length;
        if (mastery(c) >= 0.7) solid++;
        c.errs.forEach((e, i) => {
          if (e > 0) weak.push({ surah: +s, ayah: +a, word: i, errs: e, strength: c.w[i] });
        });
      }
    }
    weak.sort((x, y) => x.strength - y.strength || y.errs - x.errs);
    return { ayahs, words, solid, weak: weak.slice(0, 25) };
  }, [state.progress]);

  useEffect(() => {
    const need = [...new Set(totals.weak.map((w) => w.surah))].filter((n) => !texts[n]);
    need.forEach((n) => loadSurah(n).then((t) => setTexts((x) => ({ ...x, [n]: t })), () => undefined));
  }, [totals.weak, texts]);

  const days = Array.from({ length: 30 }, (_, i) => today - 29 + i);
  const max = Math.max(1, ...days.map((d) => (state.log[d]?.reviews ?? 0) + (state.log[d]?.learned ?? 0)));

  return (
    <div className="screen">
      <header className="page-head">
        <h1>إحصاءاتي</h1>
      </header>
      <div className="stat-row">
        <Stat label="يوم متتالٍ" value={streak(state)} />
        <Stat label="آية محفوظة" value={totals.ayahs} />
        <Stat label="آية متقنة" value={totals.solid} />
        <Stat label="كلمة" value={totals.words} />
      </div>

      <h3>نشاط آخر ٣٠ يومًا</h3>
      <div className="chart" role="img" aria-label="عدد الآيات المراجعة والمحفوظة في كل يوم">
        {days.map((d) => {
          const l = state.log[d];
          const r = l?.reviews ?? 0;
          const n = l?.learned ?? 0;
          return (
            <div key={d} className="col" title={`${r} مراجعة، ${n} جديدة`}>
              <span className="seg new" style={{ height: `${(n / max) * 100}%` }} />
              <span className="seg review" style={{ height: `${(r / max) * 100}%` }} />
            </div>
          );
        })}
      </div>
      <div className="legend">
        <span>
          <i className="review" /> مراجعة
        </span>
        <span>
          <i className="new" /> جديدة
        </span>
      </div>

      <h3>أكثر الكلمات التي تتعثّر فيها</h3>
      {totals.weak.length === 0 ? (
        <p className="muted">لا توجد أخطاء مسجلة بعد.</p>
      ) : (
        <ul className="stumbles">
          {totals.weak.map((w) => {
            const t = texts[w.surah];
            const words = t?.ayahs[w.ayah];
            return (
              <li key={`${w.surah}-${w.ayah}-${w.word}`}>
                <button className="link" onClick={() => onPractice(w.surah, [w.ayah])}>
                  {index[w.surah - 1]?.name} {toArabicDigits(w.ayah + 1)}
                </button>
                <span className="q">
                  {words ? (
                    <>
                      <span className="muted">{words.slice(Math.max(0, w.word - 2), w.word).join(' ')} </span>
                      <mark>{words[w.word]}</mark>
                    </>
                  ) : (
                    '…'
                  )}
                </span>
                <span className="muted">×{toArabicDigits(w.errs)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
