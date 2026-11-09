import { useEffect, useState } from 'react';
import { loadSurah, Parts, SurahMeta, SurahText, toArabicDigits } from '../lib/quran';
import { AyahRef, Goal, goalId, goalSubtitle, goalTitle, segments as goalSegments } from '../lib/goals';
import { dayNumber, mastery, MAX_STRENGTH } from '../lib/srs';
import { removeGoal, resetRange, useStore } from '../lib/store';
import { Stat } from './Session';

interface Props {
  goal: Pick<Goal, 'kind' | 'n'>;
  index: SurahMeta[];
  parts: Parts;
  onStart: () => void;
  onPractice: (ayahs: AyahRef[]) => void;
  onBack: () => void;
}

export function GoalDetail({ goal, index, parts, onStart, onPractice, onBack }: Props) {
  const progress = useStore((s) => s.progress);
  const [selected, setSelected] = useState<AyahRef>();
  const [text, setText] = useState<SurahText>();
  const today = dayNumber();
  const segs = goalSegments(goal, index, parts);

  useEffect(() => {
    if (selected) loadSurah(selected.surah).then(setText, () => undefined);
  }, [selected]);

  const started: AyahRef[] = [];
  let total = 0;
  let due = 0;
  let sum = 0;
  for (const seg of segs) {
    for (let i = seg.from; i <= seg.to; i++) {
      total++;
      const c = progress[seg.surah]?.[i];
      if (!c) continue;
      started.push({ surah: seg.surah, ayah: i });
      sum += mastery(c);
      if (c.due <= today) due++;
    }
  }
  const weak = started.filter((r) => mastery(progress[r.surah]?.[r.ayah]) < 0.5);
  const avg = started.length ? Math.round((sum / started.length) * 100) : 0;
  const sel = selected ? progress[selected.surah]?.[selected.ayah] : undefined;
  const isSel = (s: number, a: number) => selected?.surah === s && selected.ayah === a;

  return (
    <div className="screen">
      <header className="page-head">
        <button className="icon-btn" onClick={onBack} aria-label="رجوع">
          →
        </button>
        <div>
          <h1>{goalTitle(goal, index)}</h1>
          <p className="muted small">{goalSubtitle(goal, index, parts)}</p>
        </div>
      </header>

      <div className="stat-row">
        <Stat label="آية بدأتها" value={started.length} />
        <Stat label="من" value={total} />
        <Stat label="مستحقة" value={due} />
        <Stat label="متوسط الإتقان" value={`${toArabicDigits(avg)}٪`} />
      </div>

      <div className="controls wrap">
        <button className="btn primary grow" onClick={onStart}>
          جلسة اليوم
        </button>
        <button className="btn" disabled={!weak.length} onClick={() => onPractice(weak)}>
          تدريب على الضعيفة ({toArabicDigits(weak.length)})
        </button>
        <button className="btn" disabled={!started.length} onClick={() => onPractice(started)}>
          سرد ما حفظت
        </button>
      </div>

      <h3>خريطة الإتقان</h3>
      <p className="muted small">كل مربع آية. كلما كان اللون أعمق كان حفظك لها أمتن. اضغط على آية لتفاصيلها.</p>
      {segs.map((seg) => (
        <section key={seg.surah}>
          {segs.length > 1 && <h4 className="grid-title">سورة {index[seg.surah - 1].name}</h4>}
          <div className="ayah-grid">
            {Array.from({ length: seg.to - seg.from + 1 }, (_, k) => {
              const i = seg.from + k;
              const c = progress[seg.surah]?.[i];
              const m = mastery(c);
              return (
                <button
                  key={i}
                  className={`cell${c ? '' : ' empty'}${c && c.due <= today ? ' due' : ''}${isSel(seg.surah, i) ? ' sel' : ''}`}
                  style={c ? { ['--m' as string]: 0.15 + m * 0.85 } : undefined}
                  onClick={() => setSelected(isSel(seg.surah, i) ? undefined : { surah: seg.surah, ayah: i })}
                  aria-label={`الآية ${i + 1}`}
                >
                  {toArabicDigits(i + 1)}
                </button>
              );
            })}
          </div>
        </section>
      ))}

      {selected && (
        <div className="ayah-detail">
          <div className="section-head">
            <strong>
              {index[selected.surah - 1].name} {toArabicDigits(selected.ayah + 1)}
            </strong>
            <button className="btn small primary" onClick={() => onPractice([selected])}>
              تدرّب عليها
            </button>
          </div>
          {text?.n === selected.surah ? (
            <p className="ayah-words full static">
              {text.ayahs[selected.ayah].map((w, i) => (
                <span
                  key={i}
                  className="word revealed"
                  style={sel ? { ['--s' as string]: 1 - (sel.w[i] ?? 0) / MAX_STRENGTH } : undefined}
                  data-weak={sel && sel.w[i] < 2 ? '' : undefined}
                  title={sel ? `أخطأت فيها ${sel.errs[i] ?? 0} مرة` : undefined}
                >
                  {w}
                </span>
              ))}
            </p>
          ) : (
            <p className="muted">…</p>
          )}
          {sel ? (
            <p className="muted small">
              المراجعة القادمة: {sel.due <= today ? 'اليوم' : `بعد ${toArabicDigits(sel.due - today)} يوم`} · مرات
              النسيان: {toArabicDigits(sel.lapses)} · الكلمات المظللة هي مواضع ضعفك.
            </p>
          ) : (
            <p className="muted small">لم تبدأ هذه الآية بعد.</p>
          )}
        </div>
      )}

      <div className="danger-zone">
        <button className="btn ghost small" onClick={() => confirm('حذف تقدمك في هذا الهدف؟') && resetRange(segs)}>
          تصفير التقدم
        </button>
        <button
          className="btn ghost small"
          onClick={() => {
            if (confirm('إزالة من أهدافك؟ (يبقى تقدمك محفوظًا)')) {
              removeGoal(goalId(goal));
              onBack();
            }
          }}
        >
          إزالة من الأهداف
        </button>
      </div>
    </div>
  );
}
