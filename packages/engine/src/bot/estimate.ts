import type { Card, Suit } from '../types';

// Pesi iniziali dell'euristica (§8), da tarare nel Task 2.3.
export const W_SURE = 0.9; // Taotl e Totem J/Q/K/A
export const W_LOW_TOTEM = 0.35; // Totem 2..10
export const LOW_TOTEM_SHORT_BONUS = 1.5; // moltiplicatore con >= 2 colori corti
export const SHORT_SUITS_NEEDED = 2;
export const SHORT_SUIT_MAX = 1;
export const W_GOD_ACE = 0.6; // Dio Rosso/Nero e Assi normali
export const GOD_ACE_FULL_AT = 8; // carte per mano a cui il peso è pieno
export const W_KING = 0.3; // K normali
export const KING_FULL_AT = 10;

const NORMAL_SUITS: readonly Suit[] = ['picche', 'cuori', 'quadri', 'fiori'];

/** Stima reale delle prese che la mano può prendere, in [0, n]. */
export function estimateTricks(hand: Card[], n: number, _playerCount: number): number {
  const shortSuits = NORMAL_SUITS.filter(
    (s) => hand.filter((x) => x.kind === 'suited' && x.suit === s).length <= SHORT_SUIT_MAX,
  ).length;
  const lowTotemMul = shortSuits >= SHORT_SUITS_NEEDED ? LOW_TOTEM_SHORT_BONUS : 1;
  const godAce = W_GOD_ACE * Math.min(1, n / GOD_ACE_FULL_AT);
  const king = W_KING * Math.min(1, n / KING_FULL_AT);

  let total = 0;
  for (const card of hand) {
    if (card.kind === 'god') {
      total += card.god === 'taotl' ? W_SURE : godAce;
    } else if (card.kind === 'suited') {
      if (card.suit === 'totem') total += card.rank >= 11 ? W_SURE : W_LOW_TOTEM * lowTotemMul;
      else if (card.rank === 14) total += godAce;
      else if (card.rank === 13) total += king;
    }
  }
  return Math.max(0, Math.min(n, total));
}

/**
 * Dichiarazione: stima arrotondata (o per difetto con `mode: 'floor'`), poi il valore lecito
 * più vicino (a parità il più basso).
 */
export function chooseBid(
  hand: Card[],
  n: number,
  playerCount: number,
  legal: number[],
  mode: 'round' | 'floor' = 'round',
): number {
  if (legal.length === 0) throw new Error('Nessuna dichiarazione lecita');
  const estimate = estimateTricks(hand, n, playerCount);
  const target = mode === 'floor' ? Math.floor(estimate) : Math.round(estimate);
  let best = legal[0]!;
  for (const v of legal) {
    const d = Math.abs(v - target);
    const bd = Math.abs(best - target);
    if (d < bd || (d === bd && v < best)) best = v;
  }
  return best;
}
