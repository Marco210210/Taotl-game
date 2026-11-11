import { useState } from 'react';
import { errorMessage } from '../lib/errors';

export function Join({ error, onJoin }: { error: string | null; onJoin: (nickname: string) => void }) {
  const [nickname, setNickname] = useState('');
  return (
    <main className="screen">
      <h1>Entra nella stanza</h1>
      <label>
        Nickname
        <input data-testid="input-nickname" value={nickname} maxLength={16} onChange={(e) => setNickname(e.target.value)} />
      </label>
      <button data-testid="btn-join" onClick={() => onJoin(nickname)}>
        Entra
      </button>
      {error && <p role="alert">{errorMessage(error)}</p>}
    </main>
  );
}
