import type { RoomView } from '@taotl/protocol';

export interface LobbyActions {
  addBot: () => void;
  kick: (playerId: string) => void;
  reorder: (order: string[]) => void;
  start: () => void;
}

export function Lobby({ view, addBot, kick, reorder, start }: { view: RoomView } & LobbyActions) {
  const isHost = view.hostId === view.me;
  const ids = view.seats.map((s) => s.id);
  const link = `${location.origin}/r/${view.code}`;
  const move = (i: number, d: -1 | 1) => {
    const next = [...ids];
    const [x] = next.splice(i, 1);
    next.splice(i + d, 0, x!);
    reorder(next);
  };
  return (
    <main className="screen">
      <h1>Stanza {view.code}</h1>
      <p>
        <span data-testid="invite-link">{link}</span>{' '}
        <button onClick={() => void navigator.clipboard?.writeText(link)}>Copia</button>
      </p>
      <ul className="seats">
        {view.seats.map((s, i) => (
          <li key={s.id} data-testid={`seat-${s.id}`}>
            <span>
              {s.id === view.hostId && <span title="Host">👑 </span>}
              {s.nickname}
              {s.id === view.me && ' (tu)'}
              {s.isBot && <span className="badge"> Bot</span>}
              {!s.isBot && !s.connected && <span className="muted"> disconnesso</span>}
            </span>
            {isHost && (
              <span className="seat-actions">
                <button data-testid={`btn-up-${s.id}`} disabled={i === 0} onClick={() => move(i, -1)} aria-label="Su">
                  ↑
                </button>
                <button data-testid={`btn-down-${s.id}`} disabled={i === ids.length - 1} onClick={() => move(i, 1)} aria-label="Giù">
                  ↓
                </button>
                {s.id !== view.me && (
                  <button data-testid={`btn-kick-${s.id}`} onClick={() => kick(s.id)}>
                    Espelli
                  </button>
                )}
              </span>
            )}
          </li>
        ))}
      </ul>
      {isHost ? (
        <div className="host-actions">
          <button data-testid="btn-add-bot" onClick={addBot}>
            Aggiungi bot
          </button>
          <button data-testid="btn-start" disabled={view.seats.length < 2} onClick={start}>
            Inizia
          </button>
        </div>
      ) : (
        <p>In attesa che l'host avvii la partita</p>
      )}
    </main>
  );
}
