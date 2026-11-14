import { describe, expect, it } from 'vitest';
import { seatAngles, separateSpots, tableLayout } from '../src/lib/seatLayout';

describe('seatLayout', () => {
  it('io sempre in basso al centro, gli altri in ordine dei posti in senso orario', () => {
    const { seat } = tableLayout(['a', 'b', 'c', 'd'], 'c');
    expect(seat.get('c')!.x).toBeCloseTo(50);
    expect(seat.get('c')!.y).toBeGreaterThan(95);
    // dopo di me (d) a sinistra, poi a (in alto), poi b a destra
    expect(seat.get('d')!.x).toBeLessThan(10);
    expect(seat.get('a')!.y).toBeLessThan(5);
    expect(seat.get('b')!.x).toBeGreaterThan(90);
  });
  it('da 2 a 12 giocatori: angoli crescenti, distinti, lontani da me', () => {
    for (let n = 2; n <= 12; n += 1) {
      const a = seatAngles(n, 3);
      expect(a).toHaveLength(n);
      for (let i = 1; i < n; i += 1) {
        expect(a[i]!).toBeGreaterThan(a[i - 1]!);
        expect(a[i]!).toBeGreaterThan(30);
        expect(a[i]!).toBeLessThan(330);
      }
    }
  });
  it('le carte della presa non si sovrappongono con 12 giocatori su 844x390', () => {
    const ids = Array.from({ length: 12 }, (_, i) => `p${i}`);
    const box = { w: 734, h: 231, cardW: 41, cardH: 63, plaqueH: 43 };
    const { spot } = tableLayout(ids, 'p0', box.w / box.h, box);
    const px = [...spot.values()].map((p) => ({ x: (p.x / 100) * box.w, y: (p.y / 100) * box.h }));
    for (let i = 0; i < px.length; i += 1)
      for (let j = i + 1; j < px.length; j += 1) {
        const overlap = Math.abs(px[i]!.x - px[j]!.x) < box.cardW && Math.abs(px[i]!.y - px[j]!.y) < box.cardH;
        expect(overlap, `carte ${i} e ${j}`).toBe(false);
      }
    expect(separateSpots([], box)).toEqual([]);
  });
});
