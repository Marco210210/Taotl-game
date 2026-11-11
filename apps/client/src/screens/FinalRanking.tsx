import { useState } from 'react';
import { ranking } from '@taotl/engine';
import type { RoomView } from '@taotl/protocol';
import { errorMessage } from '../lib/errors';
import type { TypedEmit } from '../net/socket';

export function FinalRanking({ view, emit }: { view: RoomView; emit: TypedEmit }) {
  const [error, setError] = useState<string | null>(null);
  const game = view.game;
  const rows = game ? ranking(game.players) : [];
  const winners = rows.filter((r) => r.winner).length;
  const name = (id: string) => view.seats.find((s) => s.id === id)?.nickname ?? id;
  const rematch = async () => {
    const r = await emit('game:rematch');
    setError(r.ok ? null : r.error);
  };
  return (
    <main data-testid="final-ranking" className="screen final-ranking">
      <h1>{winners > 1 ? 'Vincitori' : 'Vincitore'}</h1>
      <ol>
        {rows.map((r) => (
          <li key={r.id} data-testid={`ranking-row-${r.id}`}>
            <span data-testid="ranking-position">{r.position}</span> <span>{name(r.id)}</span>{' '}
            <span data-testid="ranking-total">{r.total}</span>
            {r.winner && <strong className="badge">Vincitore</strong>}
          </li>
        ))}
      </ol>
      {view.me === view.hostId && (
        <button type="button" data-testid="btn-rematch" onClick={() => void rematch()}>
          Rivincita
        </button>
      )}
      {error && <p role="alert">{errorMessage(error)}</p>}
    </main>
  );
}
