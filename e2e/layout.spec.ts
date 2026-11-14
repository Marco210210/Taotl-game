import { expect, test, type Page } from '@playwright/test';
import { CARD_CORNER, DESKTOP, PHONE, createRoom, newPlayer, playTurnViaUI } from './helpers';

const HAND = '[data-testid="hand"]';
const CARDS = `${HAND} [data-testid="card"]`;

const pageWidth = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth);
const pageHeight = (page: Page) => page.evaluate(() => document.documentElement.scrollHeight);

type Box = { x: number; y: number; width: number; height: number };
const overlaps = (a: Box, b: Box) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

async function boxes(page: Page, selector: string): Promise<Array<Box & { id: string }>> {
  return page.locator(selector).evaluateAll((els) =>
    els.map((e) => {
      const r = e.getBoundingClientRect();
      return { id: e.getAttribute('data-testid') ?? e.getAttribute('data-player') ?? '', x: r.x, y: r.y, width: r.width, height: r.height };
    }),
  );
}

async function startWithBots(page: Page, bots: number) {
  await createRoom(page, 'Anna');
  for (let i = 0; i < bots; i++) {
    await page.getByTestId('btn-add-bot').click();
    await expect(page.locator('[data-testid^="seat-"]')).toHaveCount(i + 2);
  }
  await page.getByTestId('btn-start').click();
  await expect(page.getByTestId('table')).toBeVisible();
}

/** Tutti i posti dentro lo schermo e senza sovrapposizioni. */
async function expectSeatsFit(page: Page, n: number, viewport: { width: number; height: number }) {
  const seats = await boxes(page, '[data-testid="table"] [data-testid^="seat-"]');
  expect(seats).toHaveLength(n);
  for (const s of seats) {
    expect(s.x, `${s.id} a sinistra`).toBeGreaterThanOrEqual(0);
    expect(s.y, `${s.id} in alto`).toBeGreaterThanOrEqual(0);
    expect(s.x + s.width, `${s.id} a destra`).toBeLessThanOrEqual(viewport.width);
    expect(s.y + s.height, `${s.id} in basso`).toBeLessThanOrEqual(viewport.height);
  }
  for (let i = 0; i < seats.length; i++)
    for (let j = i + 1; j < seats.length; j++) expect(overlaps(seats[i]!, seats[j]!), `${seats[i]!.id} / ${seats[j]!.id}`).toBe(false);
}

test('mano da 36 carte a 844x390: niente scroll della pagina, ultima carta raggiungibile e cliccabile', async ({ browser }) => {
  const a = await newPlayer(browser);
  const page = a.page;
  try {
    await startWithBots(page, 1);
    const cards = page.locator(CARDS);
    await expect(cards).toHaveCount(36);
    expect(await pageWidth(page)).toBeLessThanOrEqual(PHONE.width);
    expect(await pageHeight(page)).toBeLessThanOrEqual(PHONE.height);

    // dichiara e aspetta il proprio turno di gioco (niente pannello dichiarazioni)
    let myPlayTurn = false;
    for (let i = 0; i < 400 && !myPlayTurn; i++) {
      myPlayTurn = (await page.getByTestId('my-turn').isVisible()) && (await page.locator('[data-testid^="bid-"]').count()) === 0;
      if (!myPlayTurn && (await playTurnViaUI(page)) === 'none') await page.waitForTimeout(50);
    }
    expect(myPlayTurn, 'turno di gioco non raggiunto').toBe(true);
    expect(await pageWidth(page)).toBeLessThanOrEqual(PHONE.width);

    // ultima carta: dentro lo schermo (la mano entra tutta) e bersaglio corretto del tocco
    const last = cards.last();
    await last.scrollIntoViewIfNeeded();
    const lastId = await last.getAttribute('data-card-id');
    const hit = await page.evaluate(
      ({ hand, id, corner }) => {
        const card = document.querySelector(`${hand} [data-card-id="${id}"]`)!;
        const r = card.getBoundingClientRect();
        const el = document.elementFromPoint(r.left + corner.x, r.top + corner.y);
        return { right: r.right, hitId: el?.closest('[data-testid="card"]')?.getAttribute('data-card-id') ?? null };
      },
      { hand: HAND, id: lastId, corner: CARD_CORNER },
    );
    expect(hit.right).toBeLessThanOrEqual(PHONE.width);
    expect(hit.hitId).toBe(lastId);

    // ogni carta ha il suo indice d'angolo scoperto: il tocco lì colpisce proprio quella carta
    const hits = await page.evaluate(
      ({ sel, corner }) =>
        [...document.querySelectorAll(sel)].every((c) => {
          const r = c.getBoundingClientRect();
          return document.elementFromPoint(r.left + corner.x, r.top + corner.y)?.closest('[data-testid="card"]') === c;
        }),
      { sel: CARDS, corner: CARD_CORNER },
    );
    expect(hits).toBe(true);

    const target = (await last.getAttribute('aria-disabled')) === 'false' ? last : page.locator(`${CARDS}[aria-disabled="false"]`).last();
    await target.click({ timeout: 5000, position: CARD_CORNER });
    await expect(target).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('btn-play')).toBeVisible();
  } finally {
    await a.context.close();
  }
});

