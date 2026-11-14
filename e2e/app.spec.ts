import { expect, test } from '@playwright/test';
import { createRoom, newPlayer } from './helpers';

const HAND_CARDS = '[data-testid="hand"] [data-testid="card"]';

test('comportamento da app: sul tavolo il testo non è selezionabile, il nickname sì', async ({ browser }) => {
  const a = await newPlayer(browser);
  const page = a.page;
  try {
    await page.goto('/');
    const input = page.getByTestId('input-nickname');
    expect(await input.evaluate((e) => getComputedStyle(e).userSelect)).not.toBe('none');
    await input.fill('Anna');
    await input.selectText();
    expect(await input.evaluate((e) => (e as HTMLInputElement).selectionEnd! - (e as HTMLInputElement).selectionStart!)).toBe(4);

    await page.getByTestId('btn-create').click();
    await page.getByTestId('btn-add-bot').click();
    await page.getByTestId('btn-start').click();
    await expect(page.getByTestId('table')).toBeVisible();

    // stile: niente selezione, niente menu tenendo premuto, niente evidenziazione al tocco
    const style = await page.getByTestId('table').evaluate((e) => {
      const cs = getComputedStyle(e);
      const root = getComputedStyle(document.documentElement);
      return { user: cs.userSelect, webkit: cs.webkitUserSelect, tap: root.getPropertyValue('-webkit-tap-highlight-color') };
    });
    expect(style.user).toBe('none');
    expect(style.webkit).toBe('none');
    expect(style.tap.replace(/\s/g, '')).toMatch(/rgba\(0,0,0,0\)|transparent/);

    // tentativi reali: triplo clic su una targhetta e "seleziona tutto"
    await page.locator('.seat-name').first().click({ clickCount: 3 });
    expect(await page.evaluate(() => window.getSelection()?.toString() ?? '')).toBe('');
    await page.keyboard.press('Control+A');
    expect(await page.evaluate(() => window.getSelection()?.toString().trim() ?? '')).toBe('');

    // menu contestuale bloccato su carte e tavolo; carte non trascinabili
    const blocked = await page.locator(HAND_CARDS).first().evaluate((el) => {
      const ev = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
      el.dispatchEvent(ev);
      return ev.defaultPrevented;
    });
    expect(blocked).toBe(true);
    await expect(page.locator(HAND_CARDS).first()).toHaveAttribute('draggable', 'false');
  } finally {
    await a.context.close();
  }
});

test('"Copia link" mette negli appunti l\'URL della stanza e conferma "Copiato!"; "Condividi" senza Web Share copia', async ({ browser }) => {
  const a = await newPlayer(browser);
  const page = a.page;
  try {
    await a.context.grantPermissions(['clipboard-read', 'clipboard-write']);
    const url = await createRoom(page, 'Anna');
    expect(url).toMatch(/^http:\/\/localhost:3100\/r\/[A-Z0-9]{4,}$/);
    expect(page.url()).toBe(url);
    // nessun testo del link da selezionare a mano
    await expect(page.getByTestId('invite-link')).toHaveCount(0);

    await page.getByTestId('btn-copy-link').click();
    await expect(page.getByTestId('btn-copy-link')).toHaveText('Copiato!');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(url);

    // Chromium desktop senza Web Share: "Condividi" fa come "Copia link"
    await page.evaluate(() => navigator.clipboard.writeText('vuoto'));
    await page.evaluate(() => Object.defineProperty(navigator, 'share', { value: undefined, configurable: true }));
    await page.getByTestId('btn-share').click();
    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(url);
  } finally {
    await a.context.close();
  }
});
