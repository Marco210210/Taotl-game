import { useEffect, useId, useState } from 'react';
import type { RoomView } from '@taotl/protocol';
import { errorMessage } from '../lib/errors';
import type { TypedEmit } from '../net/socket';
import { useDialogFocus } from './useDialogFocus';

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
              Gioca al suo posto
            </button>
            <button type="button" className="secondary" data-testid="btn-pause-end" onClick={() => decide('end')}>
              Termina la partita
            </button>
          </>
        )}
        {error && <p role="alert">{errorMessage(error)}</p>}
      </div>
    </div>
  );
}
