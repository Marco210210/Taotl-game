import { describe, expect, it } from 'vitest';
import { cardId } from '../src/cards';
import { godPlayStatus, legalCards, strength, trickSuit, trickWinner } from '../src/trick';
import type { Suit } from '../src/types';
import { c, playedSeq } from './helpers';

describe('trickWinner (§10.3)', () => {
  it.each<[number, string[], number]>([
    [1, ['5♥', 'A♠', '2♥'], 0],
    [2, ['5♥', '3♦', 'K♥'], 2],
    [3, ['5♥', '2T', 'A♥'], 1],
    [4, ['5♥', '10T', 'DR!'], 2],
    [5, ['5♥', 'JT', 'DR!'], 1],
    [6, ['5♠', 'DR'], 0],
    [7, ['5♠', 'A♠', 'DN!'], 2],
    [8, ['3T', 'DN', 'DR'], 0],
    [9, ['3T', 'AT', 'TAO!'], 2],
    [10, ['TAO', '2♣', '3♣'], 2],
    [11, ['CH1', 'DR', '5♥', '2♥'], 2],
    [12, ['CH1', '4T'], 1],
    [13, ['TAO', 'CH1', 'DN'], 0],
    [14, ['CH1', 'CH2', 'TAO'], 0],
    [15, ['5♥', 'TAO~', '6♥'], 2],
  ])('#%i %j -> %i', (_n, seq, expected) => {
    expect(trickWinner(playedSeq(seq))).toBe(expected);
  });

  it.each<[number, string[], number]>([
    [6, ['5♠', 'DR'], 1],
    [8, ['3T', 'DN', 'DR'], 1],
    [10, ['TAO', '2♣', '3♣'], 0],
    [11, ['CH1', 'DR', '5♥', '2♥'], 1],
    [13, ['TAO', 'CH1', 'DN'], 0],
    [14, ['CH1', 'CH2', 'TAO'], 2],
  ])('#%i: il Dio è nullo (%j, indice %i)', (_n, seq, godIdx) => {
    const p = playedSeq(seq)[godIdx]!;
    expect(p.valid).toBe(false);
    expect(p.label).toBe('Nullo');
  });

  it('#13: anche il Dio Nero è nullo', () => {
    const p = playedSeq(['TAO', 'CH1', 'DN'])[2]!;
    expect(p.valid).toBe(false);
    expect(p.label).toBe('Nullo');
  });

  it('#12: colore Totem dopo un Chipetl', () => {
    expect(trickSuit(playedSeq(['CH1', '4T']))).toBe('totem');
    expect(trickSuit(playedSeq(['CH1']))).toBeNull();
    const hand = [c('7T'), c('A♥'), c('CH2')];
    expect(legalCards(hand, 'totem').map(cardId).sort()).toEqual(['chipetl-2', 'totem-7']);
  });

  it('presa vuota: trickSuit null, trickWinner lancia', () => {
    expect(trickSuit([])).toBeNull();
    expect(() => trickWinner([])).toThrow();
  });
});

describe('legalCards (§10.4)', () => {
  const ids = (cards: ReturnType<typeof legalCards>) => cards.map(cardId).sort();
  it.each<[string, string[], Suit | null, string[]]>([
    ['Totem con Totem in mano', ['7T', 'A♥', 'CH1'], 'totem', ['7T', 'CH1']],
    ['Totem con Dio Rosso', ['7T', 'DR', 'K♠'], 'totem', ['7T', 'DR']],
    ['Totem senza Totem', ['A♥', 'CH1', 'DN'], 'totem', ['A♥', 'CH1', 'DN']],
    ['Cuori', ['A♠', '3T', '2♥'], 'cuori', ['A♠', '3T', '2♥']],
    ['Non stabilito', ['A♠', '3T', '2♥'], null, ['A♠', '3T', '2♥']],
  ])('%s', (_name, hand, suit, expected) => {
    const h = hand.map(c);
    expect(ids(legalCards(h, suit))).toEqual(ids(expected.map(c)));
  });
});

describe('godPlayStatus (§5.3)', () => {
  const table: Record<string, Record<string, 'null' | 'choice'>> = {
    rosso: { none: 'null', picche: 'null', cuori: 'choice', quadri: 'choice', fiori: 'null', totem: 'null' },
    nero: { none: 'null', picche: 'choice', cuori: 'null', quadri: 'null', fiori: 'choice', totem: 'null' },
    taotl: { none: 'null', picche: 'choice', cuori: 'choice', quadri: 'choice', fiori: 'choice', totem: 'choice' },
  };
  for (const god of ['rosso', 'nero', 'taotl'] as const) {
    for (const [key, expected] of Object.entries(table[god]!)) {
      it(`${god} con colore ${key} -> ${expected}`, () => {
        expect(godPlayStatus(god, key === 'none' ? null : (key as Suit))).toBe(expected);
      });
    }
  }
});

describe('strength (§5.5)', () => {
  it('valori della funzione di forza', () => {
    const p = (s: string) => playedSeq([s])[0]!;
    expect(strength(p('AT'), 'cuori')).toBe(614);
    expect(strength(p('10T'), 'cuori')).toBe(310);
    expect(strength(p('5♥'), 'cuori')).toBe(105);
    expect(strength(p('5♠'), 'cuori')).toBe(0);
    expect(strength(p('CH1'), 'cuori')).toBe(0);
    const seq = playedSeq(['5♥', 'DR!', 'TAO!']);
    expect(strength(seq[1]!, 'cuori')).toBe(500);
    expect(strength(seq[2]!, 'cuori')).toBe(1000);
  });
});

describe('playedSeq', () => {
  it('lancia se un Dio con scelta non ha suffisso', () => {
    expect(() => playedSeq(['5♥', 'DR'])).toThrow();
  });
  it("lancia se un Dio nullo d'ufficio ha suffisso", () => {
    expect(() => playedSeq(['5♠', 'DR!'])).toThrow();
  });
  it('Dio dichiarato Chipetl: valid false, label Chipetl', () => {
    const p = playedSeq(['5♥', 'TAO~'])[1]!;
    expect(p).toMatchObject({ valid: false, label: 'Chipetl', playerId: 'p1' });
  });
});
