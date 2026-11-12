import { useEffect, useState, type CSSProperties } from 'react';
import { cardId, type Card as CardT, type CardId } from '@taotl/engine';
import { sortHand } from '../lib/sortHand';
import { Card } from './Card';

export function Hand({ cards, playable, onPlay, myTurn = false }: { cards: CardT[]; playable: Set<CardId>; onPlay: (id: CardId) => void; myTurn?: boolean }) {
  const [selected, setSelected] = useState<CardId | null>(null);
  const sorted = sortHand(cards);
  const key = sorted.map(cardId).join(',');
  const playableKey = [...playable].sort().join(',');
  // la selezione decade se la mano o la giocabilità cambiano
  useEffect(() => setSelected(null), [key, playableKey]);
  const active = selected !== null && playable.has(selected) ? selected : null;

  const play = (id: CardId) => {
    setSelected(null);
    onPlay(id);
  };
  // porzione visibile di ogni carta sovrapposta (px): ≥ 32 anche con 36 carte, il resto si scorre
  const slice = sorted.length <= 6 ? 52 : sorted.length <= 10 ? 40 : 32;
  return (
    <div className="hand-wrap">
      <div className="hand" data-testid="hand" style={{ '--slice': `${slice}px` } as CSSProperties}>
        {sorted.map((c) => {
          const id = cardId(c);
          return (
            <Card
              key={id}
              card={c}
              size="hand"
              disabled={!playable.has(id)}
              dimmed={myTurn && !playable.has(id)}
              selected={active === id}
              onClick={() => (active === id ? play(id) : setSelected(id))}
            />
          );
        })}
      </div>
      <div className="play-slot">
        {active && (
          <button type="button" data-testid="btn-play" onClick={() => play(active)}>
            Gioca
          </button>
        )}
      </div>
    </div>
  );
}
