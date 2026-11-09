import { useState } from 'react';
import { SurahPicker } from '../components/SurahPicker';
import { SurahMeta, toArabicDigits } from '../lib/quran';
import { dayNumber, dueCount } from '../lib/srs';
import { addGoal, newIntroducedToday, streak, useStore } from '../lib/store';
import { Stat } from './Session';

interface Props {
  index: SurahMeta[];
  onStart: (surah: number) => void;
  onOpen: (surah: number) => void;
}

export function Home({ index, onStart, onOpen }: Props) {
  const state = useStore((s) => s);
  const [picking, setPicking] = useState(false);
  const today = dayNumber();
  const log = state.log[today];

  return (
    <div className="screen">
      <section className="hero">
        <div>
          <h1>متين</h1>
          <p>احفظ القرآن كلمةً كلمة، وثبّته بمراجعة ذكية.</p>
        </div>
        <div className="stat-row compact">
          <Stat label="يوم متتالٍ" value={streak(state)} />
          <Stat label="آية اليوم" value={(log?.reviews ?? 0) + (log?.learned ?? 0)} />
          <Stat label="كلمة اليوم" value={log?.words ?? 0} />
        </div>
      </section>

      <div className="section-head">
        <h2>أهدافي</h2>
        <button className="btn small" onClick={() => setPicking(true)}>
          + إضافة سورة
        </button>
      </div>

      {state.goals.length === 0 && (
        <div className="empty">
          <p>ابدأ باختيار السورة التي تريد حفظها أو مراجعتها.</p>
          <p className="muted">
            سيعرض عليك التطبيق كل يوم ما يحتاج إلى مراجعة أولًا — مع التركيز على المواضع التي تخطئ فيها — ثم آياتٍ
            جديدة لتحفظها.
          </p>
          <button className="btn primary" onClick={() => setPicking(true)}>
            اختر سورة
          </button>
        </div>
      )}

      <ul className="goals">
        {state.goals.map((g) => {
          const meta = index[g.surah - 1];
          if (!meta) return null;
          const cards = state.progress[g.surah] ?? {};
          const started = Object.keys(cards).length;
          const due = dueCount(cards, today);
          const newLeft = Math.min(
            meta.ayahs - started,
            Math.max(0, state.settings.newPerDay - newIntroducedToday(state, g.surah)),
          );
          const pct = Math.round((started / meta.ayahs) * 100);
          return (
            <li key={g.surah} className="goal">
              <button className="goal-main" onClick={() => onOpen(g.surah)}>
                <span className="surah-num">{toArabicDigits(meta.n)}</span>
                <span className="goal-text">
                  <strong>سورة {meta.name}</strong>
                  <span className="muted">
                    {toArabicDigits(started)} / {toArabicDigits(meta.ayahs)} آية · {toArabicDigits(pct)}٪
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
                <button className="btn primary small" onClick={() => onStart(g.surah)}>
                  ابدأ
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {picking && (
        <SurahPicker
          index={index}
          exclude={state.goals.map((g) => g.surah)}
          onPick={(n) => {
            addGoal(n);
            setPicking(false);
          }}
          onClose={() => setPicking(false)}
        />
      )}
    </div>
  );
}
