import { expect, type Browser, type BrowserContext, type Page } from '@playwright/test';

const ACTION_TIMEOUT = 1500;

/** Punto dell'indice d'angolo di una carta della mano: visibile anche quando le carte sono sovrapposte. */
export const CARD_CORNER = { x: 7, y: 18 };

/** Viewport di riferimento: telefono in orizzontale e desktop (SPEC §7.4). */
export const PHONE = { width: 844, height: 390 };
export const DESKTOP = { width: 1440, height: 900 };

export type TurnKind = 'bid' | 'play' | 'none';

/** Un'azione di UI: un elemento sparito/ri-renderizzato non fa fallire il test, il ciclo riprova. */
async function attempt(action: () => Promise<unknown>): Promise<boolean> {
  try {
    await action();
    return true;
  } catch {
    return false;
  }
}

export async function playTurnViaUI(page: Page): Promise<TurnKind> {
  const bid = page.locator('[data-testid^="bid-"]').first();
  if (await bid.isVisible()) {
    return (await attempt(() => bid.click({ timeout: ACTION_TIMEOUT }))) ? 'bid' : 'none';
  }
  if (await page.getByTestId('my-turn').isVisible()) {
    const card = page.locator('[data-testid="hand"] [data-testid="card"][aria-disabled="false"]').first();
    if (!(await card.isVisible())) return 'none';
    // primo click seleziona, secondo gioca; si tocca l'indice in alto a sinistra, sempre scoperto nel ventaglio
    const ok = await attempt(async () => {
      await card.click({ timeout: ACTION_TIMEOUT, position: CARD_CORNER });
      await card.click({ timeout: ACTION_TIMEOUT, position: CARD_CORNER });
    });
    const valido = page.getByTestId('btn-valido');
    if (await valido.isVisible()) await attempt(() => valido.click({ timeout: ACTION_TIMEOUT }));
    return ok ? 'play' : 'none';
  }
  return 'none';
}

export async function describeState(page: Page): Promise<string> {
  try {
    return await page.evaluate(() => (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 300));
  } catch {
    return '(pagina non leggibile)';
  }
}

/** Cicla playTurnViaUI sulle pagine finché il predicato non è vero; cap di iterazioni, errore chiaro. */
export async function runUntil(
  pages: Page[],
  predicate: () => Promise<boolean>,
  opts: { maxIterations?: number; label?: string } = {},
): Promise<void> {
  const max = opts.maxIterations ?? 3000;
  for (let i = 0; i < max; i++) {
    if (await predicate()) return;
    let acted = false;
    for (const p of pages) if ((await playTurnViaUI(p)) !== 'none') acted = true;
    if (!acted) await pages[0]!.waitForTimeout(40);
  }
  const states = await Promise.all(pages.map(describeState));
  throw new Error(`runUntil (${opts.label ?? ''}) oltre ${max} iterazioni. Ultimo stato:\n${states.join('\n---\n')}`);
}

export const isVisible = (page: Page, testId: string) => page.getByTestId(testId).isVisible();

export async function newPlayer(browser: Browser, viewport = PHONE): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({ viewport });
  return { context, page: await context.newPage() };
}

export async function createRoom(page: Page, nickname: string): Promise<string> {
  await page.goto('/');
  await page.getByTestId('input-nickname').fill(nickname);
  await page.getByTestId('btn-create').click();
  const link = page.getByTestId('invite-link');
  await expect(link).toBeVisible();
  return (await link.innerText()).trim();
}

export async function joinRoom(page: Page, url: string, nickname: string): Promise<void> {
  await page.goto(url);
  await page.getByTestId('input-nickname').fill(nickname);
  await page.getByTestId('btn-join').click();
  await expect(page.getByTestId('invite-link')).toBeVisible();
}

/** Numero con segno: accetta il meno Unicode. */
export const parseSigned = (text: string): number => Number(text.replace(/[−–]/g, '-').replace('+', '').trim());

export interface SummaryRow {
  id: string;
  bid: number;
  made: number;
  points: number;
  total: number;
}

export async function readSummary(page: Page): Promise<SummaryRow[]> {
  const rows = page.locator('[data-testid^="summary-row-"]');
  const n = await rows.count();
  const out: SummaryRow[] = [];
  for (let i = 0; i < n; i++) {
    const row = rows.nth(i);
    const id = ((await row.getAttribute('data-testid')) ?? '').replace('summary-row-', '');
    const cell = async (t: string) => parseSigned(await row.getByTestId(t).innerText());
    out.push({
      id,
      bid: await cell('summary-bid'),
      made: await cell('summary-made'),
      points: await cell('summary-points'),
      total: await cell('summary-total'),
    });
  }
  return out;
}
