import { cardId, type Card as CardT, type Rank, type Suit } from '@taotl/engine';
import { cardLabel, rankLabel } from '../lib/labels';
import { ChipetlFace, Fret, GodFace } from './cardArt/faces';
import { SUIT_COLOR, SuitGlyph } from './cardArt/glyphs';

export interface CardProps {
  card: CardT;
  label?: 'Chipetl' | 'Nullo' | null;
  disabled?: boolean;
  /** Illegale adesso (tocca a me, ma la carta non è giocabile): attenuata. */
  dimmed?: boolean;
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
      <text className="card-rank" x="9.5" y="18" textAnchor="middle" fontSize={text.length > 1 ? 15 : 19} textLength={text.length > 1 ? 13 : undefined} lengthAdjust="spacingAndGlyphs" style={{ fill: SUIT_COLOR[suit] }}>
        {text}
      </text>
      <SuitGlyph suit={suit} x={2.5} y={21.5} size={14} />
    </>
  );
}

/** Figura geometrica per J/Q/K: stessa maschera, copricapo diverso per rango. */
function CourtFigure({ suit, rank }: { suit: Suit; rank: 11 | 12 | 13 }) {
  const c = SUIT_COLOR[suit];
  return (
    <g>
      {rank === 11 && (
        <>
          <path d="M21 34 V30 H39 V34 Z" fill={c} />
          <path d="M30 30 Q25 22 30 14 Q35 22 30 30Z" fill={c} />
        </>
      )}
      {rank === 12 &&
        [-52, -26, 0, 26, 52].map((deg) => {
          const a = (deg * Math.PI) / 180;
          const x1 = 30 + 6 * Math.sin(a);
          const y1 = 34 - 6 * Math.cos(a);
          return <polygon key={deg} points={`${x1 - 2.6 * Math.cos(a)},${y1 - 2.6 * Math.sin(a)} ${30 + 19 * Math.sin(a)},${34 - 19 * Math.cos(a)} ${x1 + 2.6 * Math.cos(a)},${y1 + 2.6 * Math.sin(a)}`} fill={c} />;
        })}
      {rank === 13 && <path d="M21 34 V27 H24 V22 H27 V16 H33 V22 H36 V27 H39 V34 Z" fill={c} />}
      <path d="M22 34 H38 V50 L34 56 H26 L22 50 Z" fill={c} />
      <path d="M24.5 41 H28.5 M31.5 41 H35.5" stroke="var(--paper)" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M27 50 H33" stroke="var(--paper)" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="19.6" cy="45" r="2.3" fill={c} />
      <circle cx="40.4" cy="45" r="2.3" fill={c} />
      <SuitGlyph suit={suit} x={24.5} y={60} size={11} />
    </g>
  );
}

function FretBands({ color }: { color: string }) {
  return (
    <g opacity="0.75">
      <Fret x={21} y={5} w={18} color={color} />
      <g transform="rotate(180 30 44)">
        <Fret x={21} y={5} w={18} color={color} />
      </g>
    </g>
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
      <FretBands color={totem ? 'var(--gold)' : SUIT_COLOR[suit]} />
      <Index rank={rank} suit={suit} />
      <g transform="rotate(180 30 44)">
        <Index rank={rank} suit={suit} />
      </g>
      {pips ? (
        pips.map(([c, r], i) => <SuitGlyph key={i} suit={suit} x={23 + c * 7 - 6} y={18 + r * 13 - 6} size={rank >= 9 ? 11 : 12} />)
      ) : (
        <>
          {rank === 14 && <circle cx="30" cy="44" r="19" fill="none" stroke={SUIT_COLOR[suit]} strokeWidth="1.2" strokeDasharray="2.5 2" opacity="0.7" />}
          {court && rank < 14 ? <CourtFigure suit={suit} rank={rank as 11 | 12 | 13} /> : <SuitGlyph suit={suit} x={15} y={29} size={30} />}
        </>
      )}
    </>
  );
}

export function Card({ card, label = null, disabled = false, dimmed = false, selected = false, onClick, size = 'trick', interactive = true }: CardProps) {
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
      className={`card card-${size} suit-${suit}${selected ? ' selected' : ''}${disabled ? ' disabled' : ''}${dimmed ? ' dimmed' : ''}`}
      onClick={disabled ? undefined : onClick}
    >
      {face}
    </button>
  );
}
