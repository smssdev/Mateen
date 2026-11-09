import { useCallback, useEffect, useRef, useState } from 'react';
import { plain, toArabicDigits } from '../lib/quran';
import { MAX_STRENGTH } from '../lib/srs';
import { divergenceAt, Similar } from '../lib/linking';

interface Props {
  words: string[];
  /** Per-word strength (0…MAX_STRENGTH) and lifetime mistakes from earlier sessions. */
  strength?: number[];
  errs?: number[];
  /** Reveal the first word right away (the swipe that finished the previous ayah also reveals this one). */
  autoStart?: boolean;
  /** Last word of the previous ayah, shown faded in the top slot before anything is revealed. */
  prevWord?: string;
  ayahLabel: string;
  /** Text on the bottom card once every word is revealed ("الآية ٣", "إنهاء"…). */
  nextLabel: (mistakes: number) => string;
  onFinish: (wrong: boolean[], chain: boolean) => void;
  footer?: React.ReactNode;
  /** Meaning of the ayah, offered as a hint instead of revealing the word. */
  tafsir?: string;
  /** Look-alike verses: warns right before the word where they part ways. */
  similar?: Similar[];
  warnSimilar?: boolean;
}

const SWIPE_DISTANCE = 45;

/**
 * Word-by-word recitation with two cards:
 *  – bottom: the next hidden word. Recall it, then swipe the card up (or tap it).
 *  – top: the word you just revealed. It counts as correct; tap it if you got it wrong.
 * When the ayah is done the bottom card turns into "next ayah"; swiping it records
 * the result and immediately reveals the first word of the next ayah.
 */
