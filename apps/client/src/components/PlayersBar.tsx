import type { PlayerView } from '@taotl/engine';
import type { SeatView } from '@taotl/protocol';

export function PlayersBar({ game, seats }: { game: PlayerView; seats: SeatView[] }) {
  return (
    <section className="players-bar">
      <header>
        <strong>
          Dichiarate {game.totalBid} / {game.cardsPerPlayer}
        </strong>
        <span> · Mano {game.handNumber}/6</span>
      </header>
      <ul className="seats">
        {seats.map((s) => {
          const p = game.players.find((x) => x.id === s.id);
          if (!p) return null;
          return (
            <li key={s.id} className={s.id === game.turnId ? 'turn' : undefined}>
              <span>
                {s.id === game.turnId && <span aria-label="Di turno">▶ </span>}
                {s.nickname}
                {s.id === game.dealerId && (
                  <span className="badge" title="Mazziere">
                    M
                  </span>
                )}
                {s.isBot && <span className="badge">bot</span>}
                {!s.connected && !s.isBot && <span className="badge">disconnesso</span>}
                {s.botControlled && !s.isBot && <span className="badge">bot al suo posto</span>}
              </span>
              <span>
                {p.bid ?? '–'}/{p.tricksWon} · carte {p.handCount} · tot {p.total}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
