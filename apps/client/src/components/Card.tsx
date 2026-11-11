import { cardId, type Card as CardT } from '@taotl/engine';
import { cardLabel, rankLabel } from '../lib/labels';

const GLYPH = { picche: '♠', cuori: '♥', quadri: '♦', fiori: '♣', totem: '✦' } as const;

export function shortLabel(c: CardT): string {
  if (c.kind === 'suited') return `${rankLabel(c.rank)}${GLYPH[c.suit]}`;
  return cardLabel(c);
}

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

export function Card({ card, label = null, disabled = false, selected = false, onClick, size = 'trick', interactive = true }: CardProps) {
  const suit = card.kind === 'suited' ? card.suit : card.kind;
  const face = (
    <>
      <span className="card-face">{shortLabel(card)}</span>
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
