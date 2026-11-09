import { Similar } from '../lib/linking';
import { toArabicDigits } from '../lib/quran';

/** Shows where this ayah and its look-alikes share wording and where they part ways. */
export function SimilarList({ similar, words }: { similar: Similar[]; words: string[] }) {
  if (!similar.length) return null;
  return (
    <div className="similar">
      <h4>
        <span aria-hidden>⚠</span> آيات تتشابه معها — انتبه لموضع الافتراق
      </h4>
      <ul>
        {similar.map((s) => {
          const shared = s.words.slice(Math.max(s.there[0], s.there[1] - 4), s.there[1]);
          const here = words[s.here[1]];
          const there = s.words[s.there[1]];
          return (
            <li key={`${s.surah}:${s.ayah}`}>
              <div className="sim-ref">
                {s.name} {toArabicDigits(s.ayah + 1)}
              </div>
              <p className="sim-q">
                {s.there[1] - s.there[0] > 4 && '… '}
                <mark className="shared">{shared.join(' ')}</mark>
              </p>
              <div className="sim-fork">
                <span className="here">
                  هنا: <b>{here ?? '﴿نهاية الآية﴾'}</b>
                </span>
                <span className="there">
                  هناك: <b>{there ?? '﴿نهاية الآية﴾'}</b>
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
