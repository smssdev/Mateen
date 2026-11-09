import { Level } from '../lib/srs';

export const LEVELS: { key: Level; label: string; color: string }[] = [
  { key: 'solid', label: 'متين', color: 'var(--lvl-solid)' },
  { key: 'medium', label: 'متوسط', color: 'var(--lvl-medium)' },
  { key: 'basic', label: 'ابتدائي', color: 'var(--lvl-basic)' },
  { key: 'intro', label: 'تعريفي', color: 'var(--lvl-intro)' },
];

const pct = (v: number) => {
  const p = v * 100;
  const s = p === 0 ? '0' : p < 0.01 ? '0.01>' : p.toFixed(p < 10 ? 2 : 1);
  return s.replace('.', '٫').replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[+d]) + '٪';
};

/** Share of all words of the Quran at each mastery level. */
export function MasteryDonut({ counts, total }: { counts: Record<Level, number>; total: number }) {
  const R = 70;
  const C = 2 * Math.PI * R;
  let offset = 0;
  const memorized = LEVELS.reduce((t, l) => t + counts[l.key], 0);
  return (
    <div className="donut-wrap">
      <svg viewBox="0 0 180 180" className="donut" role="img" aria-label={`نسبة ما حفظته من القرآن: ${pct(memorized / total)}`}>
        <circle cx="90" cy="90" r={R} fill="none" stroke="var(--surface-2)" strokeWidth="26" />
        {LEVELS.map((l) => {
          const len = (counts[l.key] / total) * C;
          // tiny shares still get a visible sliver
          const shown = counts[l.key] > 0 ? Math.max(len, 1.5) : 0;
          const el = (
            <circle
              key={l.key}
              cx="90"
              cy="90"
              r={R}
              fill="none"
              stroke={l.color}
              strokeWidth="26"
              strokeDasharray={`${shown} ${C - shown}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 90 90)"
            />
          );
          offset += shown;
          return el;
        })}
        <text x="90" y="86" textAnchor="middle" className="donut-big">
          {pct(memorized / total)}
        </text>
        <text x="90" y="110" textAnchor="middle" className="donut-small">
          من القرآن
        </text>
      </svg>
      <ul className="donut-legend">
        {LEVELS.map((l) => (
          <li key={l.key}>
            <i style={{ background: l.color }} />
            <b style={{ color: l.color }}>{pct(counts[l.key] / total)}</b>
            <span>{l.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
