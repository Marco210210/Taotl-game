import type { Card } from './types';

/** §3.2: carte per giocatore nelle 6 mani, indicizzate per numero di giocatori. */
export const CARDS_PER_HAND: Record<number, readonly number[]> = {
  2: [36, 25, 14, 3, 2, 1],
  3: [24, 17, 10, 3, 2, 1],
  4: [18, 13, 8, 3, 2, 1],
  5: [14, 10, 6, 3, 2, 1],
  6: [12, 9, 6, 3, 2, 1],
  7: [10, 7, 5, 3, 2, 1],
  8: [9, 7, 5, 3, 2, 1],
  9: [8, 6, 4, 3, 2, 1],
  10: [7, 5, 4, 3, 2, 1],
  11: [6, 5, 4, 3, 2, 1],
  12: [6, 5, 4, 3, 2, 1],
};

export function cardsPerHand(players: number, hand: 1 | 2 | 3 | 4 | 5 | 6): number {
  const row = CARDS_PER_HAND[players];
  if (!row) throw new Error(`Numero di giocatori non valido: ${players}`);
  const n = row[hand - 1];
  if (n === undefined || !Number.isInteger(hand)) throw new Error(`Mano non valida: ${hand}`);
  return n;
}

/** Distribuisce n carte a testa dal mazzo (già mescolato); il resto è `leftover`. */
export function deal(
  deck: Card[],
  players: number,
  n: number,
): { hands: Card[][]; leftover: Card[] } {
  const needed = players * n;
  if (needed > deck.length) {
    throw new Error(`Carte insufficienti: servono ${needed}, nel mazzo ${deck.length}`);
  }
  const hands: Card[][] = [];
  for (let p = 0; p < players; p++) hands.push(deck.slice(p * n, (p + 1) * n));
  return { hands, leftover: deck.slice(needed) };
}
