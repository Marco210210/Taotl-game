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

export interface HandProps {
  cards: CardT[];
  /** carte giocabili adesso (vuoto fuori dal mio turno di gioco) */
  playable: Set<CardId>;
  /**
   * carte preselezionabili fuori turno: quelle lecite (§5.4) nella presa in corso, solo dopo che il primo
   * di mano ha giocato e finché non ho giocato io; vuoto = nessuna preselezione possibile
   */
  preselectable?: Set<CardId>;
  onPlay: (id: CardId) => void;
  /** è il mio turno di giocare una carta */
  myTurn?: boolean;
}

const NONE: Set<CardId> = new Set();

/**
 * La mia mano (SPEC §7.4).
 * - Nel mio turno: un tocco su una carta giocabile la gioca subito.
 * - Fuori turno, dopo che il primo di mano ha giocato: toccabili solo le carte lecite; un tocco solleva una
 *   carta (preselezione), un altro la abbassa, un'altra sposta la selezione. Quando arriva il mio turno la
 *   carta preselezionata si gioca da sola; se nel frattempo è diventata non lecita si abbassa da sola.
 */
export function Hand({ cards, playable, preselectable = NONE, onPlay, myTurn = false }: HandProps) {
  const [selected, setSelected] = useState<CardId | null>(null);
  const sorted = sortHand(cards);
  const key = sorted.map(cardId).join(',');
  const playableKey = [...playable].sort().join(',');
  const preKey = [...preselectable].sort().join(',');
  const onPlayRef = useRef(onPlay);
  onPlayRef.current = onPlay;
  useEffect(() => {
    if (selected === null) return;
    if (!key.split(',').includes(selected)) {
      setSelected(null);
      return;
    }
    if (myTurn) {
      // arriva il turno: la carta preselezionata parte da sola, se è ancora lecita
      setSelected(null);
      if (playable.has(selected)) onPlayRef.current(selected);
      return;
    }
    if (!preselectable.has(selected)) setSelected(null);
  }, [selected, key, playableKey, preKey, myTurn]);
  const { ref, slice } = useSlice(sorted.length);

  const tap = (id: CardId) => {
    if (myTurn) {
      if (!playable.has(id)) return;
      setSelected(null);
      onPlay(id);
      return;
    }
    if (!preselectable.has(id)) return;
    setSelected((sel) => (sel === id ? null : id));
  };
  // fuori turno, appena la presa è aperta, le carte non lecite si oscurano subito
  const preselecting = !myTurn && preselectable.size > 0;
  return (
    <div className="hand-wrap">
      <div className="hand" data-testid="hand" data-my-turn={myTurn} data-preselect={preselecting} ref={ref} style={{ '--slice': `${slice}px` } as CSSProperties}>
        <div className="hand-inner">
          {sorted.map((c) => {
            const id = cardId(c);
            const blocked = myTurn ? !playable.has(id) : preselecting && !preselectable.has(id);
            return (
              <Card key={id} card={c} size="hand" disabled={blocked} dimmed={blocked} selected={selected === id} onClick={() => tap(id)} />
            );
          })}
        </div>
      </div>
    </div>
  );
}
