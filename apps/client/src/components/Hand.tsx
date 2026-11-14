import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { cardId, type Card as CardT, type CardId } from '@taotl/engine';
import { sortHand } from '../lib/sortHand';
import { Card } from './Card';

/** Porzione minima visibile di ogni carta sovrapposta (px): sotto questa soglia la mano si scorre. */
const MIN_SLICE = 22;

/** Larghezza visibile di ogni carta: tutta la mano entra nello spazio disponibile, se possibile. */
function useSlice(count: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [slice, setSlice] = useState(40);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const card = el.querySelector<HTMLElement>('.card');
      const cw = card?.offsetWidth || 64;
      const avail = el.clientWidth - 8;
      const fit = count > 1 ? (avail - cw) / (count - 1) : cw;
      setSlice(Math.round(Math.max(MIN_SLICE, Math.min(cw * 0.66, fit))));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [count]);
  return { ref, slice };
}

export function Hand({ cards, playable, onPlay, myTurn = false }: { cards: CardT[]; playable: Set<CardId>; onPlay: (id: CardId) => void; myTurn?: boolean }) {
  const [selected, setSelected] = useState<CardId | null>(null);
  const sorted = sortHand(cards);
  const key = sorted.map(cardId).join(',');
  const playableKey = [...playable].sort().join(',');
  // la selezione decade se la mano o la giocabilità cambiano
  useEffect(() => setSelected(null), [key, playableKey]);
  const active = selected !== null && playable.has(selected) ? selected : null;
  const { ref, slice } = useSlice(sorted.length);

  const play = (id: CardId) => {
    setSelected(null);
    onPlay(id);
  };
  return (
    <div className="hand-wrap">
      <div className="hand" data-testid="hand" ref={ref} style={{ '--slice': `${slice}px` } as CSSProperties}>
        <div className="hand-inner">
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
