import { useState } from 'react';
import type { RoomView } from '@taotl/protocol';
import { errorMessage } from '../lib/errors';
import type { TypedEmit } from '../net/socket';

export function PauseDialog({ view, emit }: { view: RoomView; emit: TypedEmit }) {
  const [error, setError] = useState<string | null>(null);
  const pause = view.pause;
  if (!pause) return null;
  const nick = view.seats.find((s) => s.id === pause.waitingFor)?.nickname ?? '';
  const canDecide = view.hostId === view.me && pause.hostCanDecide;
  const decide = async (choice: 'wait' | 'bot' | 'end') => {
    const r = await emit('host:decision', { choice });
    setError(r.ok ? null : r.error);
  };
  return (
    <div className="overlay">
      <div className="dialog" data-testid="pause-dialog" role="dialog">
        <p>In attesa di {nick}…</p>
        {canDecide && (
          <>
            <button type="button" data-testid="btn-pause-wait" onClick={() => decide('wait')}>
              Aspetta
            </button>
            <button type="button" data-testid="btn-pause-bot" onClick={() => decide('bot')}>
              Gioca al suo posto
            </button>
            <button type="button" data-testid="btn-pause-end" onClick={() => decide('end')}>
              Termina la partita
            </button>
          </>
        )}
        {error && <p role="alert">{errorMessage(error)}</p>}
      </div>
    </div>
  );
}
