import { toArabicDigits } from '../lib/quran';
import { useCallback, useEffect, useRef, useState } from 'react';

interface Props {
  words: string[];
  hintLength: boolean;
  /** Strength per word (0…5) from earlier sessions; weak words get a subtle marker once revealed. */
  strength?: number[];
  onFinish: (wrong: boolean[]) => void;
  finishLabel: string;
  extraActions?: React.ReactNode;
}

/**
 * The core exercise: every word of the ayah is hidden. Try to recall the next
 * word, then tap or drag a finger across it to reveal it. A revealed word
 * counts as correct unless you tap it (or press ✗) to mark it as a mistake.
 */
export function WordRecall({ words, hintLength, strength, onFinish, finishLabel, extraActions }: Props) {
  const [revealed, setRevealed] = useState(0);
  const [wrong, setWrong] = useState<boolean[]>(() => words.map(() => false));
  const revealedRef = useRef(0);
  revealedRef.current = revealed;
  const done = revealed >= words.length;

  const reveal = useCallback(
    (upTo?: number) => {
      setRevealed((r) => Math.min(words.length, upTo === undefined ? r + 1 : Math.max(r, upTo + 1)));
    },
    [words.length],
  );

  const toggle = useCallback((i: number) => {
    if (i < 0 || i >= revealedRef.current) return;
    setWrong((w) => w.map((v, j) => (j === i ? !v : v)));
  }, []);

  const revealRest = () => {
    setWrong((w) => w.map((v, j) => (j >= revealedRef.current ? true : v)));
    setRevealed(words.length);
  };

  // ---- pointer gesture: tap the next hidden word or drag across words ----
  const gesture = useRef<{ downIdx: number; downWasRevealed: boolean; revealedDuring: boolean } | null>(null);

  const idxAt = (x: number, y: number): number => {
    const el = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-idx]');
    return el ? Number(el.dataset.idx) : -1;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    const i = idxAt(e.clientX, e.clientY);
    gesture.current = { downIdx: i, downWasRevealed: i >= 0 && i < revealedRef.current, revealedDuring: false };
    if (i >= 0 && i === revealedRef.current) {
      revealedRef.current = i + 1;
      reveal(i);
      gesture.current.revealedDuring = true;
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const g = gesture.current;
    if (!g) return;
    const i = idxAt(e.clientX, e.clientY);
    if (i >= 0 && i === revealedRef.current) {
      revealedRef.current = i + 1;
      reveal(i);
      g.revealedDuring = true;
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const g = gesture.current;
    gesture.current = null;
    if (!g || g.revealedDuring || !g.downWasRevealed) return;
    if (idxAt(e.clientX, e.clientY) === g.downIdx) toggle(g.downIdx);
  };

  // ---- keyboard ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
      // Let a focused button handle Enter/Space natively so it isn't triggered twice.
      if (e.target instanceof HTMLButtonElement && (e.key === 'Enter' || e.key === ' ')) return;
      if (e.key === ' ' || e.key === 'ArrowLeft' || (e.key === 'Enter' && !done)) {
        e.preventDefault();
        if (!done) reveal();
      } else if (e.key === 'Enter' && done) {
        e.preventDefault();
        onFinish(wrong);
      } else if (e.key.toLowerCase() === 'x' || e.key === 'Backspace' || e.key === 'ء') {
        e.preventDefault();
        toggle(revealedRef.current - 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [done, onFinish, reveal, toggle, wrong]);

  const mistakes = wrong.filter(Boolean).length;

  return (
    <div className="recall">
      <div
        className="ayah-words"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (gesture.current = null)}
      >
        {words.map((w, i) => {
          if (i < revealed) {
            const weak = !wrong[i] && strength && strength[i] === 0;
            return (
              <span
                key={i}
                data-idx={i}
                className={`word revealed${wrong[i] ? ' wrong' : ''}${weak ? ' was-weak' : ''}`}
                title={wrong[i] ? 'اضغط لإلغاء الخطأ' : 'اضغط إن كنت أخطأت'}
              >
                {w}
              </span>
            );
          }
          // With the length hint on, the blank keeps the real word's width so nothing
          // shifts under the finger while swiping across the ayah.
          return (
            <span
              key={i}
              data-idx={i}
              className={`word hidden${i === revealed ? ' current' : ''}${hintLength ? ' sized' : ''}`}
              aria-label={i === revealed ? 'الكلمة التالية' : undefined}
            >
              {hintLength && <span aria-hidden>{w}</span>}
            </span>
          );
        })}
      </div>

      {!done ? (
        <div className="controls">
          <button className="btn ghost" onClick={revealRest} title="كشف بقية الآية واحتسابها أخطاء">
            لا أذكر
          </button>
          <button
            className="btn danger"
            disabled={revealed === 0}
            onClick={() => toggle(revealed - 1)}
            title="تعليم الكلمة الأخيرة كخطأ (X)"
          >
            ✗ أخطأت
          </button>
          <button className="btn primary grow" onClick={() => reveal()} title="كشف الكلمة التالية (مسافة)">
            اكشف الكلمة
          </button>
        </div>
      ) : (
        <div className="controls">
          <div className={`verdict ${mistakes ? 'bad' : 'good'}`}>
            {mistakes === 0 ? 'أحسنت! بلا أخطاء' : `${toArabicDigits(mistakes)} ${mistakes === 1 ? 'خطأ' : mistakes === 2 ? 'خطآن' : 'أخطاء'}`}
          </div>
          {extraActions}
          <button className="btn primary grow" onClick={() => onFinish(wrong)} autoFocus>
            {finishLabel}
          </button>
        </div>
      )}
      <p className="tip">
        {done
          ? 'اضغط على أي كلمة أخطأت فيها لتعليمها قبل المتابعة.'
          : 'تذكّر الكلمة ثم اضغط عليها أو مرّر إصبعك فوق الكلمات لكشفها. اضغط على الكلمة المكشوفة إن أخطأت فيها.'}
      </p>
    </div>
  );
}
