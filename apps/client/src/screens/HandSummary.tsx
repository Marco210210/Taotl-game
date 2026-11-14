import { useId, useState } from 'react';
import type { RoomView } from '@taotl/protocol';
import { useDialogFocus } from '../components/useDialogFocus';
import { errorMessage } from '../lib/errors';
import type { TypedEmit } from '../net/socket';

const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');

export function HandSummary({ view, emit }: { view: RoomView; emit: TypedEmit }) {
  const [error, setError] = useState<string | null>(null);
  const titleId = useId();
  const ref = useDialogFocus<HTMLElement>();
  const game = view.game;
  if (!game) return null;
  const isHost = view.me === view.hostId;
  const next = async () => {
    const r = await emit('game:nextHand');
    setError(r.ok ? null : r.error);
  };
  return (
    <div className="overlay">
      <section data-testid="hand-summary" className="dialog hand-summary" role="dialog" aria-labelledby={titleId} ref={ref} tabIndex={-1}>
        <h2 id={titleId} className="dialog-title">
          Fine mano {game.handNumber}
        </h2>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Giocatore</th>
                <th>Dichiarate</th>
                <th>Fatte</th>
                <th>Punti</th>
                <th>Totale</th>
              </tr>
            </thead>
            <tbody>
              {view.seats.map((s) => {
                const p = game.players.find((x) => x.id === s.id);
                if (!p) return null;
                const points = p.handScores.at(-1) ?? 0;
                return (
                  <tr key={s.id} data-testid={`summary-row-${s.id}`} className={s.id === view.me ? 'me' : undefined}>
                    <td>{s.nickname}</td>
                    <td data-testid="summary-bid">{p.bid ?? '–'}</td>
                    <td data-testid="summary-made">{p.tricksWon}</td>
                    <td data-testid="summary-points" className={points > 0 ? 'pos' : points < 0 ? 'neg' : undefined}>
                      {signed(points)}
                    </td>
                    <td data-testid="summary-total">{p.total}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="foot">
          {isHost ? (
            <button type="button" data-testid="btn-next-hand" onClick={() => void next()}>
              {game.handNumber >= 6 ? 'Vedi la classifica' : 'Prossima mano'}
            </button>
          ) : (
            <p className="muted">In attesa dell'host…</p>
          )}
          {error && <p role="alert">{errorMessage(error)}</p>}
        </div>
      </section>
    </div>
  );
}
