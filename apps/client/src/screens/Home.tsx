import { useState } from 'react';
import { getSocket, request, setToken } from '../net/socket';
import { errorMessage } from '../lib/errors';

export function Home({ navigate }: { navigate: (path: string) => void }) {
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState<string | null>(null);
  const create = async () => {
    const r = await request<{ code: string; token: string }>(getSocket(), 'room:create', { nickname });
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
      <button data-testid="btn-create" onClick={create}>
        Crea stanza
      </button>
      {error && <p role="alert">{errorMessage(error)}</p>}
    </main>
  );
}
