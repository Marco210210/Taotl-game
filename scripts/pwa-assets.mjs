#!/usr/bin/env node
// Genera le icone della PWA (apps/client/public/icons) e gli screenshot del manifest
// (apps/client/public/screenshots).
// Uso:
//   node scripts/pwa-assets.mjs icons
//   node scripts/pwa-assets.mjs screenshots http://localhost:3100   (server di produzione già avviato)
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(ROOT, 'apps/client/public');

// inchiostri delle carte (apps/client/src/components/cardArt/ink.ts) e panno del tavolo (theme.css)
const RED = '#d9262c';
const LINE = '#191714';
const YELLOW = '#f3d012';
const PAPER = '#fbfaf5';
const FELT = '#1e5c37';
const FELT_DEEP = '#113a22';

/** Carta bianca inclinata con asterisco rosso e la maschera del Totem, centrata in (256, 256). */
function cardGroup(scale) {
  const mask = `
    <path d="M4 3.2h16v17.4c0 4.4-3.6 7.6-8 7.6s-8-3.2-8-7.6Z" fill="${YELLOW}" stroke="${LINE}" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M6.6 10.2h4v2.2h-4Zm6.8 0h4v2.2h-4Z" fill="${LINE}"/>
    <path d="M12 12.6 10.2 18h3.6Z" fill="${LINE}"/>
    <path d="M8.2 21.4h7.6v2.2H8.2Z" fill="${LINE}"/>`;
  const star = `<path d="M0 -15v30M-13 -7.5l26 15M13 -7.5l-26 15" stroke="${RED}" stroke-width="6.5" stroke-linecap="round"/>`;
  return `
  <g transform="translate(256 262) scale(${scale}) rotate(-7)">
    <rect x="-118" y="-182" width="236" height="364" rx="22" fill="${PAPER}" stroke="${LINE}" stroke-width="7"/>
    <g transform="translate(0 -138)">${star}</g>
    <g transform="translate(0 138) rotate(180)">${star}</g>
    <g transform="translate(0 4) scale(6.6) translate(-12 -15.6)">${mask}</g>
  </g>`;
}

const defs = `
  <defs>
    <radialGradient id="felt" cx="50%" cy="44%" r="62%">
      <stop offset="0" stop-color="#2a7448"/>
      <stop offset="0.6" stop-color="${FELT}"/>
      <stop offset="1" stop-color="${FELT_DEEP}"/>
    </radialGradient>
  </defs>`;

/** Icona "any": quadrato arrotondato di panno con bordo nero, carta piena. */
const anySvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${defs}
  <rect x="8" y="8" width="496" height="496" rx="104" fill="url(#felt)" stroke="${LINE}" stroke-width="16"/>
  ${cardGroup(1)}
</svg>`;

/** Icona maskable e apple-touch: sfondo a tutta superficie, carta dentro la zona sicura (cerchio 80%). */
const fullSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${defs}
  <rect width="512" height="512" fill="url(#felt)"/>
  ${cardGroup(0.8)}
</svg>`;

async function icons() {
  const dir = path.join(PUBLIC, 'icons');
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, 'favicon.svg'), anySvg);
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const shots = [
    ['icon-192.png', anySvg, 192],
    ['icon-512.png', anySvg, 512],
    ['icon-maskable-512.png', fullSvg, 512],
    ['apple-touch-icon.png', fullSvg, 180],
  ];
  for (const [name, svg, size] of shots) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<html><body style="margin:0;background:transparent">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
    await page.screenshot({ path: path.join(dir, name), omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
    console.log('icona', name);
  }
  await browser.close();
}

/** Screenshot orizzontali per la finestra di installazione di Android (gioco vero con i bot). */
async function screenshots(base) {
  const dir = path.join(PUBLIC, 'screenshots');
  mkdirSync(dir, { recursive: true });
  const browser = await chromium.launch();
  const setup = async (viewport, scale, bots) => {
    const ctx = await browser.newContext({ viewport, deviceScaleFactor: scale });
    const page = await ctx.newPage();
    await page.goto(base);
    await page.getByTestId('input-nickname').fill('Marco');
    await page.getByTestId('btn-create').click();
    await page.getByTestId('btn-copy-link').waitFor();
    for (let i = 0; i < bots; i++) await page.getByTestId('btn-add-bot').click();
    await page.waitForFunction((n) => document.querySelectorAll('[data-testid^="seat-"]').length === n, bots + 1);
    return { ctx, page };
  };
  const toTable = async (page) => {
    await page.getByTestId('btn-start').click();
    await page.getByTestId('table').waitFor();
    // dichiaro, poi aspetto che sul tavolo ci siano almeno 2 carte giocate
    for (let i = 0; i < 300; i++) {
      const bid = page.locator('[data-testid^="bid-"]').nth(1);
      if (await bid.isVisible()) await bid.click().catch(() => {});
      if ((await page.locator('[data-testid="trick-slot"]').count()) >= 2) break;
      await page.waitForTimeout(100);
    }
    await page.waitForTimeout(400);
  };
  {
    const { ctx, page } = await setup({ width: 1440, height: 900 }, 1, 3);
    await page.screenshot({ path: path.join(dir, 'lobby-wide.png') });
    await toTable(page);
    await page.screenshot({ path: path.join(dir, 'tavolo-wide.png') });
    await ctx.close();
  }
  {
    const { ctx, page } = await setup({ width: 844, height: 390 }, 2, 4);
    await toTable(page);
    await page.screenshot({ path: path.join(dir, 'tavolo-phone.png') });
    await page.getByTestId('btn-standings').click();
    await page.getByTestId('standings').waitFor();
    await page.screenshot({ path: path.join(dir, 'classifica-phone.png') });
    await ctx.close();
  }
  await browser.close();
  console.log('screenshot in', dir);
}

const [cmd, arg] = process.argv.slice(2);
if (cmd === 'icons') await icons();
else if (cmd === 'screenshots') await screenshots(arg ?? 'http://localhost:3100');
else {
  console.error('uso: node scripts/pwa-assets.mjs icons | screenshots <url>');
  process.exit(1);
}
