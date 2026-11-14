import { expect, test, type Page } from '@playwright/test';
import { CARD_CORNER, createRoom, isVisible, newPlayer, playTurnViaUI, readSummary, type SummaryRow } from './helpers';

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

const myPlayTurn = async (page: Page) =>
  (await page.getByTestId('my-turn').isVisible()) && (await page.locator('[data-testid^="bid-"]').count()) === 0;

test('preselezione fuori turno: solleva, abbassa, sposta; al mio turno resta su e un tocco la gioca', async ({ browser }) => {
  const a = await newPlayer(browser);
  const page = a.page;
  try {
    await startWithBots(page, 1);
    await expect(page.locator(CARDS)).toHaveCount(36);
    // fase di dichiarazione: non è il mio turno di gioco, le carte si possono preselezionare
    const first = page.locator(CARDS).nth(0);
    const second = page.locator(CARDS).nth(1);
    await first.click({ position: CARD_CORNER });
    await expect(first).toHaveAttribute('aria-pressed', 'true');
    await first.click({ position: CARD_CORNER });
    await expect(first).toHaveAttribute('aria-pressed', 'false');
    await first.click({ position: CARD_CORNER });
    await second.click({ position: CARD_CORNER });
    await expect(first).toHaveAttribute('aria-pressed', 'false');
    await expect(second).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator(CARDS)).toHaveCount(36);

    // si cerca un mio turno di gioco con una carta preselezionata giocabile
    let checked = false;
    for (let i = 0; i < 2000 && !checked; i++) {
      if (await myPlayTurn(page)) {
        const pressed = page.locator(`${CARDS}[aria-pressed="true"]`);
        if ((await pressed.count()) === 1 && (await pressed.getAttribute('aria-disabled')) === 'false') {
          // il turno è arrivato: la carta non si è giocata da sola
          const id = await pressed.getAttribute('data-card-id');
          const before = await page.locator(CARDS).count();
          await page.waitForTimeout(300);
          await expect(page.locator(CARDS)).toHaveCount(before);
          await expect(page.locator(`${CARDS}[data-card-id="${id}"]`)).toHaveAttribute('aria-pressed', 'true');
          await page.locator(`${CARDS}[data-card-id="${id}"]`).click({ position: CARD_CORNER });
          // un Dio in situazione di scelta chiede Valido/Chipetl: è una regola, non una conferma
          if (id!.startsWith('god-') && (await page.getByTestId('btn-valido').isVisible())) await page.getByTestId('btn-valido').click();
          await expect(page.locator(CARDS)).toHaveCount(before - 1);
          await expect(page.locator(`[data-testid="trick"] [data-card-id="${id}"]`)).toHaveCount(1);
          checked = true;
          break;
        }
        // nessuna carta preselezionata giocabile: le non giocabili si sono abbassate da sole
        await expect(page.locator(`${CARDS}[aria-pressed="true"][aria-disabled="true"]`)).toHaveCount(0);
        await playTurnViaUI(page);
        continue;
      }
      // fuori dal mio turno di gioco: dopo un'eventuale dichiarazione, preseleziona una carta
      if ((await playTurnViaUI(page)) === 'none') {
        const pressed = await page.locator(`${CARDS}[aria-pressed="true"]`).count();
        if (pressed === 0 && !(await myPlayTurn(page))) {
          await page.locator(CARDS).first().click({ position: CARD_CORNER, timeout: 1500 }).catch(() => {});
        }
        await page.waitForTimeout(30);
      }
    }
    expect(checked, 'turno con carta preselezionata giocabile non osservato').toBe(true);
  } finally {
    await a.context.close();
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
