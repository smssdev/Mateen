import { useMemo, useState } from 'react';
import { MasteryDonut } from '../components/MasteryDonut';
import { SurahPicker } from '../components/SurahPicker';
import { Goal, goalId, goalSubtitle, goalTitle, segmentAyahs, segments } from '../lib/goals';
import { Parts, SurahMeta, toArabicDigits } from '../lib/quran';
import { dayNumber, Level, rangeCounts, wordLevel } from '../lib/srs';
import { addGoal, newIntroducedToday, streak, useStore } from '../lib/store';
import { Stat } from './Session';

interface Props {
  index: SurahMeta[];
  parts: Parts;
  onStart: (goal: Goal) => void;
  onOpen: (goal: Goal) => void;
}

export function Home({ index, parts, onStart, onOpen }: Props) {
  const state = useStore((s) => s);
  const [picking, setPicking] = useState<Goal['kind']>();
  const today = dayNumber();
  const log = state.log[today];

  const totalWords = useMemo(() => index.reduce((t, s) => t + s.words, 0), [index]);
  const levels = useMemo(() => {
    const c: Record<Level, number> = { solid: 0, medium: 0, basic: 0, intro: 0 };
    for (const cards of Object.values(state.progress)) for (const card of Object.values(cards)) for (const w of card.w) c[wordLevel(w)]++;
    return c;
  }, [state.progress]);

  return (
    <div className="screen">
      <section className="hero">
        <div className="hero-top">
          <div>
            <h1>متين</h1>
            <p>احفظ القرآن كلمةً كلمة، وثبّته بمراجعة ذكية.</p>
          </div>
        </div>
        <MasteryDonut counts={levels} total={totalWords} />
        <div className="stat-row compact">
          <Stat label="يوم متتالٍ" value={streak(state)} />
          <Stat label="آية اليوم" value={(log?.reviews ?? 0) + (log?.learned ?? 0)} />
          <Stat label="كلمة اليوم" value={log?.words ?? 0} />
        </div>
      </section>

      <div className="section-head">
        <h2>أهدافي</h2>
      </div>

      {state.goals.length === 0 && (
        <div className="empty">
          <p>ابدأ باختيار ما تريد حفظه أو مراجعته: سورة، أو جزء، أو حزب من تحزيب الصحابة.</p>
          <p className="muted">
            سيعرض عليك التطبيق كل يوم ما يحتاج إلى مراجعة أولًا — مع التركيز على المواضع التي تخطئ فيها — ثم آياتٍ
            جديدة لتحفظها.
          </p>
        </div>
      )}

      <ul className="goals">
        {state.goals.map((g) => {
          const segs = segments(g, index, parts);
          const total = segmentAyahs(segs);
          const { due, started } = rangeCounts(state.progress, segs, today);
          const newLeft = Math.min(total - started, Math.max(0, state.settings.newPerDay - newIntroducedToday(state, goalId(g))));
          const pct = Math.round((started / total) * 100);
          return (
            <li key={goalId(g)} className="goal">
              <button className="goal-main" onClick={() => onOpen(g)}>
                <span className={`surah-num k-${g.kind}`}>{toArabicDigits(g.n)}</span>
                <span className="goal-text">
                  <strong>{goalTitle(g, index)}</strong>
                  <span className="muted">
                    {g.kind !== 'surah' && `${goalSubtitle(g, index, parts)} · `}
                    {toArabicDigits(started)} / {toArabicDigits(total)} آية · {toArabicDigits(pct)}٪
                  </span>
                  <span className="bar">
                    <span style={{ width: `${pct}%` }} />
                  </span>
                </span>
              </button>
              <div className="goal-side">
                {due > 0 && <span className="pill review">{toArabicDigits(due)} مراجعة</span>}
                {newLeft > 0 && <span className="pill new">{toArabicDigits(newLeft)} جديدة</span>}
                {due === 0 && newLeft === 0 && <span className="pill done">✓ أنهيت اليوم</span>}
                <button className="btn primary small" onClick={() => onStart(g)}>
                  ابدأ
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="add-row">
        <button className="btn" onClick={() => setPicking('surah')}>
          + السور
        </button>
        <button className="btn" onClick={() => setPicking('juz')}>
          + الأجزاء
        </button>
        <button className="btn" onClick={() => setPicking('manzil')}>
          + تحزيب الصحابة
        </button>
      </div>

      {picking && (
        <SurahPicker
          index={index}
          parts={parts}
          initialTab={picking}
          exclude={state.goals.map(goalId)}
          onPick={(kind, n) => {
            addGoal(kind, n);
            setPicking(undefined);
          }}
          onClose={() => setPicking(undefined)}
        />
      )}
    </div>
  );
}
