import { describe, expect, it } from 'vitest';
import { chooseBid, estimateTricks } from '../src/bot/estimate';
import { legalBids } from '../src/bidding';
import { c } from './helpers';

const hand = (...s: string[]) => s.map(c);

describe('estimateTricks', () => {
  it('{TAO, AT, KT} con n=3 stima 3', () => {
    const e = estimateTricks(hand('TAO', 'AT', 'KT'), 3, 4);
    expect(Math.round(e)).toBe(3);
    expect(e).toBeCloseTo(2.7, 5);
  });

  it('una mano senza carte forti con n=3 stima 0', () => {
    expect(Math.round(estimateTricks(hand('2♣', '3♦', '4♠'), 3, 4))).toBe(0);
  });

  it('una mano da 18 carte ricca di Totem alti stima più di una povera', () => {
    const rich = hand('TAO', 'AT', 'KT', 'QT', 'JT', 'DR', 'DN', 'A♠', 'A♥', '5T', '6T', '2♠', '3♠', '4♠', '5♠', '6♠', '2♥', '3♥');
    const poor = hand('2♠', '3♠', '4♠', '5♠', '6♠', '7♠', '2♥', '3♥', '4♥', '5♥', '6♥', '2♦', '3♦', '4♦', '5♦', '2♣', '3♣', '4♣');
    expect(rich).toHaveLength(18);
    expect(poor).toHaveLength(18);
    expect(estimateTricks(rich, 18, 4)).toBeGreaterThan(estimateTricks(poor, 18, 4));
  });

  it('i Totem bassi pesano 1.5x con almeno 2 colori normali corti (anche vuoti)', () => {
    const long = hand('5T', '2♠', '3♠', '2♥', '3♥', '2♦', '3♦', '2♣', '3♣');
    const short = hand('5T', '2♠', '2♥', '3♥', '3♦', '3♣');
    expect(estimateTricks(long, 9, 4)).toBeCloseTo(0.35, 5);
    expect(estimateTricks(short, 6, 4)).toBeCloseTo(0.35 * 1.5, 5);
  });

  it('Dei e Assi pesano meno nelle mani piccole, K normali ancora meno', () => {
    expect(estimateTricks(hand('DR', 'A♠'), 4, 4)).toBeCloseTo(2 * 0.6 * 0.5, 5);
    expect(estimateTricks(hand('K♠', '2♠', '2♥', '2♦'), 5, 4)).toBeCloseTo(0.3 * 0.5, 5);
  });

  it('il risultato è limitato a [0, n]', () => {
    expect(estimateTricks(hand('TAO', 'AT', 'KT'), 2, 4)).toBe(2);
    expect(estimateTricks([], 0, 4)).toBe(0);
  });
});

describe('chooseBid', () => {
  const legalAll = [0, 1, 2, 3];
  it('arrotonda la stima', () => {
    expect(chooseBid(hand('TAO', 'AT', 'KT'), 3, 4, legalAll)).toBe(3);
    expect(chooseBid(hand('2♣', '3♦', '4♠'), 3, 4, legalAll)).toBe(0);
  });

  it('mazziere: se il valore arrotondato è vietato sceglie il più vicino lecito', () => {
    const legal = legalBids(3, [0, 0, 0], true); // vietato 3
    expect(legal).toEqual([0, 1, 2]);
    expect(chooseBid(hand('TAO', 'AT', 'KT'), 3, 4, legal)).toBe(2);
  });

  it('a parità di distanza sceglie il più basso', () => {
    // stima 1 (TAO 0.9) con 1 vietato: 0 e 2 sono equidistanti
    expect(chooseBid(hand('TAO', '2♣', '3♦'), 3, 4, [0, 2, 3])).toBe(0);
  });

  it('lancia se non ci sono dichiarazioni lecite', () => {
    expect(() => chooseBid(hand('TAO'), 1, 4, [])).toThrow();
  });
});
