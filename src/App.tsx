import { useCallback, useEffect, useMemo, useState } from 'react';
import { loadIndex, loadParts, Parts, SurahMeta } from './lib/quran';
import { AyahRef, Goal, goalId, goalTitle, segments } from './lib/goals';
import { useStore } from './lib/store';
import { Home } from './screens/Home';
import { Session } from './screens/Session';
import { Settings } from './screens/Settings';
import { Stats } from './screens/Stats';
import { GoalDetail } from './screens/GoalDetail';

type Route =
  | { name: 'home' }
  | { name: 'stats' }
  | { name: 'settings' }
  | { name: 'goal'; kind: Goal['kind']; n: number }
  | { name: 'session'; kind: Goal['kind']; n: number }
  | { name: 'practice'; title: string; ayahs: AyahRef[] };

export function App() {
  const [index, setIndex] = useState<SurahMeta[]>();
  const [parts, setParts] = useState<Parts>();
  const [error, setError] = useState('');
  const [route, setRoute] = useState<Route>(() => validRoute(history.state));
  const theme = useStore((s) => s.settings.theme);

  useEffect(() => {
    loadIndex().then(setIndex, (e: Error) => setError(e.message));
    loadParts().then(setParts, (e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    if (theme === 'auto') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = theme;
  }, [theme]);

  // Hardware/browser back button walks back through screens.
  useEffect(() => {
    if (!history.state) history.replaceState({ name: 'home' }, '');
    const onPop = (e: PopStateEvent) => setRoute(validRoute(e.state));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const go = useCallback((r: Route, replace = false) => {
    if (replace) history.replaceState(r, '');
    else history.pushState(r, '');
    setRoute(r);
    window.scrollTo({ top: 0 });
  }, []);
  const back = useCallback(() => {
    if (history.length > 1 && history.state?.name !== 'home') history.back();
    else go({ name: 'home' }, true);
  }, [go]);

  // stable per route so an in-progress session is never rebuilt by a re-render
  const sessionSegments = useMemo(
    () => (route.name === 'session' && index && parts ? segments(route, index, parts) : undefined),
    [route, index, parts],
  );

  if (error) return <div className="screen center">{error}</div>;
  if (!index || !parts) return <div className="screen center muted">جارٍ التحميل…</div>;

  const tab = route.name === 'stats' || route.name === 'settings' ? route.name : 'home';

  return (
    <div className="app">
      <main>
        {route.name === 'home' && (
          <Home
            index={index}
            parts={parts}
            onStart={(g) => go({ name: 'session', kind: g.kind, n: g.n })}
            onOpen={(g) => go({ name: 'goal', kind: g.kind, n: g.n })}
          />
        )}
        {route.name === 'goal' && (
          <GoalDetail
            goal={route}
            index={index}
            parts={parts}
            onBack={back}
            onStart={() => go({ name: 'session', kind: route.kind, n: route.n })}
            onPractice={(ayahs) => go({ name: 'practice', title: goalTitle(route, index), ayahs })}
          />
        )}
        {route.name === 'session' && (
          <Session
            key={JSON.stringify(route)}
            index={index}
            title={goalTitle(route, index)}
            segments={sessionSegments}
            goalKey={goalId(route)}
            onExit={back}
          />
        )}
        {route.name === 'practice' && (
          <Session key={JSON.stringify(route)} index={index} title={route.title} practice={route.ayahs} onExit={back} />
        )}
        {route.name === 'stats' && (
          <Stats
            index={index}
            onPractice={(surah, ayahs) =>
              go({ name: 'practice', title: `سورة ${index[surah - 1].name}`, ayahs: ayahs.map((ayah) => ({ surah, ayah })) })
            }
          />
        )}
        {route.name === 'settings' && <Settings />}
      </main>

      {route.name !== 'session' && route.name !== 'practice' && (
        <nav className="tabs">
          <button className={tab === 'home' ? 'on' : ''} onClick={() => go({ name: 'home' }, tab !== 'home')}>
            <span aria-hidden>⌂</span>الرئيسية
          </button>
          <button className={tab === 'stats' ? 'on' : ''} onClick={() => go({ name: 'stats' }, tab !== 'home')}>
            <span aria-hidden>▤</span>الإحصاءات
          </button>
          <button className={tab === 'settings' ? 'on' : ''} onClick={() => go({ name: 'settings' }, tab !== 'home')}>
            <span aria-hidden>⚙</span>الإعدادات
          </button>
        </nav>
      )}
    </div>
  );
}

const NAMES = ['home', 'stats', 'settings', 'goal', 'session', 'practice'];
function validRoute(state: unknown): Route {
  return state && typeof state === 'object' && NAMES.includes((state as Route).name) ? (state as Route) : { name: 'home' };
}
