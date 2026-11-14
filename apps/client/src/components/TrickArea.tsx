import type { CSSProperties } from 'react';
import type { PlayedCard } from '@taotl/engine';
import type { SeatView } from '@taotl/protocol';
import type { Point } from '../lib/seatLayout';
import { Card } from './Card';

interface TrickProps {
  cards: PlayedCard[];
  seats: SeatView[];
  seatPos: Map<string, Point>;
  spotPos: Map<string, Point>;
  /** presente a presa completata: le carte vanno verso il vincitore */
  winnerId?: string;
  /** numero della presa: cambia la chiave delle carte a ogni presa nuova */
  trickNo: number;
}

const pct = (p: Point | undefined) => ({ x: `${p?.x ?? 50}%`, y: `${p?.y ?? 50}%` });

/** Carte della presa in corso, ognuna davanti a chi l'ha giocata. */
export function TrickArea({ cards, seats, seatPos, spotPos, winnerId, trickNo }: TrickProps) {
  const name = (id: string) => seats.find((s) => s.id === id)?.nickname ?? id;
  const w = pct(winnerId ? seatPos.get(winnerId) : undefined);
  return (
    <ol
      className={`trick-layer${winnerId ? ' collect' : ''}`}
      data-testid="trick"
      aria-label="Presa in corso"
      style={{ '--wx': w.x, '--wy': w.y, listStyle: 'none', margin: 0, padding: 0 } as CSSProperties}
    >
      {cards.map((p, i) => {
        const at = pct(spotPos.get(p.playerId));
        const from = pct(seatPos.get(p.playerId));
        const winner = p.playerId === winnerId;
        return (
          <li
            key={`${trickNo}-${p.playerId}`}
            className={`trick-slot${winner ? ' winner' : ''}`}
            data-testid="trick-slot"
            data-player={p.playerId}
            data-winner={winner}
            style={{ left: at.x, top: at.y, '--sx': from.x, '--sy': from.y, zIndex: i + 1 } as CSSProperties}
          >
            <Card card={p.card} label={p.label} size="trick" interactive={false} />
            <span className="sr-only">
              giocata da {name(p.playerId)}
              {winner ? ', vince la presa' : ''}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
