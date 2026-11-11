export function GodChoice({ onChoose, onCancel }: { onChoose: (declareChipetl: boolean) => void; onCancel: () => void }) {
  return (
    <div className="overlay" role="dialog" aria-label="Come giochi il Dio?">
      <div className="dialog">
        <p>Come giochi il Dio?</p>
        <button type="button" data-testid="btn-valido" onClick={() => onChoose(false)}>
          Valido
        </button>
        <button type="button" data-testid="btn-chipetl" onClick={() => onChoose(true)}>
          Chipetl
        </button>
        <button type="button" data-testid="btn-cancel-choice" onClick={onCancel}>
          Annulla
        </button>
      </div>
    </div>
  );
}
