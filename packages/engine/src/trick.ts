import type { Card, PlayedCard, Suit } from './types';

/** Colore della presa: seme della prima carta di colore giocata (§5.2). */
export function trickSuit(played: PlayedCard[]): Suit | null {
  for (const p of played) {
    if (p.card.kind === 'suited') return p.card.suit;
  }
  return null;
}

/** Stato di un Dio al momento della giocata (§5.3). */
export function godPlayStatus(
  god: 'rosso' | 'nero' | 'taotl',
  suit: Suit | null,
): 'null' | 'choice' {
  if (suit === null) return 'null';
  if (god === 'taotl') return 'choice';
  if (suit === 'cuori' || suit === 'quadri') return god === 'rosso' ? 'choice' : 'null';
  if (suit === 'picche' || suit === 'fiori') return god === 'nero' ? 'choice' : 'null';
  return 'null';
}

/** Carte giocabili (§5.4). */
export function legalCards(hand: Card[], suit: Suit | null): Card[] {
  if (suit !== 'totem') return hand;
  const hasTotem = hand.some((x) => x.kind === 'suited' && x.suit === 'totem');
  if (!hasTotem) return hand;
  return hand.filter((x) => x.kind !== 'suited' || x.suit === 'totem');
}

/** Forza di una carta giocata (§5.5): più alto = più forte, 0 = non vincente. */
export function strength(p: PlayedCard, suit: Suit): number {
  const card = p.card;
  if (card.kind === 'god') {
    if (!p.valid) return 0;
    if (card.god === 'taotl') return 1000;
    return 500;
  }
  if (card.kind === 'chipetl') return 0;
  if (card.suit === 'totem') return card.rank >= 11 ? 600 + card.rank : 300 + card.rank;
  if (card.suit === suit) return 100 + card.rank;
  return 0;
}

/** Indice del vincitore; senza carte di colore vince la prima carta (caso B). */
export function trickWinner(played: PlayedCard[]): number {
  if (played.length === 0) throw new Error('Presa vuota');
  const suit = trickSuit(played);
  if (suit === null) return 0;
  let best = 0;
  let bestStrength = -1;
  played.forEach((p, i) => {
    const s = strength(p, suit);
    if (s > bestStrength) {
      best = i;
      bestStrength = s;
    }
  });
  return best;
}
