import { useEffect, useState } from 'react';
import { enterFullscreen, exitFullscreen, useFullscreen } from '../lib/fullscreen';

function Corners({ out }: { out: boolean }) {
  // quattro angoli: verso l'esterno = entra, verso l'interno = esci
  const d = out
    ? 'M3 8V3h5M16 3h5v5M21 16v5h-5M8 21H3v-5'
    : 'M8 3v5H3M21 8h-5V3M16 21v-5h5M3 16h5v5';
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Pulsante discreto in alto a destra: entra/esce dal tutto schermo. Se il browser l'ha tolto
 * (es. dopo un passaggio a un'altra app) compare in alto al centro l'invito "Torna a tutto schermo", chiudibile.
 */
export function FullscreenButton() {
  const { available, active, wanted } = useFullscreen();
  // l'invito "Torna a tutto schermo" si può chiudere: resta il pulsante discreto
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    if (active) setDismissed(false);
  }, [active]);
  if (!available) return null;
  if (active) {
    return (
      <button type="button" className="fs-btn" data-testid="btn-exit-fullscreen" onClick={exitFullscreen} aria-label="Esci da tutto schermo" title="Esci da tutto schermo">
        <Corners out={false} />
      </button>
    );
  }
  const plain = (
    <button type="button" className="fs-btn" data-testid="btn-enter-fullscreen" onClick={enterFullscreen} aria-label="Tutto schermo" title="Tutto schermo">
      <Corners out />
    </button>
  );
  if (wanted && !dismissed) {
    return (
      <>
        {plain}
        <div className="fs-back" role="group" aria-label="Tutto schermo">
          <button type="button" data-testid="btn-back-fullscreen" onClick={enterFullscreen}>
            <Corners out />
            Torna a tutto schermo
          </button>
          <button type="button" className="fs-back-close" data-testid="btn-dismiss-fullscreen" onClick={() => setDismissed(true)} aria-label="Non ora">
            ×
          </button>
        </div>
      </>
    );
  }
  return plain;
}
