import { Link } from '../Link';
import { errorMessage } from '../lib/errors';
import { useRoom } from '../net/useRoom';
import { FinalRanking } from './FinalRanking';
import { Join } from './Join';
import { Lobby } from './Lobby';
import { Table } from './Table';

function Failure({ error }: { error: string }) {
  return (
    <main className="screen single">
      <section className="sheet">
        <h1>Il Taotl</h1>
        <p role="alert">{errorMessage(error)}</p>
        <Link to="/">Torna alla home</Link>
      </section>
    </main>
  );
}

export function TakenOver({ onResume }: { onResume: () => void }) {
  return (
    <main className="screen single">
      <section className="sheet">
        <h1>Il Taotl</h1>
        <p role="alert" data-testid="taken-over">Sei connesso da un'altra scheda</p>
        <button type="button" data-testid="btn-resume" onClick={onResume}>
          Riprendi qui
        </button>
      </section>
    </main>
  );
}

export function Room({ code }: { code: string }) {
  const { view, error, needsJoin, join, emit, takenOver, resume } = useRoom(code);
  if (takenOver) return <TakenOver onResume={resume} />;
  if (error === 'room-not-found' || error === 'game-started') return <Failure error={error} />;
  if (needsJoin) return <Join error={error} onJoin={join} />;
  if (error && !view) return <Failure error={error} />;
  if (!view) {
    return (
      <main className="screen single">
        <p className="table-note">Connessione…</p>
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
