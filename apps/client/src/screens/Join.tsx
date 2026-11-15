import { useState } from 'react';
import { GodFan } from '../components/GodFan';
import { errorMessage } from '../lib/errors';
import { enterFullscreenOnTouch, isInstalledApp } from '../lib/fullscreen';
import { isIOS } from '../lib/install';

/** Link aperto nel browser di un telefono/tablet: chi ha l'app installata può entrare da lì con il codice. */
const inMobileBrowser = (): boolean =>
  !isInstalledApp() && (isIOS() || (typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches));

export function Join({ code, error, onJoin }: { code: string; error: string | null; onJoin: (nickname: string) => Promise<void> }) {
  const [nickname, setNickname] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    await onJoin(nickname);
    setBusy(false);
  };
  return (
    <main className="screen">
      <div className="hero">
        <GodFan />
        <p className="hero-title">Il Taotl</p>
      </div>
      <form
        className="sheet"
        onSubmit={(e) => {
          e.preventDefault();
          enterFullscreenOnTouch();
          void submit();
        }}
      >
        <h1>Entra nella stanza</h1>
        <p className="lede">Scegli il nome che vedranno gli altri al tavolo.</p>
        <label>
          Il tuo nickname
          <input data-testid="input-nickname" value={nickname} maxLength={16} autoComplete="nickname" onChange={(e) => setNickname(e.target.value)} />
        </label>
        <button type="submit" data-testid="btn-join" disabled={busy}>
          Entra
        </button>
        {error && <p role="alert">{errorMessage(error)}</p>}
        {inMobileBrowser() && (
          <p className="app-hint" data-testid="app-hint">
            Hai l'app Il Taotl? Aprila, tocca «Entra» e scrivi il codice <strong data-testid="app-hint-code">{code}</strong>
          </p>
        )}
      </form>
    </main>
  );
}
