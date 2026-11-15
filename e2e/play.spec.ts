import { expect, test, type Page } from '@playwright/test';
import { CARD_CORNER, createRoom, isVisible, joinRoom, newPlayer, playTurnViaUI, readSummary, type SummaryRow } from './helpers';

const CARDS = '[data-testid="hand"] [data-testid="card"]';

async function startWithBots(page: Page, bots: number) {
  await createRoom(page, 'Anna');
  for (let i = 0; i < bots; i++) {
    await page.getByTestId('btn-add-bot').click();
    await expect(page.locator('[data-testid^="seat-"]')).toHaveCount(i + 2);
  }
  await page.getByTestId('btn-start').click();
  await expect(page.getByTestId('table')).toBeVisible();
}

/** Gioca una carta dalla UI, riprovando se un ri-render fa mancare il tocco. */
async function playNow(page: Page) {
  for (let i = 0; i < 40; i++) {
    if ((await playTurnViaUI(page)) === 'play') return;
    await page.waitForTimeout(50);
  }
  const st = await page.evaluate(() => ({
    text: document.body.innerText.replace(/\s+/g, ' ').slice(0, 400),
    cards: [...document.querySelectorAll('[data-testid="hand"] [data-testid="card"]')].map((e) => e.getAttribute('aria-disabled') + (e.getAttribute('aria-pressed') === 'true' ? '*' : '')).join(' '),
  }));
  throw new Error('carta non giocata: ' + JSON.stringify(st));
}

// letto in un colpo solo nella pagina: due letture separate possono stare a cavallo di una dichiarazione
const myPlayTurn = (page: Page) =>
  page.evaluate(() => !!document.querySelector('[data-testid="my-turn"]') && !document.querySelector('[data-testid^="bid-"]') && !!document.querySelector('[data-testid="hand"][data-my-turn="true"]'));

test('preselezione: solo dopo la carta del primo di mano, solo carte lecite, al mio turno parte da sola', async ({ browser }) => {
  const players = [await newPlayer(browser), await newPlayer(browser), await newPlayer(browser)];
  const pages = players.map((p) => p.page);
  try {
    const url = await createRoom(pages[0]!, 'Anna');
    await joinRoom(pages[1]!, url, 'Bea');
    await joinRoom(pages[2]!, url, 'Ciro');
    await expect(pages[0]!.locator('[data-testid^="seat-"]')).toHaveCount(3);
    await pages[0]!.getByTestId('btn-start').click();
    for (const p of pages) await expect(p.getByTestId('table')).toBeVisible();

    // solo dichiarazioni (nessuna carta giocata), finché qualcuno deve aprire la prima presa
    let leader: Page | undefined;
    for (let i = 0; i < 400 && !leader; i++) {
      for (const p of pages) {
        const bid = p.locator('[data-testid^="bid-"]').first();
        if (await bid.isVisible()) await bid.click({ timeout: 1500 }).catch(() => {});
      }
      for (const p of pages) if (await myPlayTurn(p)) leader = p;
      if (!leader) await pages[0]!.waitForTimeout(40);
    }
    expect(leader, 'primo di mano non trovato').toBeTruthy();
    const others = pages.filter((p) => p !== leader);

    // prima che il primo di mano giochi: nessuna preselezione, nessuna carta oscurata
    for (const p of others) {
      await p.locator(CARDS).first().click({ position: CARD_CORNER });
      await expect(p.locator(`${CARDS}[aria-pressed="true"]`)).toHaveCount(0);
      await expect(p.locator(`${CARDS}.dimmed`)).toHaveCount(0);
    }

    // il primo di mano gioca; il secondo è di turno, il terzo può preselezionare
    await playNow(leader!);
    let second: Page | undefined;
    await expect.poll(async () => {
      for (const p of others) if (await myPlayTurn(p)) second = p;
      return !!second;
    }).toBe(true);
    const third = others.find((p) => p !== second)!;
    await expect(third.getByTestId('hand')).toHaveAttribute('data-preselect', 'true');
    // le carte non lecite (obbligo di colore) sono oscurate e non si sollevano
    const blocked = third.locator(`${CARDS}[aria-disabled="true"]`);
    if ((await blocked.count()) > 0) {
      await expect(blocked.first()).toHaveClass(/dimmed/);
      await blocked.first().click({ position: CARD_CORNER, force: true });
      await expect(third.locator(`${CARDS}[aria-pressed="true"]`)).toHaveCount(0);
    }
    // solleva, abbassa, sposta
    const legal = third.locator(`${CARDS}[aria-disabled="false"]`);
    const n = await legal.count();
    expect(n).toBeGreaterThan(0);
    await legal.nth(0).click({ position: CARD_CORNER });
    await expect(legal.nth(0)).toHaveAttribute('aria-pressed', 'true');
    await legal.nth(0).click({ position: CARD_CORNER });
    await expect(legal.nth(0)).toHaveAttribute('aria-pressed', 'false');
    if (n > 1) {
      await legal.nth(0).click({ position: CARD_CORNER });
      await legal.nth(1).click({ position: CARD_CORNER });
      await expect(legal.nth(0)).toHaveAttribute('aria-pressed', 'false');
    } else {
      await legal.nth(0).click({ position: CARD_CORNER });
    }
    const chosen = third.locator(`${CARDS}[aria-pressed="true"]`);
    await expect(chosen).toHaveCount(1);
    const id = (await chosen.getAttribute('data-card-id'))!;
    const before = await third.locator(CARDS).count();

    // gioca il secondo: al turno del terzo la carta preselezionata parte da sola, senza altri tocchi
    await playNow(second!);
    const valido = third.getByTestId('btn-valido');
    if (id.startsWith('god-')) {
      // un Dio in situazione di scelta chiede comunque Valido/Chipetl (regola, non conferma)
      await valido.waitFor({ timeout: 3000 }).catch(() => {});
      if (await valido.isVisible()) await valido.click();
    }
    await expect(third.locator(CARDS)).toHaveCount(before - 1);
    // proprio quella carta è uscita dalla mano (la presa, ora completa, sparisce subito dal tavolo)
    await expect(third.locator(`${CARDS}[data-card-id="${id}"]`)).toHaveCount(0);
  } finally {
    for (const p of players) await p.context.close();
  }
});

