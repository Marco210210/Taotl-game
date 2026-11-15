import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

/** Colori del manifest: legno scuro della sala (sfondo) e panno verde (barra). Vedi theme.css. */
const BACKGROUND = '#1f140d';
const THEME = '#113a22';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // registrazione a mano in main.tsx, senza ricaricare la pagina (SPEC §7.4)
      injectRegister: false,
      registerType: 'autoUpdate',
      filename: 'sw.js',
      manifestFilename: 'manifest.webmanifest',
      manifest: {
        id: '/',
        name: 'Il Taotl',
        short_name: 'Taotl',
        description: 'Il gioco di carte Il Taotl, online con gli amici: da 2 a 12 giocatori, bot compresi.',
        lang: 'it',
        dir: 'ltr',
        start_url: '/',
        scope: '/',
        display: 'fullscreen',
        display_override: ['fullscreen', 'standalone'],
        orientation: 'landscape',
        background_color: BACKGROUND,
        theme_color: THEME,
        categories: ['games', 'entertainment'],
        // Android/Chrome: i link del gioco si aprono nell'app installata (su iOS Apple non lo permette)
        handle_links: 'preferred',
        launch_handler: { client_mode: ['navigate-existing', 'auto'] },
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        screenshots: [
          { src: '/screenshots/tavolo-wide.png', sizes: '1440x900', type: 'image/png', form_factor: 'wide', label: 'Il tavolo con quattro giocatori' },
          { src: '/screenshots/lobby-wide.png', sizes: '1440x900', type: 'image/png', form_factor: 'wide', label: 'La stanza: invita gli amici o aggiungi bot' },
          { src: '/screenshots/tavolo-phone.png', sizes: '1688x780', type: 'image/png', label: 'Il tavolo sul telefono in orizzontale' },
          { src: '/screenshots/classifica-phone.png', sizes: '1688x780', type: 'image/png', label: 'La classifica durante la partita' },
        ],
      },
      workbox: {
        // app shell e asset; index.html no: le pagine vanno prima in rete (mai versioni vecchie)
        globPatterns: ['**/*.{js,css,svg,png,woff2}'],
        globIgnores: ['**/index.html', 'screenshots/**'],
        navigateFallback: null,
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // pagine: rete prima, cache solo se offline o lentissima
            urlPattern: ({ request, url }) => request.mode === 'navigate' && !url.pathname.startsWith('/socket.io'),
            handler: 'NetworkFirst',
            options: { cacheName: 'taotl-pages', networkTimeoutSeconds: 4, expiration: { maxEntries: 20 } },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  server: { proxy: { '/socket.io': { target: 'http://localhost:3000', ws: true } } },
  build: { outDir: 'dist' },
});
