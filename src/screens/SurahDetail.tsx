import { useEffect, useState } from 'react';
import { SurahMeta, SurahText, loadSurah, toArabicDigits } from '../lib/quran';
import { dayNumber, mastery, MAX_STRENGTH } from '../lib/srs';
import { removeGoal, resetSurah, useStore } from '../lib/store';
import { Stat } from './Session';

interface Props {
  meta: SurahMeta;
  onStart: () => void;
  onPractice: (ayahs: number[]) => void;
  onBack: () => void;
}

export function SurahDetail({ meta, onStart, onPractice, onBack }: Props) {
  const cards = useStore((s) => s.progress[meta.n]) ?? {};
  const [text, setText] = useState<SurahText>();
  const [selected, setSelected] = useState<number>();
  const today = dayNumber();

  useEffect(() => {
    loadSurah(meta.n).then(setText, () => undefined);
  }, [meta.n]);

  const started = Object.keys(cards).map(Number).sort((a, b) => a - b);
  const due = started.filter((i) => cards[i].due <= today).length;
  const weak = started.filter((i) => mastery(cards[i]) < 0.5);
  const avg = started.length ? Math.round((started.reduce((t, i) => t + mastery(cards[i]), 0) / started.length) * 100) : 0;
  const sel = selected !== undefined ? cards[selected] : undefined;

  return (
    <div className="screen">
      <header className="page-head">
        <button className="icon-btn" onClick={onBack} aria-label="رجوع">
          →
        </button>
        <h1>سورة {meta.name}</h1>
      </header>

      <div className="stat-row">
        <Stat label="آية بدأتها" value={started.length} />
        <Stat label="من" value={meta.ayahs} />
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
      <div className="ayah-grid">
        {Array.from({ length: meta.ayahs }, (_, i) => {
          const c = cards[i];
          const m = mastery(c);
          return (
            <button
              key={i}
              className={`cell${c ? '' : ' empty'}${c && c.due <= today ? ' due' : ''}${selected === i ? ' sel' : ''}`}
              style={c ? { ['--m' as string]: 0.15 + m * 0.85 } : undefined}
              onClick={() => setSelected(i === selected ? undefined : i)}
              aria-label={`الآية ${i + 1}`}
            >
              {toArabicDigits(i + 1)}
            </button>
          );
        })}
      </div>

      {selected !== undefined && (
        <div className="ayah-detail">
          <div className="section-head">
            <strong>الآية {toArabicDigits(selected + 1)}</strong>
            <button className="btn small primary" onClick={() => onPractice([selected])}>
              تدرّب عليها
            </button>
          </div>
          {text ? (
            <p className="ayah-words full static">
              {text.ayahs[selected].map((w, i) => (
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
        <button
          className="btn ghost small"
          onClick={() => confirm('حذف تقدمك في هذه السورة؟') && resetSurah(meta.n)}
        >
          تصفير التقدم
        </button>
        <button
          className="btn ghost small"
          onClick={() => {
            if (confirm('إزالة السورة من أهدافك؟ (يبقى تقدمك محفوظًا)')) {
              removeGoal(meta.n);
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
