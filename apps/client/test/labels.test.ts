import { describe, expect, it } from 'vitest';
import { cardLabel, rankLabel, suitName } from '../src/lib/labels';
import { errorMessage } from '../src/lib/errors';

describe('labels', () => {
  it('rankLabel', () => {
    expect([2, 10, 11, 12, 13, 14].map((r) => rankLabel(r as never))).toEqual(['2', '10', 'J', 'Q', 'K', 'A']);
  });
  it('suitName', () => {
    expect(['picche', 'cuori', 'quadri', 'fiori', 'totem'].map((s) => suitName(s as never))).toEqual([
      'Picche',
      'Cuori',
      'Quadri',
      'Fiori',
      'Totem',
    ]);
  });
  it('cardLabel', () => {
    expect(cardLabel({ kind: 'suited', suit: 'cuori', rank: 14 })).toBe('A di Cuori');
    expect(cardLabel({ kind: 'suited', suit: 'totem', rank: 11 })).toBe('J di Totem');
    expect(cardLabel({ kind: 'suited', suit: 'picche', rank: 10 })).toBe('10 di Picche');
    expect(cardLabel({ kind: 'god', god: 'rosso' })).toBe('Dio Rosso');
    expect(cardLabel({ kind: 'god', god: 'nero' })).toBe('Dio Nero');
    expect(cardLabel({ kind: 'god', god: 'taotl' })).toBe('Taotl');
    expect(cardLabel({ kind: 'chipetl', n: 2 })).toBe('Chipetl');
  });
  it('errorMessage', () => {
    expect(errorMessage('room-not-found')).toBe('Stanza non trovata');
    expect(errorMessage('boh')).toBe('Errore imprevisto');
  });
});
