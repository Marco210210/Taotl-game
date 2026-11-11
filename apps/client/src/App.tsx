import { lazy, Suspense, useEffect, useState } from 'react';
import { navigate } from './Link';
import { Home } from './screens/Home';
import { Room } from './screens/Room';

const CardGallery = import.meta.env.DEV
  ? lazy(() => import('./screens/CardGallery').then((m) => ({ default: m.CardGallery })))
  : null;

export function App() {
  const [path, setPath] = useState(location.pathname);
  useEffect(() => {
    const on = () => setPath(location.pathname);
    window.addEventListener('popstate', on);
    return () => window.removeEventListener('popstate', on);
  }, []);
  if (CardGallery && path === '/dev/cards') {
    return (
      <Suspense fallback={null}>
        <CardGallery />
      </Suspense>
    );
  }
  const m = /^\/r\/([^/]+)\/?$/.exec(path);
  if (m) return <Room key={m[1]} code={m[1]!.toUpperCase()} />;
  return <Home navigate={navigate} />;
}
