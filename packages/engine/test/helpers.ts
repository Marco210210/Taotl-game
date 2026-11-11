import type { Card, Rank, Suit } from '../src/types';

const NORMAL_SUITS: Record<string, Suit> = {
  '♠': 'picche',
  '♥': 'cuori',
  '♦': 'quadri',
  '♣': 'fiori',
};
const RANKS: Record<string, Rank> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  J: 11, Q: 12, K: 13, A: 14,
};
const GODS: Record<string, 'rosso' | 'nero' | 'taotl'> = { DR: 'rosso', DN: 'nero', TAO: 'taotl' };

/** Parser di notazione: '5♥' '10♣' 'AT' (Totem) 'DR' 'DN' 'TAO' 'CH1'..'CH4'. */
export function c(s: string): Card {
  if (s in GODS) return { kind: 'god', god: GODS[s]! };
  const ch = /^CH([1-4])$/.exec(s);
  if (ch) return { kind: 'chipetl', n: Number(ch[1]) as 1 | 2 | 3 | 4 };
  if (s.length >= 2) {
    const rankStr = s.slice(0, -1);
    const sym = s.slice(-1);
    const rank = RANKS[rankStr];
    if (rank !== undefined) {
      if (sym === 'T') return { kind: 'suited', suit: 'totem', rank };
      const suit = NORMAL_SUITS[sym];
      if (suit) return { kind: 'suited', suit, rank };
    }
  }
  throw new Error(`Notazione carta sconosciuta: ${s}`);
}
