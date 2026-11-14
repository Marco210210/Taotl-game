import { lazy, Suspense, useEffect, useState } from 'react';
import { navigate } from './Link';
import { RotateNotice } from './components/RotateNotice';
import { Home } from './screens/Home';
import { Room } from './screens/Room';

const CardGallery = import.meta.env.DEV
  ? lazy(() => import('./screens/CardGallery').then((m) => ({ default: m.CardGallery })))
  : null;
const TablePreview = import.meta.env.DEV
  ? lazy(() => import('./screens/TablePreview').then((m) => ({ default: m.TablePreview })))
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
  if (TablePreview && path === '/dev/table') {
    return (
      <Suspense fallback={null}>
        <TablePreview />
      </Suspense>
    );
  }
  const m = /^\/r\/([^/]+)\/?$/.exec(path);
  return (
    <>
      <RotateNotice />
      {m ? <Room key={m[1]} code={m[1]!.toUpperCase()} /> : <Home navigate={navigate} />}
    </>
  );
}
