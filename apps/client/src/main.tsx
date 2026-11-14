import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { initInstall } from './lib/install';
import './styles/theme.css';

initInstall();

// Comportamento da app (SPEC §7.4): niente menu tenendo premuto né trascinamento, tranne nei campi di input.
const isField = (t: EventTarget | null) => t instanceof HTMLElement && !!t.closest('input, textarea, [contenteditable="true"]');
document.addEventListener('contextmenu', (e) => {
  if (!isField(e.target)) e.preventDefault();
});
document.addEventListener('dragstart', (e) => {
  if (!isField(e.target)) e.preventDefault();
});

// Service worker: solo nella versione pubblicata (in sviluppo intralcerebbe il ricaricamento di Vite).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
      /* senza service worker il gioco funziona lo stesso */
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
