import { useEffect, useState } from 'react';
import { navigate } from './Link';
import { Home } from './screens/Home';
import { Room } from './screens/Room';

export function App() {
  const [path, setPath] = useState(location.pathname);
  useEffect(() => {
    const on = () => setPath(location.pathname);
    window.addEventListener('popstate', on);
    return () => window.removeEventListener('popstate', on);
  }, []);
  const m = /^\/r\/([^/]+)\/?$/.exec(path);
  if (m) return <Room key={m[1]} code={m[1]!.toUpperCase()} />;
  return <Home navigate={navigate} />;
}
