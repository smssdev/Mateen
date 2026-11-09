import { useEffect, useMemo, useRef, useState } from 'react';
import { plain, SurahMeta, toArabicDigits } from '../lib/quran';

interface Props {
  index: SurahMeta[];
  exclude: number[];
  onPick: (n: number) => void;
  onClose: () => void;
}

export function SurahPicker({ index, exclude, onPick, onClose }: Props) {
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
        <div className="sheet-head">
          <input
            ref={input}
            className="search"
            placeholder="ابحث باسم السورة أو رقمها"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && list[0] && !exclude.includes(list[0].n)) onPick(list[0].n);
            }}
          />
          <button className="icon-btn" onClick={onClose} aria-label="إغلاق">
            ✕
          </button>
        </div>
        <ul className="surah-list">
          {list.map((s) => {
            const added = exclude.includes(s.n);
            return (
              <li key={s.n}>
                <button disabled={added} onClick={() => onPick(s.n)}>
                  <span className="surah-num">{toArabicDigits(s.n)}</span>
                  <span className="grow">
                    <strong>سورة {s.name}</strong>
                    <span className="muted">
                      {s.type} · {toArabicDigits(s.ayahs)} آية · الجزء {toArabicDigits(s.juz)}
                    </span>
                  </span>
                  {added && <span className="pill done">مضافة</span>}
                </button>
              </li>
            );
          })}
          {list.length === 0 && <li className="muted center">لا نتائج</li>}
        </ul>
      </div>
    </div>
  );
}
