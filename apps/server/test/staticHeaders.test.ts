import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { setStaticHeaders } from '../src/app';

const headersFor = (rel: string) => {
  const h: Record<string, string> = {};
  setStaticHeaders({ setHeader: (k, v) => (h[k] = v) }, path.join('/srv', 'client', 'dist', ...rel.split('/')));
  return h;
};

describe('setStaticHeaders (SPEC §7.4)', () => {
  it('service worker, manifest e pagina sempre ricontrollati', () => {
    for (const f of ['sw.js', 'index.html', 'manifest.webmanifest', 'workbox-6ce00fc9.js']) expect(headersFor(f)['Cache-Control'], f).toBe('no-cache');
    expect(headersFor('manifest.webmanifest')['Content-Type']).toContain('application/manifest+json');
    expect(headersFor('sw.js')['Service-Worker-Allowed']).toBe('/');
  });
  it('asset con hash nel nome: un anno, immutabili; il resto un giorno', () => {
    expect(headersFor('assets/index-D5NUZQBD.js')['Cache-Control']).toBe('public, max-age=31536000, immutable');
    expect(headersFor('icons/icon-192.png')['Cache-Control']).toBe('public, max-age=86400');
  });
});
