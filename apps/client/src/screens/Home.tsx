import { useState } from 'react';
import { getSocket, request, setToken } from '../net/socket';
import { errorMessage } from '../lib/errors';

export function Home({ navigate }: { navigate: (path: string) => void }) {
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const create = async () => {
    setBusy(true);
    const r = await request(getSocket())('room:create', { nickname });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    setToken(r.code, r.token);
    navigate(`/r/${r.code}`);
  };
  return (
    <main className="screen">
      <h1>Il Taotl</h1>
      <label>
        Nickname
        <input data-testid="input-nickname" value={nickname} maxLength={16} onChange={(e) => setNickname(e.target.value)} />
      </label>
      <button data-testid="btn-create" disabled={busy} onClick={create}>
        Crea stanza
      </button>
      {error && <p role="alert">{errorMessage(error)}</p>}
    </main>
  );
}
