import { useEffect, useMemo, useRef, useState } from 'react';
import { Parts, plain, SurahMeta, toArabicDigits } from '../lib/quran';
import { GoalKind, goalId, goalSubtitle, goalTitle } from '../lib/goals';

interface Props {
  index: SurahMeta[];
  parts: Parts;
  /** goal ids already added */
  exclude: string[];
  initialTab?: GoalKind;
  onPick: (kind: GoalKind, n: number) => void;
  onClose: () => void;
}

const TABS: { kind: GoalKind; label: string }[] = [
  { kind: 'surah', label: 'السور' },
  { kind: 'juz', label: 'الأجزاء' },
  { kind: 'manzil', label: 'تحزيب الصحابة' },
];

export function SurahPicker({ index, parts, exclude, initialTab = 'surah', onPick, onClose }: Props) {
  const [tab, setTab] = useState<GoalKind>(initialTab);
  const [q, setQ] = useState('');
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    input.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const list = useMemo(() => {
    const needle = plain(q.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))))
      .replace(/^سوره\s*/, '')
      .toLowerCase();
    if (!needle) return index;
    return index.filter(
      (s) =>
        String(s.n) === needle ||
        plain(s.name).replace(/^ال/, '').includes(needle.replace(/^ال/, '')) ||
        s.en.toLowerCase().includes(needle),
    );
  }, [q, index]);

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label="اختيار سورة" onClick={(e) => e.stopPropagation()}>
        <div className="tabs-inline" role="tablist">
          {TABS.map((t) => (
            <button key={t.kind} role="tab" aria-selected={tab === t.kind} className={tab === t.kind ? 'on' : ''} onClick={() => setTab(t.kind)}>
              {t.label}
            </button>
          ))}
          <button className="icon-btn" onClick={onClose} aria-label="إغلاق">
            ✕
          </button>
        </div>
        <div className="sheet-head" hidden={tab !== 'surah'}>
          <input
            ref={input}
            className="search"
            placeholder="ابحث باسم السورة أو رقمها"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && list[0] && !exclude.includes(goalId({ kind: 'surah', n: list[0].n })))
                onPick('surah', list[0].n);
            }}
          />
        </div>
        <ul className="surah-list">
          {tab === 'surah'
            ? list.map((s) => (
                <Row
                  key={s.n}
                  num={s.n}
                  title={`سورة ${s.name}`}
                  sub={`${s.type} · ${toArabicDigits(s.ayahs)} آية · الجزء ${toArabicDigits(s.juz)}`}
                  added={exclude.includes(goalId({ kind: 'surah', n: s.n }))}
                  onPick={() => onPick('surah', s.n)}
                />
              ))
            : (tab === 'juz' ? parts.juz : parts.manzil).map((_, i) => {
                const g = { kind: tab, n: i + 1 };
                return (
                  <Row
                    key={i}
                    num={i + 1}
                    title={goalTitle(g, index)}
                    sub={goalSubtitle(g, index, parts)}
                    added={exclude.includes(goalId(g))}
                    onPick={() => onPick(tab, i + 1)}
                  />
                );
              })}
          {tab === 'surah' && list.length === 0 && <li className="muted center">لا نتائج</li>}
        </ul>
      </div>
    </div>
  );
}

function Row({ num, title, sub, added, onPick }: { num: number; title: string; sub: string; added: boolean; onPick: () => void }) {
  return (
    <li>
      <button disabled={added} onClick={onPick}>
        <span className="surah-num">{toArabicDigits(num)}</span>
        <span className="grow">
          <strong>{title}</strong>
          <span className="muted">{sub}</span>
        </span>
        {added && <span className="pill done">مضاف</span>}
      </button>
    </li>
  );
}
