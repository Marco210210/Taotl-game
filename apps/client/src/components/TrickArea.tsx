import type { PlayedCard } from '@taotl/engine';
import type { SeatView } from '@taotl/protocol';
import { Card } from './Card';

interface TrickProps {
  cards: PlayedCard[];
  seats: SeatView[];
  winnerId?: string;
}

export function TrickCards({ cards, seats, winnerId }: TrickProps) {
  const name = (id: string) => seats.find((s) => s.id === id)?.nickname ?? id;
  return (
    <ul className="trick-cards">
      {cards.map((p) => (
        <li key={p.playerId} className={p.playerId === winnerId ? 'winner' : undefined}>
          <Card card={p.card} label={p.label} size="trick" disabled />
          <span>
            {name(p.playerId)}
            {p.playerId === winnerId ? ' ★' : ''}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function TrickArea(props: TrickProps) {
  return (
    <div className="trick-area">
      {props.cards.length === 0 ? <p className="muted">Nessuna carta sul tavolo</p> : <TrickCards {...props} />}
    </div>
  );
}
