import { useEffect, useMemo, useState } from 'react';
import { WordRecall } from '../components/WordRecall';
import { CardRecall } from '../components/CardRecall';
import { audioUrl, loadSurah, SurahMeta, SurahText, toArabicDigits } from '../lib/quran';
import { applyWordResults, buildQueue, dayNumber, newCard, QueueItem, schedule } from '../lib/srs';
import { getState, logAttempt, newIntroducedToday, putCard, useStore } from '../lib/store';
import { AyahRef, Segment } from '../lib/goals';
import { usePlayer } from '../lib/audio';

interface Props {
  index: SurahMeta[];
  title: string;
  /** The ayah ranges of the goal (daily mode). */
  segments?: Segment[];
  /** Goal id, used to count today's new ayahs. */
  goalKey?: string;
  /** When given, practise exactly these ayahs without touching the schedule. */
  practice?: AyahRef[];
  onExit: () => void;
}

interface Item extends QueueItem {
  attempt: number;
  phase: 'learn' | 'test';
}

interface Result {
  surah: number;
  ayah: number;
  words: string[];
  wrong: boolean[];
  kind: QueueItem['kind'] | 'practice';
}

const REQUEUE_GAP = 3;
const MAX_ATTEMPTS = 3;

export function Session({ index, title, segments, goalKey, practice, onExit }: Props) {
  const [texts, setTexts] = useState<Record<number, SurahText>>();
  const [error, setError] = useState('');
  const settings = useStore((s) => s.settings);
  const [queue, setQueue] = useState<Item[]>([]);
  const [pos, setPos] = useState(0);
  const [results, setResults] = useState<Result[]>([]);
  // true when the swipe that finished the previous ayah should also reveal the next one
  const [chain, setChain] = useState(false);
  const todayWords = useStore((s) => s.log[dayNumber()]?.words ?? 0);

  const surahs = useMemo(
    () => [...new Set((practice ?? segments ?? []).map((x) => x.surah))],
    [practice, segments],
  );

  useEffect(() => {
    Promise.all(surahs.map(loadSurah)).then(
      (all) => setTexts(Object.fromEntries(all.map((t) => [t.n, t]))),
      (e: Error) => setError(e.message),
    );
  }, [surahs]);

  // Build the queue once, from the state at the moment the session starts.
  useEffect(() => {
    if (!texts) return;
    const s = getState();
    const base: QueueItem[] = practice
      ? practice.map((r) => ({ ...r, kind: 'review' as const }))
      : buildQueue(
          s.progress,
          segments ?? [],
          dayNumber(),
          Math.max(0, s.settings.newPerDay - newIntroducedToday(s, goalKey ?? '')),
        );
    setQueue(base.map((q) => ({ ...q, attempt: 0, phase: q.kind === 'new' ? 'learn' : 'test' })));
    setPos(0);
    setResults([]);
  }, [texts, practice, segments, goalKey]);

  const item = queue[pos];

  const addMoreNew = (count: number) => {
    const progress = getState().progress;
    const inQueue = new Set(queue.map((q) => `${q.surah}:${q.ayah}`));
    const extra: Item[] = [];
    for (const seg of segments ?? []) {
      for (let i = seg.from; i <= seg.to && extra.length < count; i++) {
        if (!progress[seg.surah]?.[i] && !inQueue.has(`${seg.surah}:${i}`))
          extra.push({ surah: seg.surah, ayah: i, kind: 'new', attempt: 0, phase: 'learn' });
      }
    }
    setQueue((q) => [...q, ...extra]);
  };

  const finish = (wrong: boolean[], chainNext = false) => {
    if (!item || !texts) return;
    const words = texts[item.surah].ayahs[item.ayah];
    const mistakes = wrong.filter(Boolean).length;
    const today = dayNumber();
    const existing = getState().progress[item.surah]?.[item.ayah];

    if (!practice && item.attempt === 0) {
      const card = schedule(existing ?? newCard(words.length, today), wrong, today);
      putCard(item.surah, item.ayah, card);
      logAttempt({
        words: words.length,
        mistakes,
        review: item.kind === 'review',
        learnedGoal: item.kind === 'new' ? goalKey : undefined,
      });
    } else {
      if (existing) putCard(item.surah, item.ayah, applyWordResults(existing, wrong));
      logAttempt({ words: words.length, mistakes });
    }

    setResults((r) => [
      ...r,
      { surah: item.surah, ayah: item.ayah, words, wrong, kind: practice ? 'practice' : item.kind },
    ]);

    // Ayahs with mistakes come back a few cards later in the same session.
    if (mistakes > 0 && item.attempt + 1 < MAX_ATTEMPTS) {
      setQueue((q) => {
        const next = q.slice();
        const at = Math.min(next.length, pos + 1 + REQUEUE_GAP);
        next.splice(at, 0, { ...item, attempt: item.attempt + 1, phase: 'test' });
        return next;
      });
    }
    setChain(chainNext);
    setPos((p) => p + 1);
    window.scrollTo({ top: 0 });
  };

  const ayahName = (q: { surah: number; ayah: number }) =>
    `${q.surah !== item?.surah ? `${index[q.surah - 1].name} ` : 'الآية '}${toArabicDigits(q.ayah + 1)}`;

  const nextLabel = (mistakes: number) => {
    const next = queue[pos + 1];
    if (next) return next.kind === 'new' && next.attempt === 0 ? `آية جديدة: ${ayahName(next)}` : ayahName(next);
    return mistakes > 0 && item && item.attempt + 1 < MAX_ATTEMPTS ? 'إعادة الآية' : 'إنهاء الجلسة';
  };

  if (error) {
    return (
      <div className="screen center">
        <p>{error}</p>
        <button className="btn" onClick={onExit}>
          رجوع
        </button>
      </div>
    );
  }
  if (!texts) return <div className="screen center muted">جارٍ التحميل…</div>;
  const meta = item ? index[item.surah - 1] : undefined;

  const header = (
    <header className="session-head">
      <button className="icon-btn" onClick={onExit} aria-label="إنهاء الجلسة">
        ✕
      </button>
      <div className="session-title">
        <strong>{meta ? `سورة ${meta.name}` : title}</strong>
        {item && <span className="muted"> · الآية {toArabicDigits(item.ayah + 1)}</span>}
      </div>
      {item && <span className={`badge ${item.kind}`}>{labelFor(item, !!practice)}</span>}
      <div className="progress" aria-hidden>
        <div style={{ width: `${queue.length ? (pos / queue.length) * 100 : 100}%` }} />
      </div>
    </header>
  );

  if (!item) {
    return (
      <div className="screen">
        {header}
        <Summary results={results} index={index} title={title} onExit={onExit} onMore={practice ? undefined : addMoreNew} />
      </div>
    );
  }

  const text = texts[item.surah];
  const words = text.ayahs[item.ayah];
  const card = getState().progress[item.surah]?.[item.ayah];
  const context =
    settings.showContext && item.ayah > 0 ? text.ayahs[item.ayah - 1].slice(-6).join(' ') : '';
  const cards = settings.mode === 'cards';
  const url = audioUrl(settings.reciter, item.surah, item.ayah);

  return (
    <div className={`screen session${cards ? ' card-mode' : ''}`} style={{ ['--q-scale' as string]: settings.fontScale }}>
      {header}
      {context && !(cards && item.phase === 'test') && (
        <p className="context">
          {text.ayahs[item.ayah - 1].length > 6 && '… '}
          {context}
        </p>
      )}
      {item.phase === 'learn' ? (
        <LearnCard
          key={`${pos}-learn`}
          words={words}
          url={url}
          autoPlay={settings.autoPlay}
          onReady={() => {
            setChain(false);
            setQueue((q) => q.map((x, i) => (i === pos ? { ...x, phase: 'test' } : x)));
          }}
        />
      ) : cards ? (
        <CardRecall
          key={`${pos}-cards`}
          words={words}
          strength={card?.w}
          errs={card?.errs}
          autoStart={chain}
          prevWord={item.ayah > 0 ? text.ayahs[item.ayah - 1].at(-1) : undefined}
          ayahLabel={`${meta!.name} ﴿${toArabicDigits(item.ayah + 1)}﴾`}
          nextLabel={nextLabel}
          onFinish={(wrong, chainNext) => finish(wrong, chainNext && queue[pos + 1]?.phase === 'test')}
          footer={
            <>
              <ListenButton url={url} autoPlay={false} />
              <span className="muted small">اليوم: {toArabicDigits(todayWords)} كلمة</span>
            </>
          }
        />
      ) : (
        <WordRecall
          key={`${pos}-test`}
          words={words}
          strength={card?.w}
          hintLength={settings.hintLength}
          onFinish={finish}
          finishLabel={pos + 1 < queue.length ? 'التالي ←' : 'إنهاء'}
          extraActions={<ListenButton url={url} autoPlay={settings.autoPlay} />}
        />
      )}
    </div>
  );
}

