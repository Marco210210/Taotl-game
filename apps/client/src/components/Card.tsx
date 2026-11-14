import { cardId, type Card as CardT, type Rank, type Suit } from '@taotl/engine';
import { cardLabel, rankLabel } from '../lib/labels';
import { CourtFigure, FIGURES } from './cardArt/figures';
import { BackArt, ChipetlArt, GodArt } from './cardArt/gods';
import { CARD_H, CARD_W, INK, MID, SUIT_INK } from './cardArt/ink';
import { Pip, type PipKind } from './cardArt/pips';

export interface CardProps {
  /** Assente: carta coperta (retro). */
  card?: CardT;
  label?: 'Chipetl' | 'Nullo' | null;
  disabled?: boolean;
  /** Illegale adesso (tocca a me, ma la carta non è giocabile): attenuata. */
  dimmed?: boolean;
  selected?: boolean;
  onClick?: () => void;
  size?: 'hand' | 'trick' | 'mini';
  /** false: carta solo da guardare (non è un bottone). */
  interactive?: boolean;
  className?: string;
}

/** Posizioni dei simboli (colonna 0-2, riga 0-4) come sulle carte classiche. */
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
const PIP_X = [40, 60, 80];
const PIP_Y0 = 40;
const PIP_DY = (2 * (MID - PIP_Y0)) / 4;

const NAME_FONT = 'var(--font-display)';

/** Asterisco rosso in alto al centro, come su ogni carta del mazzo originale. */
function Asterisk() {
  return <path d="M60 4.6v6.4M57.2 6.2l5.6 3.2M62.8 6.2l-5.6 3.2" stroke={INK.red} strokeWidth="1.3" strokeLinecap="round" />;
}

/** Indice d'angolo: simbolo sopra, valore sotto. Grande, perché nel ventaglio si vede solo questo. */
function Corner({ kind, rank, color }: { kind: PipKind; rank?: string; color: string }) {
  const one = (x: number) => (
    <g key={x}>
      <Pip kind={kind} cx={x} cy={18.4} w={17.6} />
      {rank && (
        <text
          className="card-rank"
          x={x}
          y={50}
          textAnchor="middle"
          fontSize={25}
          textLength={rank.length > 1 ? 23 : undefined}
          lengthAdjust="spacingAndGlyphs"
          fill={color}
        >
          {rank}
        </text>
      )}
    </g>
  );
  return (
    <>
      {[14, 106].map(one)}
      <g transform={`rotate(180 60 ${MID})`}>{[14, 106].map(one)}</g>
    </>
  );
}

/** Nome scritto in verticale lungo il bordo destro (e capovolto in basso a sinistra). */
function SideName({ name, from = 58 }: { name: string; from?: number }) {
  const one = (
    <text transform={`translate(107.6 ${from}) rotate(90)`} fontFamily={NAME_FONT} fontSize="12.4" fill={INK.black}>
      {name}
    </text>
  );
  return (
    <>
      {one}
      <g transform={`rotate(180 60 ${MID})`}>{one}</g>
    </>
  );
}

function Paper() {
  return <rect x="0.8" y="0.8" width={CARD_W - 1.6} height={CARD_H - 1.6} rx="8" fill={INK.paper} stroke="#c9c4b4" strokeWidth="1.2" />;
}

function AceTotem() {
  return (
    <g stroke={INK.black} strokeWidth="2" strokeLinejoin="round">
      <path d="M33 70V58H39V52H48V47H72V52H81V58H87V70Z" fill={INK.yellow} />
      {[42, 50, 58, 66, 74].map((x) => <rect key={x} x={x} y={56} width="4" height="10" rx="1.6" fill={INK.black} stroke="none" />)}
      <path d="M36 70H84V110C84 124 73 134 60 134S36 124 36 110Z" fill={INK.yellow} />
      <path d="M43 86Q49 81 55 86 49 90 43 86ZM65 86Q71 81 77 86 71 90 65 86Z" fill={INK.paper} />
      <path d="M60 89 55 106H65Z" fill={INK.black} />
      <path d="M48 116Q60 111 72 116 60 123 48 116Z" fill={INK.paper} />
      <path d="M38 128Q60 140 82 128L80 136Q60 146 40 136Z" fill={INK.black} />
    </g>
  );
}

