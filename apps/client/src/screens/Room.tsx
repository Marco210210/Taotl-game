import { Link } from '../Link';
import { errorMessage } from '../lib/errors';
import { useRoom } from '../net/useRoom';
import { FinalRanking } from './FinalRanking';
import { Join } from './Join';
import { Lobby } from './Lobby';
import { Table } from './Table';

function Failure({ error }: { error: string }) {
  return (
    <main className="screen">
      <p role="alert">{errorMessage(error)}</p>
      <Link to="/">Torna alla home</Link>
    </main>
  );
}

export function Room({ code }: { code: string }) {
  const { view, error, needsJoin, join, emit } = useRoom(code);
  if (error === 'room-not-found' || error === 'game-started') return <Failure error={error} />;
  if (needsJoin) return <Join error={error} onJoin={join} />;
  if (error && !view) return <Failure error={error} />;
  if (!view) {
    return (
      <main className="screen">
        <p>Connessione…</p>
      </main>
    );
  }
  if (view.status === 'playing') return <Table view={view} emit={emit} />;
  if (view.status === 'ended') return <FinalRanking view={view} emit={emit} />;
  return (
    <Lobby
      view={view}
      addBot={() => emit('lobby:addBot')}
      kick={(playerId) => emit('lobby:kick', { playerId })}
      reorder={(order) => emit('lobby:reorder', { order })}
      start={() => emit('game:start')}
    />
  );
}