function labelFor(item: Item, practice: boolean) {
  if (practice) return 'تدريب';
  if (item.attempt > 0) return 'تصحيح';
  return item.kind === 'new' ? 'جديدة' : 'مراجعة';
}

function ListenButton({ url, autoPlay }: { url: string; autoPlay: boolean }) {
  const p = usePlayer(url);
  useEffect(() => {
    if (autoPlay) p.play();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <button className="btn ghost" onClick={() => p.toggle()} aria-label="استماع">
      {p.status === 'playing' || p.status === 'loading' ? '■ إيقاف' : '▶ استماع'}
    </button>
  );
}

function LearnCard({
  words,
  url,
  autoPlay,
  onReady,
}: {
  words: string[];
  url: string;
  autoPlay: boolean;
  onReady: () => void;
}) {
  const p = usePlayer(url);
  const [repeat, setRepeat] = useState(3);
  useEffect(() => {
    if (autoPlay) p.play(repeat);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && /BUTTON|SELECT|INPUT/.test(e.target.tagName)) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onReady();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onReady]);

  return (
    <div className="learn">
      <p className="learn-hint">آية جديدة: اقرأها بتدبّر واستمع إليها وردّدها حتى تحفظها، ثم اختبر نفسك.</p>
      <div className="ayah-words full">
        {words.map((w, i) => (
          <span key={i} className="word revealed">
            {w}
          </span>
        ))}
      </div>
      <div className="controls">
        <button className="btn ghost" onClick={() => p.toggle(repeat)}>
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
        <button className="btn primary grow" onClick={onReady}>
          حفظتُها، اختبرني
        </button>
      </div>
      {p.status === 'error' && <p className="tip">تعذّر تشغيل التلاوة — تحقق من اتصالك بالإنترنت.</p>}
    </div>
  );
}