test('classifica dopo 0 e dopo 2 mani; riepilogo ordinato per totale', async ({ browser }) => {
  const a = await newPlayer(browser);
  const page = a.page;
  try {
    await startWithBots(page, 3);
    const seatIds = await page
      .locator('[data-testid="table"] [data-testid^="seat-"]')
      .evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')!.replace('seat-', '')));

    // dopo 0 mani: tutti a 0, ordine dei posti dal mazziere, M solo sul mazziere
    await page.getByTestId('btn-standings').click();
    await expect(page.getByTestId('standings-after')).toHaveText('Nessuna mano conclusa');
    const rows0 = await page.locator('[data-testid^="standings-row-"]').evaluateAll((els) =>
      els.map((e) => ({ id: e.getAttribute('data-testid')!.replace('standings-row-', ''), total: e.querySelector('[data-testid="standings-total"]')!.textContent, dealer: !!e.querySelector('[data-testid="standings-dealer"]') })),
    );
    expect(rows0.map((r) => r.total)).toEqual(['0', '0', '0', '0']);
    expect(rows0[0]!.dealer, 'il primo a parità è il mazziere').toBe(true);
    expect(rows0.filter((r) => r.dealer)).toHaveLength(1);
    // la sequenza segue i posti, a partire dal mazziere
    const start = seatIds.indexOf(rows0[0]!.id);
    expect(rows0.map((r) => r.id)).toEqual(seatIds.map((_, i) => seatIds[(start + i) % seatIds.length]));
    await page.getByTestId('btn-close-standings').click();
    await expect(page.getByTestId('standings')).toHaveCount(0);

    // si giocano 2 mani
    let summaries: SummaryRow[][] = [];
    for (let i = 0; i < 6000 && summaries.length < 2; i++) {
      if (await isVisible(page, 'hand-summary')) {
        const rows = await readSummary(page);
        for (let k = 1; k < rows.length; k++) expect(rows[k - 1]!.total, 'riepilogo per totale decrescente').toBeGreaterThanOrEqual(rows[k]!.total);
        summaries = [...summaries, rows];
        await page.getByTestId('btn-next-hand').click({ timeout: 5000 });
        await expect(page.getByTestId('hand-summary')).toHaveCount(0, { timeout: 10_000 });
        continue;
      }
      if ((await playTurnViaUI(page)) === 'none') await page.waitForTimeout(30);
    }
    expect(summaries).toHaveLength(2);

    // durante la 3ª mano: totali dopo la 2ª
    await expect(page.getByTestId('hud')).toContainText('Mano 3/6');
    await page.getByTestId('btn-standings').click();
    await expect(page.getByTestId('standings-after')).toHaveText('Dopo la mano 2 di 6');
    const after2 = new Map(summaries[1]!.map((r) => [r.id, r.total]));
    const rows2 = await page.locator('[data-testid^="standings-row-"]').evaluateAll((els) =>
      els.map((e) => ({ id: e.getAttribute('data-testid')!.replace('standings-row-', ''), total: Number(e.querySelector('[data-testid="standings-total"]')!.textContent!.replace(/[−–]/g, '-')) })),
    );
    expect(rows2).toHaveLength(4);
    for (const r of rows2) expect(r.total, `totale di ${r.id}`).toBe(after2.get(r.id));
    for (let k = 1; k < rows2.length; k++) expect(rows2[k - 1]!.total).toBeGreaterThanOrEqual(rows2[k]!.total);
    await expect(page.getByTestId('standings-dealer')).toHaveCount(1);
  } finally {
    await a.context.close();
  }
});
