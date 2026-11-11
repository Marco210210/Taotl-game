import { useState } from 'react';
import type { CompletedTrick } from '@taotl/engine';
import type { SeatView } from '@taotl/protocol';
import { TrickCards } from './TrickArea';

export function LastTrick({ tricks, seats }: { tricks: CompletedTrick[]; seats: SeatView[] }) {
  const [open, setOpen] = useState(false);
  const last = tricks[tricks.length - 1];
  return (
    <div className="last-trick">
      <button type="button" data-testid="btn-last-trick" disabled={!last} onClick={() => setOpen((o) => !o)}>
        Ultima presa
      </button>
      {open && last && (
        <div data-testid="last-trick-panel">
          <TrickCards cards={last.cards} seats={seats} winnerId={last.winnerId} />
        </div>
      )}
    </div>
  );
}
