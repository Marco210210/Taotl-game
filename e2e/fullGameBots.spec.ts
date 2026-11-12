import { expect, test } from '@playwright/test';
import { createRoom, isVisible, newPlayer, playTurnViaUI, readSummary } from './helpers';

test('partita completa: 1 umano + 3 bot, classifica = somma dei punti mano', async ({ browser }) => {
  const a = await newPlayer(browser);
  const page = a.page;
  try {
    await createRoom(page, 'Anna');
    for (let i = 0; i < 3; i++) {
      await page.getByTestId('btn-add-bot').click();
      await expect(page.locator('[data-testid^="seat-"]')).toHaveCount(i + 2);
    }
    await page.getByTestId('btn-start').click();

    const sums = new Map<string, number>();
    let hands = 0;
    for (let i = 0; i < 6000 && !(await isVisible(page, 'final-ranking')); i++) {
      if (await isVisible(page, 'hand-summary')) {
        const rows = await readSummary(page);
        expect(rows).toHaveLength(4);
        for (const r of rows) sums.set(r.id, (sums.get(r.id) ?? 0) + r.points);
        hands++;
        await page.getByTestId('btn-next-hand').click({ timeout: 5000 });
        // attendi che il riepilogo si chiuda (nuova mano) o compaia la classifica
        await expect(async () => {
          const gone = !(await isVisible(page, 'hand-summary'));
          expect(gone || (await isVisible(page, 'final-ranking'))).toBe(true);
        }).toPass({ timeout: 10_000 });
        continue;
      }
      if ((await playTurnViaUI(page)) === 'none') await page.waitForTimeout(40);
    }
    await expect(page.getByTestId('final-ranking'), `stato dopo ${hands} mani`).toBeVisible();
    expect(hands).toBe(6);
    expect(sums.size).toBe(4);
    for (const [id, sum] of sums) {
      const total = await page.getByTestId(`ranking-row-${id}`).getByTestId('ranking-total').innerText();
      expect(Number(total.replace(/[−–]/g, '-')), `totale ${id}`).toBe(sum);
    }
  } finally {
    await a.context.close();
  }
});
