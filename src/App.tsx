import { useCallback, useEffect, useState } from 'react';
import { loadIndex, SurahMeta } from './lib/quran';
import { useStore } from './lib/store';
import { Home } from './screens/Home';
import { Session } from './screens/Session';
import { Settings } from './screens/Settings';
import { Stats } from './screens/Stats';
import { SurahDetail } from './screens/SurahDetail';

type Route =
  | { name: 'home' }
  | { name: 'stats' }
  | { name: 'settings' }
  | { name: 'surah'; surah: number }
  | { name: 'session'; surah: number; practice?: number[] };

export function App() {
  const [index, setIndex] = useState<SurahMeta[]>();
  const [error, setError] = useState('');
  const [route, setRoute] = useState<Route>(() => (history.state as Route) ?? { name: 'home' });
  const theme = useStore((s) => s.settings.theme);

  useEffect(() => {
    loadIndex().then(setIndex, (e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    if (theme === 'auto') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = theme;
  }, [theme]);

  // Hardware/browser back button walks back through screens.
  useEffect(() => {
    if (!history.state) history.replaceState({ name: 'home' }, '');
    const onPop = (e: PopStateEvent) => setRoute((e.state as Route) ?? { name: 'home' });
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

  if (error) return <div className="screen center">{error}</div>;
  if (!index) return <div className="screen center muted">جارٍ التحميل…</div>;

  const tab = route.name === 'stats' || route.name === 'settings' ? route.name : 'home';

  return (
    <div className="app">
      <main>
        {route.name === 'home' && (
          <Home
            index={index}
            onStart={(surah) => go({ name: 'session', surah })}
            onOpen={(surah) => go({ name: 'surah', surah })}
          />
        )}
        {route.name === 'surah' && (
          <SurahDetail
            meta={index[route.surah - 1]}
            onBack={back}
            onStart={() => go({ name: 'session', surah: route.surah })}
            onPractice={(practice) => go({ name: 'session', surah: route.surah, practice })}
          />
        )}
        {route.name === 'session' && (
          <Session key={JSON.stringify(route)} meta={index[route.surah - 1]} practice={route.practice} onExit={back} />
        )}
        {route.name === 'stats' && (
          <Stats index={index} onPractice={(surah, practice) => go({ name: 'session', surah, practice })} />
        )}
        {route.name === 'settings' && <Settings />}
      </main>

      {route.name !== 'session' && (
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
