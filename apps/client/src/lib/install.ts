import { useSyncExternalStore } from 'react';
import { isInstalledApp } from './fullscreen';

/** Evento non standard di Chrome/Edge/Android: permette di aprire la finestra di installazione. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
let installed = false;
let version = 0;
const listeners = new Set<() => void>();
const notify = () => {
  version += 1;
  listeners.forEach((l) => l());
};

/** Da chiamare all'avvio, prima del render: l'evento può arrivare molto presto. */
export function initInstall(): void {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // niente mini-barra del browser: c'è il nostro pulsante
    deferred = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    installed = true;
    notify();
  });
}

/** iPhone/iPad (anche iPadOS che si presenta come Mac): niente beforeinstallprompt. */
export const isIOS = (): boolean =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export type InstallMode = 'prompt' | 'ios' | null;

/** Come si può installare l'app qui: finestra del browser, istruzioni per iOS, oppure niente. */
export function installMode(): InstallMode {
  if (installed || isInstalledApp()) return null;
  if (deferred) return 'prompt';
  if (isIOS()) return 'ios';
  return null;
}

export async function promptInstall(): Promise<void> {
  const e = deferred;
  if (!e) return;
  deferred = null;
  await e.prompt();
  const { outcome } = await e.userChoice;
  if (outcome === 'accepted') installed = true;
  notify();
}

export function useInstallMode(): InstallMode {
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => version,
  );
  return installMode();
}
