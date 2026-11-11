import type { Card, Rank, Suit } from '@taotl/engine';

const FACES: Record<number, string> = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };
const SUITS: Record<Suit, string> = { picche: 'Picche', cuori: 'Cuori', quadri: 'Quadri', fiori: 'Fiori', totem: 'Totem' };

export const rankLabel = (r: Rank): string => FACES[r] ?? String(r);
export const suitName = (s: Suit): string => SUITS[s];

export function cardLabel(c: Card): string {
  if (c.kind === 'suited') return `${rankLabel(c.rank)} di ${suitName(c.suit)}`;
  if (c.kind === 'chipetl') return 'Chipetl';
  return c.god === 'rosso' ? 'Dio Rosso' : c.god === 'nero' ? 'Dio Nero' : 'Taotl';
}
