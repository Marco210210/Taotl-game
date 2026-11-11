import { useEffect, useState } from 'react';
import { cardId, type Card as CardT, type CardId } from '@taotl/engine';
import { sortHand } from '../lib/sortHand';
import { Card } from './Card';

export function Hand({ cards, playable, onPlay }: { cards: CardT[]; playable: Set<CardId>; onPlay: (id: CardId) => void }) {
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
  return (
    <div className="hand-wrap">
      <div className="hand">
        {sorted.map((c) => {
          const id = cardId(c);
          return (
            <Card
              key={id}
              card={c}
              size="hand"
              disabled={!playable.has(id)}
              selected={active === id}
              onClick={() => (active === id ? play(id) : setSelected(id))}
            />
          );
        })}
      </div>
      {active && (
        <button type="button" data-testid="btn-play" onClick={() => play(active)}>
          Gioca
        </button>
      )}
    </div>
  );
}
