import { expect, test } from '@playwright/test';
import { handScore } from '../packages/engine/src/scoring';
import { createRoom, isVisible, joinRoom, newPlayer, readSummary, runUntil } from './helpers';

test('mano 1 con 3 giocatori: 24 prese, punteggi coerenti', async ({ browser }) => {
  const a = await newPlayer(browser);
  const b = await newPlayer(browser);
  const c = await newPlayer(browser);
  try {
    const url = await createRoom(a.page, 'Anna');
    await joinRoom(b.page, url, 'Bruno');
    await joinRoom(c.page, url, 'Carla');
    await expect(a.page.getByTestId('btn-start')).toBeEnabled();
    await a.page.getByTestId('btn-start').click();

    const pages = [a.page, b.page, c.page];
    await runUntil(
      pages,
      async () => (await Promise.all(pages.map((p) => isVisible(p, 'hand-summary')))).every(Boolean),
      { label: 'hand-summary su 3 pagine' },
    );

    for (const p of pages) {
      const rows = await readSummary(p);
      expect(rows).toHaveLength(3);
      expect(rows.reduce((s, r) => s + r.made, 0)).toBe(24);
      for (const r of rows) expect(r.points, `riga ${r.id}`).toBe(handScore(1, r.bid, r.made));
    }
  } finally {
    await Promise.all([a, b, c].map((x) => x.context.close()));
  }
});
