import { useEffect, useId } from 'react';
import type { RoomView } from '@taotl/protocol';
import { completedHands, standings } from '../lib/standings';
import { useDialogFocus } from './useDialogFocus';

/** Classifica a metà partita: solo le mani concluse, "M" accanto al mazziere della mano in corso. */
export function StandingsDialog({ view, onClose }: { view: RoomView; onClose: () => void }) {
  const titleId = useId();
  const ref = useDialogFocus<HTMLElement>();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const game = view.game;
  if (!game) return null;
  const done = completedHands(game.players);
  const rows = standings(view.seats, game.players, game.dealerId);
  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <section data-testid="standings" className="dialog standings" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={ref} tabIndex={-1}>
        <div className="standings-head">
          <h2 id={titleId} className="dialog-title">
            Classifica
          </h2>
          <button type="button" className="secondary close" data-testid="btn-close-standings" onClick={onClose} aria-label="Chiudi la classifica">
            ×
          </button>
        </div>
        <p className="standings-after" data-testid="standings-after">
          {done === 0 ? 'Nessuna mano conclusa' : `Dopo la mano ${done} di 6`}
        </p>
        <ol className="standings-list">
          {rows.map(({ seat: s, total }, i) => {
            const pos = rows.findIndex((r) => r.total === total) + 1;
            const dealer = s.id === game.dealerId;
            return (
              <li key={s.id} data-testid={`standings-row-${s.id}`} className={s.id === view.me ? 'me' : undefined}>
                <span className="standings-pos" aria-hidden={i > 0 && rows[i - 1]!.total === total}>
                  {i > 0 && rows[i - 1]!.total === total ? '' : pos}
                </span>
                <span className="standings-name">
                  {s.nickname}
                  {dealer && (
                    <abbr className="dealer-m" data-testid="standings-dealer" title="Mazziere della mano in corso">
                      M
                    </abbr>
                  )}
                </span>
                <span className="standings-total" data-testid="standings-total">
                  {total}
                </span>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
