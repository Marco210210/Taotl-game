import { lazy, Suspense, useEffect, useState } from 'react';
import { navigate } from './Link';
import { FullscreenButton } from './components/FullscreenButton';
import { RotateNotice } from './components/RotateNotice';
import { Home } from './screens/Home';
import { Room } from './screens/Room';
import { getCurrentRoom } from './net/socket';

/**
 * All'avvio sulla home (es. app riaperta dalla schermata Home, che parte da "/"): se c'è una partita
 * in corso si torna dritti alla stanza (SPEC §7.2). Solo all'avvio: "Torna alla home" resta possibile.
 */
function startPath(): string {
  const current = location.pathname === '/' ? getCurrentRoom() : null;
  if (!current) return location.pathname;
  history.replaceState(null, '', `/r/${current}`);
  try {
    sessionStorage.setItem('taotl:resumed', current);
  } catch {
    /* sessionStorage non disponibile */
  }
  return location.pathname;
}

const CardGallery = import.meta.env.DEV
  ? lazy(() => import('./screens/CardGallery').then((m) => ({ default: m.CardGallery })))
  : null;
const TablePreview = import.meta.env.DEV
  ? lazy(() => import('./screens/TablePreview').then((m) => ({ default: m.TablePreview })))
  : null;

export function App() {
  const [path, setPath] = useState(startPath);
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
      <FullscreenButton />
      {m ? <Room key={m[1]} code={m[1]!.toUpperCase()} /> : <Home navigate={navigate} />}
    </>
  );
}
