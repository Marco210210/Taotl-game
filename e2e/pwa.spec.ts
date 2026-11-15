import { expect, test } from '@playwright/test';
import { newPlayer } from './helpers';

test('manifest valido: nome, display fullscreen, orientamento, icone e screenshot raggiungibili', async ({ request }) => {
  const page = await request.get('/');
  const html = await page.text();
  expect(html).toContain('rel="manifest"');
  expect(html).toContain('apple-touch-icon');
  expect(html).toContain('apple-mobile-web-app-capable');

  const res = await request.get('/manifest.webmanifest');
  expect(res.ok()).toBe(true);
  expect(res.headers()['content-type']).toContain('application/manifest+json');
  expect(res.headers()['cache-control']).toBe('no-cache');
  const m = await res.json();
  expect(m).toMatchObject({
    id: '/',
    name: 'Il Taotl',
    short_name: 'Taotl',
    start_url: '/',
    scope: '/',
    display: 'fullscreen',
    orientation: 'landscape',
  });
  expect(m.display_override).toEqual(['fullscreen', 'standalone']);
  expect(m.theme_color).toMatch(/^#[0-9a-f]{6}$/i);
  expect(m.background_color).toMatch(/^#[0-9a-f]{6}$/i);

  const icons = m.icons as Array<{ src: string; sizes: string; purpose?: string; type: string }>;
  expect(icons.some((i) => i.sizes === '192x192' && i.type === 'image/png')).toBe(true);
  expect(icons.some((i) => i.sizes === '512x512' && (i.purpose ?? 'any').includes('any'))).toBe(true);
  expect(icons.some((i) => i.sizes === '512x512' && i.purpose === 'maskable')).toBe(true);
  const shots = m.screenshots as Array<{ src: string; sizes: string; form_factor?: string }>;
  expect(shots.some((s) => s.form_factor === 'wide')).toBe(true);
  for (const f of [...icons, ...shots, { src: '/icons/apple-touch-icon.png', sizes: '180x180' }]) {
    const r = await request.get(f.src);
    expect(r.ok(), f.src).toBe(true);
    const buf = await r.body();
    // PNG: firma e misure dall'intestazione IHDR
    expect(buf.subarray(1, 4).toString(), f.src).toBe('PNG');
    const [w, h] = f.sizes.split('x').map(Number);
    expect([buf.readUInt32BE(16), buf.readUInt32BE(20)], f.src).toEqual([w, h]);
    // orizzontali: più larghi che alti
    if (shots.includes(f as (typeof shots)[number])) expect(w!).toBeGreaterThan(h!);
  }
});

test('header di cache: service worker e pagina sempre ricontrollati, asset con hash immutabili', async ({ request }) => {
  const sw = await request.get('/sw.js');
  expect(sw.ok()).toBe(true);
  expect(sw.headers()['cache-control']).toBe('no-cache');
  expect(sw.headers()['content-type']).toContain('javascript');
  expect((await request.get('/')).headers()['cache-control']).toBe('no-cache');
  expect((await request.get('/r/ABCD')).headers()['cache-control']).toBe('no-cache');
  const html = await (await request.get('/')).text();
  const asset = /\/assets\/[\w.-]+\.js/.exec(html)![0];
  expect((await request.get(asset)).headers()['cache-control']).toContain('immutable');
  // il service worker non tocca mai socket.io e non serve index.html dalla cache
  const swText = await sw.text();
  expect(swText).not.toMatch(/index\.html/);
});

test('service worker registrato e attivo; con il service worker al comando il gioco si connette', async ({ browser }) => {
  const a = await newPlayer(browser);
  const page = a.page;
  try {
    await page.goto('/');
    const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope);
    expect(scope).toBe('http://localhost:3100/');
    await page.reload();
    await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
    // Socket.IO passa (non è in cache): si crea una stanza e si aggiunge un bot
    await page.getByTestId('input-nickname').fill('Anna');
    await page.getByTestId('btn-create').click();
    await expect(page.getByTestId('btn-copy-link')).toBeVisible();
    await page.getByTestId('btn-add-bot').click();
    await expect(page.locator('[data-testid^="seat-"]')).toHaveCount(2);
    // nessuna risposta di socket.io servita dal service worker
    const cached = await page.evaluate(async () => {
      const out: string[] = [];
      for (const k of await caches.keys()) for (const r of await (await caches.open(k)).keys()) out.push(r.url);
      return out;
    });
    expect(cached.some((u) => u.includes('/socket.io'))).toBe(false);
    expect(cached.some((u) => /\/assets\/.+\.js$/.test(u))).toBe(true);
  } finally {
    await a.context.close();
  }
});

test('pulsante "Installa l\'app": compare con beforeinstallprompt e apre la finestra del browser', async ({ browser }) => {
  const a = await newPlayer(browser);
  const page = a.page;
  try {
    await page.goto('/');
    await expect(page.getByTestId('btn-install')).toHaveCount(0);
    // evento simulato: in un browser vero lo manda Chrome/Edge quando l'app è installabile
    await page.evaluate(() => {
      const e = new Event('beforeinstallprompt', { cancelable: true }) as Event & { prompt: () => Promise<void>; userChoice: Promise<unknown> };
      e.prompt = async () => {
        (window as unknown as { __prompted: boolean }).__prompted = true;
      };
      e.userChoice = Promise.resolve({ outcome: 'dismissed' });
      window.dispatchEvent(e);
    });
    await page.getByTestId('btn-install').click();
    expect(await page.evaluate(() => (window as unknown as { __prompted?: boolean }).__prompted)).toBe(true);
  } finally {
    await a.context.close();
  }
});

test('su iPhone il pulsante apre le istruzioni "Condividi → Aggiungi alla schermata Home"', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 844, height: 390 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  try {
    await page.goto('/');
    await page.getByTestId('btn-install').click();
    const dialog = page.getByTestId('ios-install');
    await expect(dialog).toContainText('Condividi');
    await expect(dialog).toContainText('Aggiungi alla schermata Home');
    await page.getByTestId('btn-close-install').click();
    await expect(dialog).toHaveCount(0);
  } finally {
    await context.close();
  }
});

