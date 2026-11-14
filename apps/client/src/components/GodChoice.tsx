import { useId } from 'react';
import type { Card as CardT } from '@taotl/engine';
import { Card } from './Card';
import { useDialogFocus } from './useDialogFocus';

export function GodChoice({ card, onChoose, onCancel }: { card?: CardT; onChoose: (declareChipetl: boolean) => void; onCancel: () => void }) {
  const titleId = useId();
  const ref = useDialogFocus<HTMLDivElement>();
  return (
    <div className="overlay god-choice">
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={ref} tabIndex={-1}>
        <p id={titleId} className="dialog-title">
          Come giochi il Dio?
        </p>
        <div className="god-choice-body">
          {card && (
            <div className="god-choice-cards">
              <Card card={card} size="trick" interactive={false} />
            </div>
          )}
          <div className="god-choice-buttons">
            <button type="button" data-testid="btn-valido" onClick={() => onChoose(false)}>
              Valido
            </button>
            <button type="button" data-testid="btn-chipetl" onClick={() => onChoose(true)}>
              Chipetl
            </button>
            <button type="button" className="secondary" data-testid="btn-cancel-choice" onClick={onCancel}>
              Annulla
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