export function CardRecall({
  words,
  strength,
  errs,
  autoStart,
  prevWord,
  ayahLabel,
  nextLabel,
  onFinish,
  footer,
  tafsir,
  similar = [],
  warnSimilar = true,
}: Props) {
  const [revealed, setRevealed] = useState(autoStart ? 1 : 0);
  const [wrong, setWrong] = useState<boolean[]>(() => words.map(() => false));
  // hint shown for the next word: the ayah's meaning or the word's first letter
  const [hint, setHint] = useState<'meaning' | 'letter' | null>(null);
  const [hinted, setHinted] = useState<boolean[]>(() => words.map(() => false));
  const [drag, setDrag] = useState(0);
  const [flash, setFlash] = useState(0); // bumps on every reveal to replay the animation
  const done = revealed >= words.length;
  const last = revealed - 1;

  const advance = useCallback(() => {
    if (done) {
      onFinish(wrong, true);
      return;
    }
    // a word recalled only with a hint is not yet held: count it as a slip
    if (hinted[revealed]) setWrong((w) => w.map((v, j) => (j === revealed ? true : v)));
    setHint(null);
    setRevealed((r) => Math.min(words.length, r + 1));
    setFlash((f) => f + 1);
    navigator.vibrate?.(8);
  }, [done, onFinish, words.length, wrong, hinted, revealed]);

  const showHint = (kind: 'meaning' | 'letter') => {
    setHint((h) => (h === kind ? null : kind));
    setHinted((h) => h.map((v, j) => (j === revealed ? true : v)));
  };

  const toggleLast = useCallback(() => {
    if (last < 0) return;
    setWrong((w) => w.map((v, j) => (j === last ? !v : v)));
    navigator.vibrate?.(20);
  }, [last]);

  const giveUp = () => {
    setWrong((w) => w.map((v, j) => (j >= revealed ? true : v)));
    setRevealed(words.length);
  };

  // ---- swipe-up gesture on the bottom card ----
  const start = useRef<{ y: number; id: number } | null>(null);
  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    start.current = { y: e.clientY, id: e.pointerId };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!start.current) return;
    setDrag(Math.min(0, e.clientY - start.current.y));
  };
  const onUp = (e: React.PointerEvent) => {
    if (!start.current) return;
    const dy = e.clientY - start.current.y;
    start.current = null;
    setDrag(0);
    // a tap or a swipe up both reveal; a short accidental drag down does nothing
    if (dy < -SWIPE_DISTANCE || Math.abs(dy) < 10) advance();
  };

  // ---- keyboard: Space/↑ reveal, X marks the last word wrong ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && /INPUT|SELECT|TEXTAREA|BUTTON/.test(e.target.tagName)) return;
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'Enter') {
        e.preventDefault();
        advance();
      } else if (e.key.toLowerCase() === 'x' || e.key === 'Backspace' || e.key === 'ء') {
        e.preventDefault();
        toggleLast();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [advance, toggleLast]);

  const mistakes = wrong.filter(Boolean).length;
  const nextIdx = revealed;
  const label = nextLabel(mistakes);
  const forkNext = !done && warnSimilar ? divergenceAt(similar, nextIdx) : undefined;
  const forkLast = last >= 0 && wrong[last] ? divergenceAt(similar, last) : undefined;

  return (
    <div className="cards">
      <div className="card-ayah">
        <span>{ayahLabel}</span>
        {done && <span className={`ayah-end ${mistakes ? 'bad' : 'good'}`}>{mistakes ? `${toArabicDigits(mistakes)} ✗` : '✓'}</span>}
      </div>

      {/* top slot: last revealed word */}
      {last >= 0 ? (
        <button
          key={`top-${flash}`}
          className={`wcard top ${wrong[last] ? 'is-wrong' : 'is-right'}`}
          onClick={toggleLast}
          aria-label={wrong[last] ? 'الكلمة معلَّمة خطأ — اضغط للإلغاء' : 'اضغط إن أخطأت في هذه الكلمة'}
        >
          <CardMeta strength={strength?.[last]} errs={errs?.[last]} />
          <span className="wcard-word">{words[last]}</span>
          <span className="mark" aria-hidden>
            {wrong[last] ? '✕' : '✓'}
          </span>
          {forkLast && (
            <span className="fork-note">
              تشتبه مع {forkLast.name} {toArabicDigits(forkLast.ayah + 1)}: هناك «{forkLast.words[forkLast.there[1]] ?? 'نهاية الآية'}»
            </span>
          )}
        </button>
      ) : (
        <div className="wcard top empty">{prevWord && <span className="wcard-word faded">{prevWord}</span>}</div>
      )}

      {hint === 'meaning' && !done ? (
        <div className="hint-box meaning-hint" role="note">
          <b>المعنى:</b> {tafsir ?? '…'}
        </div>
      ) : forkNext ? (
        <div className="fork-warn" role="note">
          ⚠ موضع افتراق مع {forkNext.name} {toArabicDigits(forkNext.ayah + 1)} — تذكّر ما يأتي هنا بالذات
        </div>
      ) : (
        <div className="swipe-hint" aria-hidden>
          <span>↑</span>
        </div>
      )}

      {/* bottom: next hidden word (or "next ayah") */}
      <div
        className={`wcard bottom${done ? ' next' : ''}`}
        role="button"
        tabIndex={0}
        aria-label={done ? label : 'اكشف الكلمة التالية'}
        style={{ transform: `translateY(${drag}px)`, transition: drag ? 'none' : undefined }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={() => {
          start.current = null;
          setDrag(0);
        }}
      >
        {done ? (
          <span className="wcard-next">
            <b>{label}</b>
            <small>اسحب للأعلى للمتابعة</small>
          </span>
        ) : (
          <>
            <CardMeta strength={strength?.[nextIdx]} />
            <span className="wcard-hidden">{hint === 'letter' ? `${plain(words[nextIdx]).charAt(0)}ـ` : '؟'}</span>
          </>
        )}
      </div>

      <div className="card-tools">
        {!done && (
          <>
            <button className={`btn small hint-btn${hint === 'meaning' ? ' on' : ''}`} onClick={() => showHint('meaning')}>
              💡 تلميح بالمعنى
            </button>
            <button className={`btn small${hint === 'letter' ? ' on' : ''}`} onClick={() => showHint('letter')}>
              أول حرف
            </button>
            <button className="btn ghost small" onClick={giveUp}>
              لا أذكر البقية
            </button>
          </>
        )}
        {footer}
      </div>
    </div>
  );
}

function CardMeta({ strength, errs }: { strength?: number; errs?: number }) {
  const filled = Math.round(((strength ?? 0) / MAX_STRENGTH) * 10);
  const tone = filled >= 6 ? 'good' : filled >= 3 ? 'mid' : 'low';
  return (
    <span className="wcard-meta" aria-hidden>
      <span className={`segs ${tone}`}>
        {Array.from({ length: 10 }, (_, i) => (
          <i key={i} className={i < filled ? 'on' : ''} />
        ))}
      </span>
      {!!errs && <span className="errs">{'✕'.repeat(Math.min(3, errs))}</span>}
    </span>
  );
}
