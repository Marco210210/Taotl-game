import { describe, expect, it } from 'vitest';
import { legalBids } from '../src/bidding';

/** Spezza `sum` in elementi ciascuno compreso in 0..n. */
function split(sum: number, n: number): number[] {
  const out: number[] = [];
  let left = sum;
  while (left > 0) {
    const v = Math.min(n, left);
    out.push(v);
    left -= v;
  }
  return out;
}
const range = (n: number) => Array.from({ length: n + 1 }, (_, i) => i);

describe('legalBids (§10.1)', () => {
  it.each([
    [6, 7, [0, 1, 2, 3, 4, 5, 6]],
    [7, 7, [1, 2, 3, 4, 5, 6, 7]],
    [7, 4, [0, 1, 2, 4, 5, 6, 7]],
    [1, 3, [0, 1]],
    [1, 0, [0]],
  ])('mazziere con N=%i e somma precedenti %i', (n, sum, expected) => {
    expect(legalBids(n, split(sum, n), true)).toEqual(expected);
  });

  it('un non-mazziere riceve sempre 0..n', () => {
    expect(legalBids(7, split(4, 7), false)).toEqual(range(7));
    expect(legalBids(1, [], false)).toEqual([0, 1]);
  });

  it('con previous che somma più di N il mazziere è libero', () => {
    expect(legalBids(3, [3, 3], true)).toEqual(range(3));
  });
});
