import { useState } from 'react';
import { GodFan } from '../components/GodFan';
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
      <div className="hero">
        <GodFan />
        <h1 className="hero-title">Il Taotl</h1>
      </div>
      <form
        className="sheet"
        onSubmit={(e) => {
          e.preventDefault();
          void create();
        }}
      >
        <h2>Apri un tavolo</h2>
        <p className="lede">Crea una stanza e manda il link agli amici: da 2 a 12 giocatori, bot compresi.</p>
        <label>
          Il tuo nickname
          <input data-testid="input-nickname" value={nickname} maxLength={16} autoComplete="nickname" onChange={(e) => setNickname(e.target.value)} />
        </label>
        <button type="submit" data-testid="btn-create" disabled={busy}>
          Crea stanza
        </button>
        {error && <p role="alert">{errorMessage(error)}</p>}
      </form>
    </main>
  );
}
