import { useId } from 'react';
import { useDialogFocus } from './useDialogFocus';

export function GodChoice({ onChoose, onCancel }: { onChoose: (declareChipetl: boolean) => void; onCancel: () => void }) {
  const titleId = useId();
  const ref = useDialogFocus<HTMLDivElement>();
  return (
    <div className="overlay">
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={ref} tabIndex={-1}>
        <p id={titleId} className="dialog-title">
          Come giochi il Dio?
        </p>
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
  );
}
