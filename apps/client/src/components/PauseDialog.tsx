import { useEffect, useId, useState } from 'react';
import type { RoomView } from '@taotl/protocol';
import { errorMessage } from '../lib/errors';
import type { TypedEmit } from '../net/socket';
import { useDialogFocus } from './useDialogFocus';

/** Secondi rimanenti da `ms` (contati dal momento in cui arriva il valore), aggiornati ogni secondo. */
function useCountdown(ms: number | null): number | null {
  const [left, setLeft] = useState<number | null>(ms === null ? null : Math.ceil(ms / 1000));
  useEffect(() => {
    if (ms === null) {
      setLeft(null);
      return;
    }
    const end = Date.now() + ms;
    const tick = () => setLeft(Math.max(0, Math.ceil((end - Date.now()) / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [ms]);
  return left;
}

export function PauseDialog({ view, emit }: { view: RoomView; emit: TypedEmit }) {
  const [error, setError] = useState<string | null>(null);
  /** Chiave della pausa per cui l'host ha scelto "Aspetta" (si azzera quando la pausa cambia). */
  const [waitedKey, setWaitedKey] = useState<string | null>(null);
  const titleId = useId();
  const ref = useDialogFocus<HTMLDivElement>();
  const pause = view.pause;
  const pauseKey = pause ? `${pause.waitingFor}:${pause.hostCanDecide}` : null;
  useEffect(() => {
    setWaitedKey((k) => (k !== null && k !== pauseKey ? null : k));
  }, [pauseKey]);
  const secondsLeft = useCountdown(pause?.autoBotInMs ?? null);
  if (!pause) return null;
  const waited = waitedKey === pauseKey;
  const nick = view.seats.find((s) => s.id === pause.waitingFor)?.nickname ?? '';
  const canDecide = view.hostId === view.me && pause.hostCanDecide;
  const decide = async (choice: 'wait' | 'bot' | 'end') => {
    const r = await emit('host:decision', { choice });
    setError(r.ok ? null : r.error);
    if (r.ok && choice === 'wait') setWaitedKey(pauseKey);
  };
  return (
    <div className="overlay">
      <div className="dialog" data-testid="pause-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={ref} tabIndex={-1}>
        <p id={titleId} className="dialog-title">In attesa di {nick}…</p>
        {canDecide && waited && <p data-testid="pause-waiting">Ok, aspettiamo</p>}
        {canDecide && !waited && (
          <>
            <button type="button" data-testid="btn-pause-wait" onClick={() => decide('wait')}>
              Aspetta
            </button>
            <button type="button" data-testid="btn-pause-bot" onClick={() => decide('bot')}>
              Fai giocare un bot al suo posto
            </button>
            <button type="button" className="secondary" data-testid="btn-pause-end" onClick={() => decide('end')}>
              Termina la partita
            </button>
          </>
        )}
        {secondsLeft !== null && !waited && (
          <p className="pause-auto" data-testid="pause-auto-bot">
            {canDecide ? 'Se non scegli' : "Se l'host non sceglie"}, tra {secondsLeft} s gioca un bot al posto di {nick}. Potrà
            rientrare quando vuole.
          </p>
        )}
        {error && <p role="alert">{errorMessage(error)}</p>}
      </div>
    </div>
  );
}
