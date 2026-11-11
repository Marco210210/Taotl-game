import type { Card, CardId, Rank, Suit } from './types';

const SUITS: readonly Suit[] = ['picche', 'cuori', 'quadri', 'fiori', 'totem'];
const GODS = ['rosso', 'nero', 'taotl'] as const;

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (let rank = 2; rank <= 14; rank++) {
      deck.push({ kind: 'suited', suit, rank: rank as Rank });
    }
  }
  for (const god of GODS) deck.push({ kind: 'god', god });
  for (const n of [1, 2, 3, 4] as const) deck.push({ kind: 'chipetl', n });
  return deck;
}

export function cardId(card: Card): CardId {
  switch (card.kind) {
    case 'suited':
      return `${card.suit}-${card.rank}`;
    case 'god':
      return `god-${card.god}`;
    case 'chipetl':
      return `chipetl-${card.n}`;
  }
}

const BY_ID: ReadonlyMap<CardId, Card> = new Map(createDeck().map((x) => [cardId(x), x]));

export function cardFromId(id: CardId): Card {
  const card = BY_ID.get(id);
  if (!card) throw new Error(`Id carta sconosciuto: ${id}`);
  return { ...card };
}

export function isTotem(card: Card): boolean {
  return card.kind === 'suited' && card.suit === 'totem';
}

export function isMagic(card: Card): boolean {
  return card.kind === 'god' || card.kind === 'chipetl';
}
