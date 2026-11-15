import { useState } from 'react';
import { GodFan } from '../components/GodFan';
import { getSocket, request, setToken } from '../net/socket';
import { errorMessage } from '../lib/errors';
import { enterFullscreenOnTouch } from '../lib/fullscreen';
import { normalizeRoomCode } from '../lib/roomCode';
import { InstallButton } from '../components/InstallButton';

/**
 * Schermata iniziale: un nickname e due strade, aprire un tavolo oppure entrare con il codice che
 * ti hanno dettato (dall'app installata i link degli amici non si aprono: su iPhone/iPad finiscono in Safari).
 */
export function Home({ navigate }: { navigate: (path: string) => void }) {
  const [nickname, setNickname] = useState('');
  const [code, setCode] = useState('');
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
  const join = async () => {
    const c = normalizeRoomCode(code);
    if (!c) return setError('bad-code');
    setBusy(true);
    const r = await request(getSocket())('room:join', { code: c, nickname });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    setToken(c, r.token);
    navigate(`/r/${c}`);
  };
  return (
    <main className="screen">
      <div className="hero">
        <GodFan />
        <h1 className="hero-title">Il Taotl</h1>
      </div>
      <div className="sheet">
        <form
          className="home-create"
          onSubmit={(e) => {
            e.preventDefault();
            enterFullscreenOnTouch();
            void create();
          }}
        >
          <h2>Gioca con gli amici</h2>
          <label>
            Il tuo nickname
            <input data-testid="input-nickname" value={nickname} maxLength={16} autoComplete="nickname" onChange={(e) => setNickname(e.target.value)} />
          </label>
          <button type="submit" data-testid="btn-create" disabled={busy}>
            Crea stanza
          </button>
        </form>
        <form
          className="home-join"
          onSubmit={(e) => {
            e.preventDefault();
            enterFullscreenOnTouch();
            void join();
          }}
        >
          <label htmlFor="room-code-input">Hai un codice? Entra nella stanza</label>
          <div className="code-row">
            <input
              id="room-code-input"
              data-testid="input-code"
              className="code-input"
              value={code}
              placeholder="ABCD"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="characters"
              spellCheck={false}
              enterKeyHint="go"
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />
            <button type="submit" className="secondary" data-testid="btn-join-code" disabled={busy}>
              Entra
            </button>
          </div>
        </form>
        {error && <p role="alert">{errorMessage(error)}</p>}
        <InstallButton />
      </div>
    </main>
  );
}
