import type { PlayerView } from '@taotl/engine';
import type { SeatView } from '@taotl/protocol';

export function PlayersBar({ game, seats }: { game: PlayerView; seats: SeatView[] }) {
  return (
    <section className="players-bar">
      <header>
        <strong>
          Dichiarate {game.totalBid} / {game.cardsPerPlayer}
        </strong>
        <span className="muted">Mano {game.handNumber}/6</span>
      </header>
      <ul className="seat-strip">
        {seats.map((s) => {
          const p = game.players.find((x) => x.id === s.id);
          if (!p) return null;
          const turn = s.id === game.turnId;
          return (
            <li key={s.id} data-testid={`seat-${s.id}`} className={turn ? 'turn' : undefined}>
              <span className="seat-name">
                {turn && (
                  <>
                    <span aria-hidden="true">▶ </span>
                    <span className="sr-only">Di turno: </span>
                  </>
                )}
                {s.nickname}
                {s.id === game.dealerId && (
                  <span className="badge">
                    <span aria-hidden="true">M</span>
                    <span className="sr-only">Mazziere</span>
                  </span>
                )}
                {s.isBot && <span className="badge">bot</span>}
                {!s.connected && !s.isBot && <span className="badge">disconnesso</span>}
                {s.botControlled && !s.isBot && <span className="badge">bot al suo posto</span>}
              </span>
              <span className="seat-stats">
                dich. {p.bid ?? '–'} · fatte {p.tricksWon} · carte {p.handCount} · tot {p.total}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
