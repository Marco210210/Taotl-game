import { describe, expect, it } from 'vitest';
import { cardId, createDeck } from '../src/cards';
import { cardsPerHand, deal } from '../src/deal';
import { mulberry32, shuffle } from '../src/rng';

const TABLE: Record<number, number[]> = {
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
const rows = Object.entries(TABLE).flatMap(([p, hands]) =>
  hands.map((n, i) => [Number(p), i + 1, n] as const),
);

describe('cardsPerHand', () => {
  it.each(rows)('%i giocatori, mano %i -> %i carte', (p, h, n) => {
    expect(cardsPerHand(p, h as 1 | 2 | 3 | 4 | 5 | 6)).toBe(n);
  });
  it('lancia fuori range', () => {
    expect(() => cardsPerHand(1, 1)).toThrow();
    expect(() => cardsPerHand(13, 1)).toThrow();
    expect(() => cardsPerHand(4, 0 as never)).toThrow();
    expect(() => cardsPerHand(4, 7 as never)).toThrow();
  });
});

describe('deal', () => {
  it('2 giocatori, N=36: nessun avanzo', () => {
    const { hands, leftover } = deal(createDeck(), 2, 36);
    expect(hands.map((h) => h.length)).toEqual([36, 36]);
    expect(leftover).toHaveLength(0);
  });
  it('5 giocatori, N=14: 2 avanzate', () => {
    const { hands, leftover } = deal(createDeck(), 5, 14);
    expect(hands.map((h) => h.length)).toEqual([14, 14, 14, 14, 14]);
    expect(leftover).toHaveLength(2);
  });
  it('nessun duplicato e unione = mazzo', () => {
    const deck = shuffle(createDeck(), mulberry32(7));
    const { hands, leftover } = deal(deck, 5, 14);
    const ids = [...hands.flat(), ...leftover].map(cardId);
    expect(new Set(ids).size).toBe(72);
    expect([...ids].sort()).toEqual(createDeck().map(cardId).sort());
  });
  it('lancia se servono più di 72 carte', () => {
    expect(() => deal(createDeck(), 3, 25)).toThrow();
  });
});

describe('shuffle', () => {
  const input = createDeck();
  it('stesso seed, stesso risultato', () => {
    expect(shuffle(input, mulberry32(1))).toEqual(shuffle(input, mulberry32(1)));
  });
  it('seed diversi, risultati diversi', () => {
    expect(shuffle(input, mulberry32(1))).not.toEqual(shuffle(input, mulberry32(2)));
  });
  it('non modifica l input e conserva le carte', () => {
    const before = input.map(cardId);
    const out = shuffle(input, mulberry32(3));
    expect(input.map(cardId)).toEqual(before);
    expect(out.map(cardId).sort()).toEqual([...before].sort());
  });
});
