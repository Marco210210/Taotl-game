import { describe, expect, it } from 'vitest';
import { handScore, ranking } from '../src/scoring';
import { DEFAULT_RULES } from '../src/types';

describe('handScore (§10.2)', () => {
  it.each([
    [1, 0, 0, 10],
    [1, 3, 3, 25],
    [1, 0, 3, -15],
    [2, 2, 2, 40],
    [2, 1, 3, -20],
    [3, 2, 2, 60],
    [3, 4, 1, -45],
    [4, 1, 3, -40],
    [6, 1, 1, 90],
  ])('mano %i, D=%i, F=%i -> %i', (m, d, f, pts) => {
    expect(handScore(m, d, f)).toBe(pts);
  });

  it('con scoring non progressive lancia un errore', () => {
    expect(() => handScore(1, 0, 0, { ...DEFAULT_RULES, scoring: 'classic' })).toThrow();
  });
});

describe('ranking', () => {
  it('ordina per totale decrescente', () => {
    const r = ranking([
      { id: 'a', total: 10 },
      { id: 'b', total: 30 },
      { id: 'c', total: 20 },
    ]);
    expect(r.map((x) => [x.id, x.position, x.winner])).toEqual([
      ['b', 1, true],
      ['c', 2, false],
      ['a', 3, false],
    ]);
  });

  it('pari merito in testa: due vincitori, il successivo è in posizione 3', () => {
    const r = ranking([
      { id: 'a', total: 50 },
      { id: 'b', total: 70 },
      { id: 'c', total: 70 },
      { id: 'd', total: 10 },
    ]);
    expect(r.map((x) => [x.id, x.position, x.winner])).toEqual([
      ['b', 1, true],
      ['c', 1, true],
      ['a', 3, false],
      ['d', 4, false],
    ]);
  });
});
