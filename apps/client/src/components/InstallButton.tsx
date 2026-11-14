import { useEffect, useId, useState } from 'react';
import { promptInstall, useInstallMode } from '../lib/install';
import { useDialogFocus } from './useDialogFocus';

/** Icona "Condividi" di Safari: quadrato con freccia in su. */
function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 9H6v12h12V9h-2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M12 15V3M8 7l4-4 4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
/** Icona "Aggiungi alla schermata Home": quadrato arrotondato con il più. */
function AddIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3.5" y="3.5" width="17" height="17" rx="4" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function IosInstallDialog({ onClose }: { onClose: () => void }) {
  const titleId = useId();
  const ref = useDialogFocus<HTMLElement>();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <section className="dialog ios-install" data-testid="ios-install" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={ref} tabIndex={-1}>
        <h2 id={titleId} className="dialog-title">
          Installa Il Taotl
        </h2>
        <ol className="ios-steps">
          <li>
            <span className="ios-icon ios-share">
              <ShareIcon />
            </span>
            <span>
              Tocca <b>Condividi</b> nella barra di Safari
            </span>
          </li>
          <li>
            <span className="ios-icon">
              <AddIcon />
            </span>
            <span>
              Scegli <b>Aggiungi alla schermata Home</b>
            </span>
          </li>
          <li>
            <span className="ios-icon ios-app">
              <img src="/icons/icon-192.png" alt="" width={40} height={40} draggable={false} />
            </span>
            <span>
              Apri <b>Taotl</b> dalla Home: si gioca a tutto schermo
            </span>
          </li>
        </ol>
        <button type="button" data-testid="btn-close-install" onClick={onClose}>
          Ho capito
        </button>
      </section>
    </div>
  );
}

/** "Installa l'app": finestra del browser dove c'è, istruzioni illustrate su iPhone/iPad, niente altrove. */
export function InstallButton() {
  const mode = useInstallMode();
  const [ios, setIos] = useState(false);
  if (!mode && !ios) return null;
  return (
    <>
      {mode && (
        <button type="button" className="secondary install-btn" data-testid="btn-install" onClick={() => (mode === 'ios' ? setIos(true) : void promptInstall())}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3v12M7 10l5 5 5-5M4 20h16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Installa l'app
        </button>
      )}
      {ios && <IosInstallDialog onClose={() => setIos(false)} />}
    </>
  );
}
