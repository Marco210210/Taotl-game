export function BidPanel({ allowed, onBid }: { allowed: number[]; onBid: (n: number) => void }) {
  return (
    <div className="bid-panel">
      <p>Quante prese farai?</p>
      <div className="bid-buttons">
        {allowed.map((n) => (
          <button key={n} type="button" data-testid={`bid-${n}`} onClick={() => onBid(n)}>
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
