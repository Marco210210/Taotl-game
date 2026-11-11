import { cardId, type Card as CardT, type Rank, type Suit } from '@taotl/engine';
import { cardLabel, rankLabel } from '../lib/labels';
import { ChipetlFace, GodFace } from './cardArt/faces';
import { SUIT_COLOR, SuitGlyph } from './cardArt/glyphs';

export interface CardProps {
  card: CardT;
  label?: 'Chipetl' | 'Nullo' | null;
  disabled?: boolean;
  selected?: boolean;
  onClick?: () => void;
  size?: 'hand' | 'trick' | 'mini';
  /** false: carta solo da guardare (non è un bottone). */
  interactive?: boolean;
}

type Size = NonNullable<CardProps['size']>;

/** Posizioni dei simboli (colonna 0-2, riga 0-4) come sulle carte da gioco classiche. */
const PIPS: Record<number, Array<[number, number]>> = {
  2: [[1, 0], [1, 4]],
  3: [[1, 0], [1, 2], [1, 4]],
  4: [[0, 0], [2, 0], [0, 4], [2, 4]],
  5: [[0, 0], [2, 0], [1, 2], [0, 4], [2, 4]],
  6: [[0, 0], [2, 0], [0, 2], [2, 2], [0, 4], [2, 4]],
  7: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2], [0, 4], [2, 4]],
  8: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2], [1, 3], [0, 4], [2, 4]],
  9: [[0, 0], [2, 0], [0, 4 / 3], [2, 4 / 3], [1, 2], [0, 8 / 3], [2, 8 / 3], [0, 4], [2, 4]],
  10: [[0, 0], [2, 0], [1, 2 / 3], [0, 4 / 3], [2, 4 / 3], [0, 8 / 3], [2, 8 / 3], [1, 10 / 3], [0, 4], [2, 4]],
};

function Index({ rank, suit }: { rank: Rank; suit: Suit }) {
  const text = rankLabel(rank);
  return (
    <>
      <text className="card-rank" x="9.5" y="18" textAnchor="middle" fontSize={text.length > 1 ? 15 : 19} style={{ fill: SUIT_COLOR[suit] }}>
        {text}
      </text>
      <SuitGlyph suit={suit} x={2.5} y={21.5} size={14} />
    </>
  );
}

function SuitedFace({ suit, rank, size }: { suit: Suit; rank: Rank; size: Size }) {
  const totem = suit === 'totem';
  const court = rank >= 11;
  const pips = size !== 'mini' && rank <= 10 ? PIPS[rank] : undefined;
  return (
    <>
      <rect x="1" y="1" width="58" height="86" rx="6" fill={totem ? 'var(--paper-totem)' : 'var(--paper)'} stroke={totem ? 'var(--gold)' : 'var(--ink)'} strokeWidth="1.6" />
      <rect x="3.6" y="3.6" width="52.8" height="80.8" rx="4" fill="none" stroke={totem ? 'var(--gold)' : SUIT_COLOR[suit]} strokeWidth={totem ? 1.4 : 0.7} opacity={totem ? 1 : 0.6} />
      {totem && <rect x="6" y="6" width="48" height="76" rx="3" fill="none" stroke="var(--suit-totem)" strokeWidth="0.7" strokeDasharray="2 1.6" />}
      <Index rank={rank} suit={suit} />
      <g transform="rotate(180 30 44)">
        <Index rank={rank} suit={suit} />
      </g>
      {pips ? (
        pips.map(([c, r], i) => <SuitGlyph key={i} suit={suit} x={23 + c * 7 - 6} y={18 + r * 13 - 6} size={rank >= 9 ? 11 : 12} />)
      ) : (
        <>
          {court && <path d="M30 17 L47 44 L30 71 L13 44 Z" fill="none" stroke={SUIT_COLOR[suit]} strokeWidth="1.2" opacity="0.55" />}
          {rank === 14 && <circle cx="30" cy="44" r="19" fill="none" stroke={SUIT_COLOR[suit]} strokeWidth="1.2" strokeDasharray="2.5 2" opacity="0.7" />}
          <SuitGlyph suit={suit} x={court ? 17 : 15} y={court ? 31 : 29} size={court ? 26 : 30} />
        </>
      )}
      {court && rank < 14 && (
        <g fill={SUIT_COLOR[suit]}>
          {Array.from({ length: rank - 10 }, (_, i) => (
            <rect key={i} x={30 + (i - (rank - 11) / 2) * 5 - 1.5} y="10" width="3" height="3" />
          ))}
        </g>
      )}
    </>
  );
}

export function Card({ card, label = null, disabled = false, selected = false, onClick, size = 'trick', interactive = true }: CardProps) {
  const suit = card.kind === 'suited' ? card.suit : card.kind;
  const face = (
    <>
      <svg className="card-art" viewBox="0 0 60 88" aria-hidden="true" focusable="false">
        {card.kind === 'suited' && <SuitedFace suit={card.suit} rank={card.rank} size={size} />}
        {card.kind === 'god' && <GodFace god={card.god} />}
        {card.kind === 'chipetl' && <ChipetlFace n={card.n} />}
      </svg>
      {label && <span className="card-overlay">{label}</span>}
    </>
  );
  if (!interactive) {
    return (
      <span
        data-testid="card"
        data-card-id={cardId(card)}
        aria-label={cardLabel(card)}
        aria-disabled="true"
        role="img"
        className={`card card-${size} suit-${suit} static`}
      >
        {face}
      </span>
    );
  }
  return (
    <button
      type="button"
      data-testid="card"
      data-card-id={cardId(card)}
      aria-label={cardLabel(card)}
      aria-disabled={disabled ? 'true' : 'false'}
      aria-pressed={selected ? 'true' : 'false'}
      className={`card card-${size} suit-${suit}${selected ? ' selected' : ''}${disabled ? ' disabled' : ''}`}
      onClick={disabled ? undefined : onClick}
    >
      {face}
    </button>
  );
}