test('sito "pulito" per i filtri: header di sicurezza, nessuna richiesta esterna, nessuna violazione CSP', async ({ browser, request }) => {
  const res = await request.get('/');
  const h = res.headers();
  expect(h['content-security-policy']).toContain("script-src 'self'");
  expect(h['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(h['x-frame-options']).toBe('DENY');
  expect(h['x-content-type-options']).toBe('nosniff');
  expect(h['x-powered-by']).toBeUndefined();
  expect((await request.get('/robots.txt')).ok()).toBe(true);
  // testo leggibile anche senza JavaScript (filtri, motori di ricerca) e anteprima del link
  const html = await res.text();
  expect(html).toContain('<noscript>');
  expect(html).toMatch(/<main class="intro">[\s\S]*Crea una stanza/);
  expect(html).toContain('property="og:title"');
  const sitemap = await request.get('/sitemap.xml');
  expect(sitemap.ok()).toBe(true);
  expect(await sitemap.text()).toContain('<urlset');

  const a = await newPlayer(browser);
  const page = a.page;
  const external: string[] = [];
  const violations: string[] = [];
  page.on('request', (r) => {
    const u = new URL(r.url());
    if (!['localhost', '127.0.0.1'].includes(u.hostname) && !u.protocol.startsWith('data') && !u.protocol.startsWith('blob')) external.push(r.url());
  });
  page.on('console', (m) => {
    if (/Content Security Policy|Refused to/i.test(m.text())) violations.push(m.text());
  });
  try {
    await page.goto('/');
    await page.evaluate(() => document.addEventListener('securitypolicyviolation', (e) => console.error('Refused to ' + e.violatedDirective + ' ' + e.blockedURI)));
    await page.getByTestId('input-nickname').fill('Anna');
    await page.getByTestId('btn-create').click();
    await page.getByTestId('btn-add-bot').click();
    await page.getByTestId('btn-start').click();
    await expect(page.getByTestId('table')).toBeVisible();
    await expect(page.locator('[data-testid="hand"] [data-testid="card"]').first()).toBeVisible();
    // i font sono quelli nostri e sono caricati davvero
    expect(await page.evaluate(async () => (await document.fonts.ready, [...document.fonts].some((f) => f.family.includes('Grenze') && f.status === 'loaded')))).toBe(true);
    expect(external).toEqual([]);
    expect(violations).toEqual([]);
  } finally {
    await a.context.close();
  }
});
