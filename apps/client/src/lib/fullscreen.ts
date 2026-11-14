import { useEffect, useState } from 'react';

/**
 * Tutto schermo e blocco in orizzontale (SPEC §7.4), dove il browser lo permette.
 * "wanted" ricorda (per la scheda) che il giocatore ha scelto il tutto schermo: se il browser
 * lo toglie, ad esempio dopo un passaggio a un'altra app, si propone "Torna a tutto schermo".
 */
const KEY = 'taotl:fullscreen';

const media = (q: string) => typeof matchMedia === 'function' && matchMedia(q).matches;

/** App installata: si apre già a tutto schermo, niente pulsanti. */
export const isInstalledApp = (): boolean =>
  media('(display-mode: fullscreen)') || media('(display-mode: standalone)') || (navigator as { standalone?: boolean }).standalone === true;

export const fullscreenSupported = (): boolean =>
  typeof document !== 'undefined' && !!document.fullscreenEnabled && typeof document.documentElement.requestFullscreen === 'function';

const isActive = () => typeof document !== 'undefined' && !!document.fullscreenElement;

/** Dispositivo touch: il tutto schermo automatico al primo tocco ha senso solo qui. */
export const isTouchDevice = (): boolean => media('(pointer: coarse)');

function setWanted(v: boolean) {
  try {
    if (v) sessionStorage.setItem(KEY, '1');
    else sessionStorage.removeItem(KEY);
  } catch {
    /* sessionStorage non disponibile */
  }
  window.dispatchEvent(new Event('taotl:fullscreen'));
}
function getWanted(): boolean {
  try {
    return sessionStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

/** Va chiamata dentro un gestore di tocco/click: il browser lo richiede. Non lancia mai. */
export function enterFullscreen(): void {
  if (!fullscreenSupported() || isInstalledApp()) return;
  setWanted(true);
  if (isActive()) return;
  document.documentElement
    .requestFullscreen({ navigationUI: 'hide' })
    .then(() => {
      const o = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
      return o?.lock?.('landscape');
    })
    .catch(() => {
      /* rifiutato o non supportato: si gioca senza */
    });
}

/** Tutto schermo automatico al primo tocco che entra nel gioco ("Crea stanza", "Entra"), solo su touch. */
export function enterFullscreenOnTouch(): void {
  if (isTouchDevice()) enterFullscreen();
}

export function exitFullscreen(): void {
  setWanted(false);
  if (isActive()) document.exitFullscreen().catch(() => {});
}

export function useFullscreen() {
  const [, force] = useState(0);
  useEffect(() => {
    const on = () => force((n) => n + 1);
    document.addEventListener('fullscreenchange', on);
    window.addEventListener('taotl:fullscreen', on);
    document.addEventListener('visibilitychange', on);
    return () => {
      document.removeEventListener('fullscreenchange', on);
      window.removeEventListener('taotl:fullscreen', on);
      document.removeEventListener('visibilitychange', on);
    };
  }, []);
  const available = fullscreenSupported() && !isInstalledApp();
  return { available, active: isActive(), wanted: getWanted() };
}
