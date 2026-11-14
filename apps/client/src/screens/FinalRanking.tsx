import { useState } from 'react';
import { ranking } from '@taotl/engine';
import type { RoomView } from '@taotl/protocol';
import { Card } from '../components/Card';
import { errorMessage } from '../lib/errors';
import type { TypedEmit } from '../net/socket';

export function FinalRanking({ view, emit }: { view: RoomView; emit: TypedEmit }) {
  const [error, setError] = useState<string | null>(null);
  const game = view.game;
  const rows = game ? ranking(game.players) : [];
  const winners = rows.filter((r) => r.winner);
  const name = (id: string) => view.seats.find((s) => s.id === id)?.nickname ?? id;
  const rematch = async () => {
    const r = await emit('game:rematch');
    setError(r.ok ? null : r.error);
  };
  return (
    <main data-testid="final-ranking" className="screen final-ranking">
      <div className="hero">
        <div className="hero-card" aria-hidden="true">
          <Card card={{ kind: 'god', god: 'taotl' }} interactive={false} />
        </div>
        <p className="winner-name">{winners.map((w) => name(w.id)).join(' e ')}</p>
      </div>
      <section className="sheet">
        <h1>{winners.length > 1 ? 'Vincitori' : 'Vincitore'}</h1>
        <ol>
          {rows.map((r) => (
            <li key={r.id} data-testid={`ranking-row-${r.id}`} className={r.winner ? 'winner' : undefined}>
              <span data-testid="ranking-position">{r.position}</span>
              <span>
                {name(r.id)}
                {r.id === view.me && ' (tu)'}
              </span>
              <span data-testid="ranking-total">{r.total}</span>
              {r.winner ? <strong className="badge">Vincitore</strong> : <span />}
            </li>
          ))}
        </ol>
        {view.me === view.hostId ? (
          <button type="button" data-testid="btn-rematch" onClick={() => void rematch()}>
            Rivincita
          </button>
        ) : (
          <p className="muted">L'host può proporre la rivincita.</p>
        )}
        {error && <p role="alert">{errorMessage(error)}</p>}
      </section>
    </main>
  );
}