function SuitedFace({ suit, rank }: { suit: Suit; rank: Rank }) {
  const color = SUIT_INK[suit];
  const court = rank >= 11 && rank <= 13 ? FIGURES[suit][rank as 11 | 12 | 13] : null;
  return (
    <>
      <Paper />
      <Asterisk />
      <Corner kind={suit} rank={rankLabel(rank)} color={color} />
      {court && (
        <>
          <CourtFigure spec={court} />
          <SideName name={court.name} />
        </>
      )}
      {rank === 14 && (suit === 'totem' ? <AceTotem /> : <Pip kind={suit} cx={60} cy={MID} w={suit === 'cuori' ? 54 : 58} />)}
      {rank <= 10 && PIPS[rank]!.map(([c, r], i) => <Pip key={i} kind={suit} cx={PIP_X[c]!} cy={PIP_Y0 + r * PIP_DY} w={rank >= 9 ? 18.5 : 21} flip={r > 2} />)}
    </>
  );
}

const GOD_TITLE = { rosso: 'dio rosso', nero: 'dio nero', taotl: 'taotl' } as const;
const GOD_NAME = { rosso: 'quetzalcoatl', nero: 'tezcatlipoca', taotl: 'huitzilopochtli' } as const;

function MagicFace({ card }: { card: Extract<CardT, { kind: 'god' } | { kind: 'chipetl' }> }) {
  const god = card.kind === 'god' ? card.god : null;
  const title = god ? (
    <text x="60" y="24" textAnchor="middle" fontFamily={NAME_FONT} fontSize="13.4" fill={INK.black} stroke={INK.paper} strokeWidth="3.2" paintOrder="stroke" strokeLinejoin="round">
      {GOD_TITLE[god]}
    </text>
  ) : null;
  return (
    <>
      <Paper />
      <Asterisk />
      <Corner kind={god ?? 'chipetl'} color={INK.black} />
      {god ? <GodArt god={god} /> : <ChipetlArt />}
      {title}
      {title && <g transform={`rotate(180 60 ${MID})`}>{title}</g>}
      <SideName name={god ? GOD_NAME[god] : 'chipetl'} from={god ? 40 : 46} />
    </>
  );
}

export function Card({ card, label = null, disabled = false, dimmed = false, selected = false, onClick, size = 'trick', interactive = true, className = '' }: CardProps) {
  const art = (
    <svg className="card-art" viewBox={`0 0 ${CARD_W} ${CARD_H}`} aria-hidden="true" focusable="false">
      {!card && <BackArt />}
      {card?.kind === 'suited' && <SuitedFace suit={card.suit} rank={card.rank} />}
      {card && card.kind !== 'suited' && <MagicFace card={card} />}
    </svg>
  );
  if (!card) {
    return (
      <span data-testid="card-back" role="img" aria-label="Carta coperta" className={`card card-${size} card-back static ${className}`}>
        {art}
      </span>
    );
  }
  const suit = card.kind === 'suited' ? card.suit : card.kind;
  const face = (
    <>
      {art}
      {label && <span className="card-overlay">{label}</span>}
    </>
  );
  if (!interactive) {
    return (
      <span
        data-testid="card"
        data-card-id={cardId(card)}
        aria-label={cardLabel(card) + (label ? ` (${label})` : '')}
        aria-disabled="true"
        role="img"
        className={`card card-${size} suit-${suit} static ${className}`}
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
      className={`card card-${size} suit-${suit}${selected ? ' selected' : ''}${disabled ? ' disabled' : ''}${dimmed ? ' dimmed' : ''} ${className}`}
      onClick={disabled ? undefined : onClick}
    >
      {face}
    </button>
  );
}
