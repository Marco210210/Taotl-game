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
    await expect(b.page.getByTestId('btn-copy-link')).toHaveCount(0);
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

test("app in background (es. WhatsApp): al ritorno riconnessione immediata, senza schermate d'errore né d'ingresso", async ({ browser }) => {
  const a = await newPlayer(browser);
  const page = a.page;
  const setVisibility = (state: 'hidden' | 'visible') =>
    page.evaluate((s) => {
      Object.defineProperty(document, 'visibilityState', { value: s, configurable: true });
      Object.defineProperty(document, 'hidden', { value: s === 'hidden', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    }, state);
  try {
    await createRoom(page, 'Anna');
    await page.getByTestId('btn-add-bot').click();
    await page.getByTestId('btn-start').click();
    await expect(page.locator(HAND_CARDS)).toHaveCount(36);
    const idsOf = () => page.locator(HAND_CARDS).evaluateAll((els) => els.map((e) => e.getAttribute('data-card-id')).sort());
    const before = await idsOf();

    // la pagina va in background e la rete cade: la connessione si chiude
    await setVisibility('hidden');
    await a.context.setOffline(true);
    await expect(page.getByTestId('reconnecting')).toBeVisible({ timeout: 60_000 });
    await page.waitForTimeout(1500); // abbastanza perché socket.io entri nell'attesa crescente tra i tentativi

    // si torna nell'app: rete di nuovo su e pagina visibile → riconnessione subito
    await a.context.setOffline(false);
    const t0 = Date.now();
    await setVisibility('visible');
    await expect(page.getByTestId('reconnecting')).toBeHidden({ timeout: 4000 });
    expect(Date.now() - t0, 'riconnessione immediata').toBeLessThan(4000);

    // stesso posto, stessa mano, niente ingresso né errori
    await expect(page.getByTestId('table')).toBeVisible();
    await expect(page.getByTestId('input-nickname')).toHaveCount(0);
    await expect(page.getByRole('alert')).toHaveCount(0);
    await expect(page.locator('[data-testid^="seat-"][data-me="true"]')).toHaveAttribute('data-connected', 'true');
    expect(await idsOf()).toEqual(before);
    // e la partita prosegue
    await runUntil([page], async () => (await page.locator(HAND_CARDS).count()) < 36, { label: 'si gioca dopo il ritorno' });
  } finally {
    await a.context.close();
  }
});

test("app chiusa e riaperta dalla schermata Home (parte da /): torna dritta alla partita, finché non finisce", async ({ browser }) => {
  const a = await newPlayer(browser);
  const b = await newPlayer(browser);
  try {
    const url = await createRoom(a.page, 'Anna');
    await joinRoom(b.page, url, 'Bruno');
    await a.page.getByTestId('btn-start').click();
    await expect(b.page.locator(HAND_CARDS).first()).toBeVisible();
    const before = await b.page.locator(HAND_CARDS).evaluateAll((els) => els.map((e) => e.getAttribute('data-card-id')).sort());

    // B chiude l'app: gli altri vedono "In attesa di Bruno"
    await b.page.close();
    // (la pausa compare quando tocca a lui: A gioca finché non succede)
    await runUntil([a.page], () => isVisible(a.page, 'pause-dialog'), { label: 'pausa per Bruno' });
    await expect(a.page.getByTestId('pause-dialog')).toContainText('In attesa di Bruno');

    // B riapre l'app: si parte da "/" come dall'icona, e si torna subito al tavolo con la stessa mano
    const again = await b.context.newPage();
    await again.goto('/');
    await expect(again).toHaveURL(url);
    await expect(again.getByTestId('table')).toBeVisible();
    await expect(again.getByTestId('input-nickname')).toHaveCount(0);
    expect(await again.locator(HAND_CARDS).evaluateAll((els) => els.map((e) => e.getAttribute('data-card-id')).sort())).toEqual(before);
    await expect(a.page.getByTestId('pause-dialog')).toHaveCount(0);

    // dentro l'app "Torna alla home" resta possibile: la home non rimanda indietro se non all'avvio
    await again.evaluate(() => {
      history.pushState(null, '', '/');
      dispatchEvent(new PopStateEvent('popstate'));
    });
    await expect(again.getByTestId('input-nickname')).toBeVisible();
  } finally {
    await Promise.all([a, b].map((x) => x.context.close()));
  }
});

test('stanza sparita mentre l\'app era chiusa: riaprendo si resta nella home, senza errori', async ({ browser }) => {
  const a = await newPlayer(browser);
  try {
    await a.page.goto('/');
    await a.page.evaluate(() => {
      localStorage.setItem('taotl:token:ZZZZ', 'vecchio-token');
      localStorage.setItem('taotl:current-room', 'ZZZZ');
    });
    await a.page.goto('/');
    await expect(a.page.getByTestId('input-nickname')).toBeVisible();
    await expect(a.page).toHaveURL(/\/$/);
    await expect(a.page.getByRole('alert')).toHaveCount(0);
    // e la volta dopo non ci riprova
    expect(await a.page.evaluate(() => localStorage.getItem('taotl:current-room'))).toBeNull();
  } finally {
    await a.context.close();
  }
});
