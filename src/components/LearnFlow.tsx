import { useEffect, useState } from 'react';
import { usePlayer } from '../lib/audio';
import { Similar } from '../lib/linking';
import { toArabicDigits } from '../lib/quran';
import { SimilarList } from './SimilarList';

interface Props {
  words: string[];
  prevWords?: string[];
  tafsir?: string;
  similar: Similar[];
  url: string;
  autoPlay: boolean;
  onReady: () => void;
}

const STEPS = [
  { key: 'understand', label: 'افهم' },
  { key: 'link', label: 'اربط' },
  { key: 'repeat', label: 'ردّد' },
] as const;

/**
 * A new ayah is learned in three steps:
 *  1. افهم – read its meaning (al-Muyassar) so memorisation rests on understanding.
 *  2. اربط – the "link ring" from the end of the previous ayah into this one,
 *     plus look-alike verses and the exact word where they part ways.
 *  3. ردّد – listen and repeat, then test yourself.
 */
export function LearnFlow({ words, prevWords, tafsir, similar, url, autoPlay, onReady }: Props) {
  const [step, setStep] = useState(0);
  const p = usePlayer(url);
  const [repeat, setRepeat] = useState(3);

  useEffect(() => {
    if (step === 2 && autoPlay) p.play(repeat);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && /BUTTON|SELECT|INPUT/.test(e.target.tagName)) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (step < 2) setStep(step + 1);
        else onReady();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step, onReady]);

  const tail = prevWords?.slice(-4) ?? [];
  const head = words.slice(0, Math.min(3, words.length));

  return (
    <div className="learn">
      <ol className="stepper" aria-label="خطوات حفظ الآية">
        {STEPS.map((s, i) => (
          <li key={s.key}>
            <button className={i === step ? 'on' : i < step ? 'done' : ''} onClick={() => setStep(i)}>
              <span>{toArabicDigits(i + 1)}</span>
              {s.label}
            </button>
          </li>
        ))}
      </ol>

      <div className="ayah-words full">
        {words.map((w, i) => (
          <span key={i} className={`word revealed${step === 1 && i < head.length ? ' link-head' : ''}`}>
            {w}
          </span>
        ))}
      </div>

      {step === 0 && (
        <section className="meaning">
          <h4>المعنى</h4>
          <p>{tafsir ?? '…'}</p>
          <small>التفسير الميسّر</small>
        </section>
      )}

      {step === 1 && (
        <>
          <section className="link-ring">
            <h4>حلقة الوصل</h4>
            {tail.length ? (
              <p className="ring">
                <span className="prev">… {tail.join(' ')}</span>
                <span className="chain" aria-hidden>
                  ⟵
                </span>
                <span className="next">{head.join(' ')} …</span>
              </p>
            ) : (
              <p className="muted">هذه أول السورة — اربطها باسم السورة وموضوعها.</p>
            )}
            {tail.length > 0 && (
              <p className="muted small">
                ردّد آخر الآية السابقة موصولًا بأول هذه حتى لا تنقطع عند الانتقال بينهما.
              </p>
            )}
          </section>
          <SimilarList similar={similar} words={words} />
        </>
      )}

      {step === 2 && (
        <section className="repeat-box">
          <p className="muted">استمع وردّد الآية حتى تحفظها، ثم اختبر نفسك كلمة كلمة.</p>
          <div className="controls">
            <button className="btn" onClick={() => p.toggle(repeat)}>
              {p.status === 'playing' || p.status === 'loading' ? '■ إيقاف' : '▶ استماع'}
            </button>
            <label className="repeat">
              تكرار
              <select value={repeat} onChange={(e) => setRepeat(Number(e.target.value))}>
                {[1, 3, 5, 10].map((n) => (
                  <option key={n} value={n}>
                    {toArabicDigits(n)}×
                  </option>
                ))}
              </select>
            </label>
          </div>
          {p.status === 'error' && <p className="tip">تعذّر تشغيل التلاوة — تحقق من اتصالك بالإنترنت.</p>}
        </section>
      )}

      <div className="controls">
        <button className="btn ghost" onClick={onReady}>
          اختبرني مباشرة
        </button>
        <button className="btn primary grow" onClick={() => (step < 2 ? setStep(step + 1) : onReady())}>
          {step === 0 ? 'التالي: اربط ←' : step === 1 ? 'التالي: ردّد ←' : 'حفظتُها، اختبرني'}
        </button>
      </div>
    </div>
  );
}
