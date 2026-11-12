import { expect, test, type Page } from '@playwright/test';
import { createRoom, newPlayer, playTurnViaUI } from './helpers';

const HAND = '[data-testid="hand"]';
const CARDS = `${HAND} [data-testid="card"]`;

const pageWidth = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth);

test('mano da 36 carte su 360px: niente scroll orizzontale, ultima carta raggiungibile e cliccabile', async ({ browser }) => {
  const a = await newPlayer(browser);
  const page = a.page;
  try {
    await createRoom(page, 'Anna');
    await page.getByTestId('btn-add-bot').click();
    await page.getByTestId('btn-start').click();

    const cards = page.locator(CARDS);
    await expect(cards).toHaveCount(36);
    expect(await pageWidth(page)).toBeLessThanOrEqual(360);

    // durante la dichiarazione (pannello visibile)
    await expect(page.locator('[data-testid^="bid-"]').first()).toBeVisible({ timeout: 15_000 });
    expect(await pageWidth(page)).toBeLessThanOrEqual(360);

    // dichiara e aspetta il proprio turno di gioco (niente pannello dichiarazioni)
    let myPlayTurn = false;
    for (let i = 0; i < 400 && !myPlayTurn; i++) {
      myPlayTurn =
        (await page.getByTestId('my-turn').isVisible()) && (await page.locator('[data-testid^="bid-"]').count()) === 0;
      if (!myPlayTurn && (await playTurnViaUI(page)) === 'none') await page.waitForTimeout(50);
    }
    expect(myPlayTurn, 'turno di gioco non raggiunto').toBe(true);
    await expect(cards).toHaveCount(36);
    expect(await pageWidth(page)).toBeLessThanOrEqual(360);

    // ultima carta: raggiungibile con lo scroll del contenitore e bersaglio corretto del tocco
    const last = cards.last();
    await last.scrollIntoViewIfNeeded();
    const lastId = await last.getAttribute('data-card-id');
    const hit = await page.evaluate(
      ({ hand, id }) => {
        const container = document.querySelector(hand)!.getBoundingClientRect();
        const card = document.querySelector(`${hand} [data-card-id="${id}"]`)!;
        const r = card.getBoundingClientRect();
        const left = Math.max(r.left, container.left);
        const right = Math.min(r.right, container.right);
        const top = Math.max(r.top, container.top);
        const bottom = Math.min(r.bottom, container.bottom);
        const el = document.elementFromPoint((left + right) / 2, (top + bottom) / 2);
        return {
          visibleWidth: right - left,
          visibleHeight: bottom - top,
          hitId: el?.closest('[data-testid="card"]')?.getAttribute('data-card-id') ?? null,
        };
      },
      { hand: HAND, id: lastId },
    );
    expect(hit.visibleWidth).toBeGreaterThan(10);
    expect(hit.visibleHeight).toBeGreaterThan(10);
    expect(hit.hitId).toBe(lastId);

    // click: l'ultima carta se giocabile, altrimenti l'ultima giocabile dopo lo scroll
    const target = (await last.getAttribute('aria-disabled')) === 'false'
      ? last
      : page.locator(`${CARDS}[aria-disabled="false"]`).last();
    await target.scrollIntoViewIfNeeded();
    await target.click({ timeout: 5000 });
    await expect(target).toHaveAttribute('aria-pressed', 'true');
    expect(await pageWidth(page)).toBeLessThanOrEqual(360);
  } finally {
    await a.context.close();
  }
});