function Summary({
  results,
  index,
  title,
  onExit,
  onMore,
}: {
  results: Result[];
  index: SurahMeta[];
  title: string;
  onExit: () => void;
  onMore?: (n: number) => void;
}) {
  const stats = useMemo(() => {
    const firstTries = results.filter((r, i) => results.findIndex((x) => x.surah === r.surah && x.ayah === r.ayah) === i);
    const words = results.reduce((t, r) => t + r.words.length, 0);
    const mistakes = results.reduce((t, r) => t + r.wrong.filter(Boolean).length, 0);
    const perfect = firstTries.filter((r) => !r.wrong.some(Boolean)).length;
    const stumbles = new Map<string, { surah: number; ayah: number; word: string; before: string; count: number }>();
    for (const r of results) {
      r.wrong.forEach((isWrong, i) => {
        if (!isWrong) return;
        const key = `${r.surah}:${r.ayah}:${i}`;
        const prev = stumbles.get(key);
        if (prev) prev.count++;
        else stumbles.set(key, { surah: r.surah, ayah: r.ayah, word: r.words[i], before: r.words.slice(Math.max(0, i - 2), i).join(' '), count: 1 });
      });
    }
    return {
      ayahs: firstTries.length,
      reviews: firstTries.filter((r) => r.kind === 'review').length,
      learned: firstTries.filter((r) => r.kind === 'new').length,
      words,
      mistakes,
      perfect,
      stumbles: [...stumbles.values()].sort((a, b) => a.surah - b.surah || a.ayah - b.ayah),
    };
  }, [results]);

  if (results.length === 0) {
    return (
      <div className="summary">
        <div className="done-mark">✓</div>
        <h2>لا شيء مستحق اليوم في {title}</h2>
        <p className="muted">أتممت مراجعاتك. يمكنك حفظ آيات إضافية أو العودة غدًا.</p>
        <div className="controls">
          {onMore && (
            <button className="btn" onClick={() => onMore(3)}>
              احفظ ٣ آيات إضافية
            </button>
          )}
          <button className="btn primary grow" onClick={onExit}>
            الرئيسية
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="summary">
      <div className="done-mark">✓</div>
      <h2>تمّت الجلسة، بارك الله فيك</h2>
      <div className="stat-row">
        <Stat label="مراجعة" value={stats.reviews} />
        <Stat label="جديدة" value={stats.learned} />
        <Stat label="كلمة" value={stats.words} />
        <Stat label="خطأ" value={stats.mistakes} />
      </div>
      {stats.stumbles.length > 0 ? (
        <>
          <h3>مواضع العثرات</h3>
          <ul className="stumbles">
            {stats.stumbles.map((s) => (
              <li key={`${s.surah}-${s.ayah}-${s.word}-${s.before}`}>
                <span className="muted">{index[s.surah - 1].name} {toArabicDigits(s.ayah + 1)}</span>
                <span className="q">
                  {s.before && <span className="muted">{s.before} </span>}
                  <mark>{s.word}</mark>
                </span>
                {s.count > 1 && <span className="muted">×{toArabicDigits(s.count)}</span>}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="muted">لم تخطئ في أي كلمة. ما شاء الله!</p>
      )}
      <div className="controls">
        {onMore && (
          <button className="btn" onClick={() => onMore(3)}>
            احفظ ٣ آيات إضافية
          </button>
        )}
        <button className="btn primary grow" onClick={onExit}>
          الرئيسية
        </button>
      </div>
    </div>
  );
}

export function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="stat">
      <b>{typeof value === 'number' ? toArabicDigits(value) : value}</b>
      <span>{label}</span>
    </div>
  );
}
