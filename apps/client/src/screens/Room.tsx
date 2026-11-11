import { Link } from '../Link';
import { errorMessage } from '../lib/errors';
import { useRoom } from '../net/useRoom';
import { Join } from './Join';
import { Lobby } from './Lobby';

export function Room({ code }: { code: string }) {
  const { view, error, needsJoin, join, emit } = useRoom(code);
  if (error === 'room-not-found' || error === 'game-started') {
    return (
      <main className="screen">
        <p role="alert">{errorMessage(error)}</p>
        <Link to="/">Torna alla home</Link>
      </main>
    );
  }
  if (needsJoin) return <Join error={error} onJoin={join} />;
  if (!view) {
    return (
      <main className="screen">
        <p>Connessione…</p>
      </main>
    );
  }
  if (view.status !== 'lobby') return <div data-testid="table-placeholder" />;
  return (
    <Lobby
      view={view}
      addBot={() => void emit('lobby:addBot')}
      kick={(playerId) => void emit('lobby:kick', { playerId })}
      reorder={(order) => void emit('lobby:reorder', { order })}
      start={() => void emit('game:start')}
    />
  );
}