test('12 giocatori a 844x390: posti dentro lo schermo, senza sovrapposizioni, carte della presa separate', async ({ browser }) => {
  const a = await newPlayer(browser);
  const page = a.page;
  try {
    await startWithBots(page, 11);
    await expect(page.getByTestId('table')).toHaveAttribute('data-players', '12');
    await expectSeatsFit(page, 12, PHONE);
    expect(await pageWidth(page)).toBeLessThanOrEqual(PHONE.width);
    expect(await pageHeight(page)).toBeLessThanOrEqual(PHONE.height);
    await expect(page.locator(CARDS)).toHaveCount(6);

    // il mazziere ha il segnalino, chi deve agire è evidenziato
    await expect(page.locator('[data-testid="dealer-chip"]')).toHaveCount(1);
    await expect(page.locator('[data-testid^="seat-"][data-turn="true"]')).toHaveCount(1, { timeout: 15_000 });

    // si gioca finché sul tavolo ci sono almeno 6 carte: non devono sovrapporsi
    let checked = false;
    for (let i = 0; i < 600 && !checked; i++) {
      // posizione finale di ogni carta (non quella a metà dell'animazione): left/top in % del tavolo
      const slots = await page.locator('[data-testid="trick-slot"]').evaluateAll((els) =>
        els.map((e) => {
          const el = e as HTMLElement;
          const layer = el.parentElement!.getBoundingClientRect();
          const card = el.querySelector('.card') as HTMLElement;
          const w = card.offsetWidth;
          const h = card.offsetHeight;
          const cx = layer.left + (parseFloat(el.style.left) / 100) * layer.width;
          const cy = layer.top + (parseFloat(el.style.top) / 100) * layer.height;
          return { id: el.dataset.player ?? '', x: cx - w / 2, y: cy - h / 2, width: w, height: h };
        }),
      );
      if (slots.length >= 6) {
        for (let x = 0; x < slots.length; x++)
          for (let y = x + 1; y < slots.length; y++) expect(overlaps(slots[x]!, slots[y]!), `carte ${slots[x]!.id} / ${slots[y]!.id}`).toBe(false);
        checked = true;
      }
      if (!checked && (await playTurnViaUI(page)) === 'none') await page.waitForTimeout(20);
    }
    expect(checked, 'presa con 6+ carte non osservata').toBe(true);
    await expectSeatsFit(page, 12, PHONE);
  } finally {
    await a.context.close();
  }
});

test('desktop 1440x900 con 12 giocatori: posti dentro lo schermo e senza sovrapposizioni', async ({ browser }) => {
  const a = await newPlayer(browser, DESKTOP);
  try {
    await startWithBots(a.page, 11);
    await expectSeatsFit(a.page, 12, DESKTOP);
    expect(await pageWidth(a.page)).toBeLessThanOrEqual(DESKTOP.width);
  } finally {
    await a.context.close();
  }
});

test('in verticale compare "Ruota il telefono"; in orizzontale il tavolo torna com\'era', async ({ browser }) => {
  const a = await newPlayer(browser, { width: 390, height: 844 });
  const page = a.page;
  try {
    await page.goto('/');
    await expect(page.getByTestId('rotate-device')).toBeVisible();
    await expect(page.getByTestId('rotate-device')).toContainText('Ruota il telefono');
    await expect(page.getByTestId('btn-create')).toBeHidden();

    await page.setViewportSize(PHONE);
    await expect(page.getByTestId('rotate-device')).toBeHidden();
    await startWithBots(page, 3);
    const ids = () => page.locator(CARDS).evaluateAll((els) => els.map((e) => e.getAttribute('data-card-id')).sort());
    await expect(page.locator(CARDS)).toHaveCount(18);
    const before = await ids();

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByTestId('rotate-device')).toBeVisible();
    await expect(page.getByTestId('table')).toBeHidden();

    await page.setViewportSize(PHONE);
    await expect(page.getByTestId('rotate-device')).toBeHidden();
    await expect(page.getByTestId('table')).toBeVisible();
    expect(await ids()).toEqual(before);
  } finally {
    await a.context.close();
  }
});
