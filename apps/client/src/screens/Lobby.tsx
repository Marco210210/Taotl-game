import { useEffect, useRef, useState } from 'react';
import type { RoomView } from '@taotl/protocol';
import { GodFan } from '../components/GodFan';
import { InstallButton } from '../components/InstallButton';
import { errorMessage } from '../lib/errors';

type Result = { ok: boolean; error?: string } | void;
export interface LobbyActions {
  addBot: () => Promise<Result> | void;
  kick: (playerId: string) => Promise<Result> | void;
  reorder: (order: string[]) => Promise<Result> | void;
  start: () => Promise<Result> | void;
}

export function Lobby({ view, addBot, kick, reorder, start }: { view: RoomView } & LobbyActions) {
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(copiedTimer.current), []);
  const isHost = view.hostId === view.me;
  const ids = view.seats.map((s) => s.id);
  const link = `${location.origin}/r/${view.code}`;

  const run = async (action: () => Promise<Result> | void) => {
    const r = await action();
    setError(r && !r.ok ? (r.error ?? 'unknown') : null);
  };
  const move = (i: number, d: -1 | 1) => {
    const next = [...ids];
    const [x] = next.splice(i, 1);
    next.splice(i + d, 0, x!);
    return run(() => reorder(next));
  };
  const copy = async () => {
    if (!(await copyText(link))) return setError('copy-failed');
    setError(null);
    setCopied(true);
    clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopied(false), 1800);
  };
  const share = async () => {
    const data = { title: 'Il Taotl', text: `Vieni a giocare a Il Taotl! Apri il link, oppure dall'app tocca «Entra» e scrivi il codice ${view.code}`, url: link };
    if (typeof navigator.share === 'function' && (!navigator.canShare || navigator.canShare(data))) {
      try {
        await navigator.share(data);
      } catch {
        /* condivisione annullata */
      }
      return;
    }
    await copy();
  };

  return (
    <main className="screen lobby">
      <div className="hero lobby-hero">
        <GodFan />
        <h1 className="room-code">
          <span className="sr-only">Stanza </span>
          {view.code}
        </h1>
        <div className="invite">
          <button type="button" className="secondary" data-testid="btn-copy-link" data-url={link} onClick={() => void copy()}>
            {copied ? 'Copiato!' : 'Copia link'}
          </button>
          <button type="button" data-testid="btn-share" onClick={() => void share()}>
            Condividi
          </button>
          <span className="sr-only" role="status">
            {copied ? 'Link copiato negli appunti' : ''}
          </span>
        </div>
        <InstallButton />
      </div>
      <section className="sheet">
        <h2>
          Al tavolo <span className="muted">{view.seats.length}/12</span>
        </h2>
        <ul className="seats">
          {view.seats.map((s, i) => (
            <li key={s.id} data-testid={`seat-${s.id}`} className={s.isBot ? 'is-bot' : undefined}>
              <span>
                {s.nickname}
                {s.id === view.me && ' (tu)'}
                {s.id === view.hostId && <span className="badge host">host</span>}
                {s.isBot && <span className="badge">bot</span>}
                {!s.isBot && !s.connected && <span className="muted"> disconnesso</span>}
              </span>
              {isHost && (
                <span className="seat-actions">
                  <button type="button" data-testid={`btn-up-${s.id}`} disabled={i === 0} onClick={() => move(i, -1)} aria-label="Sposta su">
                    ↑
                  </button>
                  <button type="button" data-testid={`btn-down-${s.id}`} disabled={i === ids.length - 1} onClick={() => move(i, 1)} aria-label="Sposta giù">
                    ↓
                  </button>
                  {s.id !== view.me && (
                    <button type="button" className="kick" data-testid={`btn-kick-${s.id}`} onClick={() => run(() => kick(s.id))}>
                      Espelli
                    </button>
                  )}
                </span>
              )}
            </li>
          ))}
        </ul>
        {error && <p role="alert">{errorMessage(error)}</p>}
        {isHost ? (
          <div className="host-actions">
            <button type="button" className="secondary" data-testid="btn-add-bot" disabled={view.seats.length >= 12} onClick={() => run(addBot)}>
              Aggiungi bot
            </button>
            <button type="button" data-testid="btn-start" disabled={view.seats.length < 2} onClick={() => run(start)}>
              Inizia
            </button>
          </div>
        ) : (
          <p className="muted">In attesa che l'host avvii la partita</p>
        )}
      </section>
    </main>
  );
}

/** Copia negli appunti: Clipboard API, con ripiego su execCommand per i browser più vecchi. */
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* si prova il ripiego */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}
