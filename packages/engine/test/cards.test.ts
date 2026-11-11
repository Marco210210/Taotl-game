import { describe, expect, it } from 'vitest';
import { cardFromId, cardId, createDeck, isMagic, isTotem } from '../src/cards';
import { c } from './helpers';

describe('createDeck', () => {
  const deck = createDeck();
  it('ha 72 carte con id unici', () => {
    expect(deck).toHaveLength(72);
    expect(new Set(deck.map(cardId)).size).toBe(72);
  });
  it('ha 13 carte per ciascuno dei 5 semi', () => {
    for (const suit of ['picche', 'cuori', 'quadri', 'fiori', 'totem']) {
      expect(deck.filter((x) => x.kind === 'suited' && x.suit === suit)).toHaveLength(13);
    }
  });
  it('ha 3 Dei e 4 Chipetl', () => {
    expect(deck.filter((x) => x.kind === 'god')).toHaveLength(3);
    expect(deck.filter((x) => x.kind === 'chipetl')).toHaveLength(4);
  });
});

describe('cardId / cardFromId', () => {
  it('round-trip su tutto il mazzo', () => {
    for (const x of createDeck()) expect(cardFromId(cardId(x))).toEqual(x);
  });
  it('usa il formato documentato', () => {
    expect(cardId(c('AT'))).toBe('totem-14');
    expect(cardId(c('JT'))).toBe('totem-11');
    expect(cardId(c('A♥'))).toBe('cuori-14');
    expect(cardId(c('TAO'))).toBe('god-taotl');
    expect(cardId(c('CH3'))).toBe('chipetl-3');
  });
  it('lancia su id ignoto', () => {
    for (const bad of ['', 'foo', 'cuori-15', 'cuori-1', 'god-verde', 'chipetl-5', 'cuori-7-x']) {
      expect(() => cardFromId(bad)).toThrow();
    }
  });
});

describe('c()', () => {
  it('AT equivale a Asso di Totem', () => {
    expect(c('AT')).toEqual({ kind: 'suited', suit: 'totem', rank: 14 });
  });
  it('legge 10 e colori normali', () => {
    expect(c('10♣')).toEqual({ kind: 'suited', suit: 'fiori', rank: 10 });
    expect(c('10T')).toEqual({ kind: 'suited', suit: 'totem', rank: 10 });
    expect(c('2♠')).toEqual({ kind: 'suited', suit: 'picche', rank: 2 });
  });
  it('lancia su notazione ignota', () => {
    expect(() => c('1♥')).toThrow();
    expect(() => c('5X')).toThrow();
    expect(() => c('')).toThrow();
  });
});

describe('isTotem / isMagic', () => {
  it('classifica le carte', () => {
    expect(isTotem(c('7T'))).toBe(true);
    expect(isTotem(c('7♥'))).toBe(false);
    expect(isTotem(c('DR'))).toBe(false);
    expect(isMagic(c('DR'))).toBe(true);
    expect(isMagic(c('CH2'))).toBe(true);
    expect(isMagic(c('7T'))).toBe(false);
  });
});
