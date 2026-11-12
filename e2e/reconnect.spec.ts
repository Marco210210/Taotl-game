import { expect, test } from '@playwright/test';
import { createRoom, isVisible, joinRoom, newPlayer, runUntil } from './helpers';

const HAND_CARDS = '[data-testid="hand"] [data-testid="card"]';

test('riconnessione: B ricarica la pagina, rientra nello stesso posto con la stessa mano', async ({ browser }) => {
  const a = await newPlayer(browser);
  const b = await newPlayer(browser);
  try {
    const url = await createRoom(a.page, 'Anna');
    await joinRoom(b.page, url, 'Bruno');
    await a.page.getByTestId('btn-start').click();

    // 2 giocatori, mano 1: 36 carte. Si gioca finché B ne ha giocate almeno 3.
    await runUntil(
      [a.page, b.page],
      async () => (await b.page.locator(HAND_CARDS).count()) > 0 && (await b.page.locator(HAND_CARDS).count()) <= 33,
      { label: 'B ha giocato qualche presa' },
    );
    // si smette di pilotare e si lascia assestare il server (nessun timer di turno: lo stato resta fermo)
    await b.page.waitForTimeout(500);
    const idsOf = async () => b.page.locator(HAND_CARDS).evaluateAll((els) => els.map((e) => e.getAttribute('data-card-id')).sort());
    const before = await idsOf();
    expect(before.length).toBeGreaterThan(0);

    await b.page.reload();
    await expect(b.page.locator(HAND_CARDS).first()).toBeVisible({ timeout: 15_000 });
    await expect(b.page.getByText('Bruno').first()).toBeVisible();
    await expect(b.page.getByTestId('invite-link')).toHaveCount(0);
    expect(await idsOf()).toEqual(before);

    // la partita prosegue fino al riepilogo su entrambe le pagine
    const pages = [a.page, b.page];
    await runUntil(
      pages,
      async () => (await Promise.all(pages.map((p) => isVisible(p, 'hand-summary')))).every(Boolean),
      { label: 'hand-summary dopo la riconnessione' },
    );
  } finally {
    await Promise.all([a, b].map((x) => x.context.close()));
  }
});
