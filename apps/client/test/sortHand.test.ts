import { describe, expect, it } from 'vitest';
import { cardId, type Card } from '@taotl/engine';
import { sortHand } from '../src/lib/sortHand';

const s = (suit: 'picche' | 'cuori' | 'quadri' | 'fiori' | 'totem', rank: number): Card => ({ kind: 'suited', suit, rank: rank as 2 });

describe('sortHand', () => {
  it('ordina per gruppo e rango decrescente', () => {
    const hand: Card[] = [
      { kind: 'chipetl', n: 2 },
      s('quadri', 3),
      { kind: 'god', god: 'taotl' },
      s('cuori', 14),
      s('totem', 5),
      s('picche', 2),
      s('quadri', 12),
      s('fiori', 7),
      { kind: 'god', god: 'rosso' },
      s('totem', 11),
      s('picche', 9),
    ];
    expect(sortHand(hand).map(cardId)).toEqual([
      'totem-11', 'totem-5', 'picche-9', 'picche-2', 'cuori-14', 'fiori-7', 'quadri-12', 'quadri-3',
      'god-rosso', 'god-taotl', 'chipetl-2',
    ]);
  });
  it("non muta l'input", () => {
    const hand: Card[] = [s('quadri', 3), s('totem', 5)];
    sortHand(hand);
    expect(hand.map(cardId)).toEqual(['quadri-3', 'totem-5']);
  });
});
