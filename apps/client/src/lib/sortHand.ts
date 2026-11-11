import type { Card } from '@taotl/engine';

const SUIT_ORDER = ['totem', 'picche', 'cuori', 'fiori', 'quadri'];
const GODS = ['rosso', 'nero', 'taotl'];

function group(c: Card): number {
  if (c.kind === 'suited') return SUIT_ORDER.indexOf(c.suit);
  return c.kind === 'god' ? SUIT_ORDER.length : SUIT_ORDER.length + 1;
}

/** Totem, Picche, Cuori, Fiori, Quadri, poi Dei, poi Chipetl; rango decrescente. */
export function sortHand(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => {
    const d = group(a) - group(b);
    if (d !== 0) return d;
    if (a.kind === 'suited' && b.kind === 'suited') return b.rank - a.rank;
    if (a.kind === 'god' && b.kind === 'god') return GODS.indexOf(a.god) - GODS.indexOf(b.god);
    if (a.kind === 'chipetl' && b.kind === 'chipetl') return a.n - b.n;
    return 0;
  });
}
