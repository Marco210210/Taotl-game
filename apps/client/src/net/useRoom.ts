import { useCallback, useEffect, useState } from 'react';
import type { ClientToServerEvents, RoomView } from '@taotl/protocol';
import { getSocket, getToken, request, setToken } from './socket';

const REJOIN_FAIL = ['bad-token', 'kicked'];

export function useRoom(code: string) {
  const [view, setView] = useState<RoomView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsJoin, setNeedsJoin] = useState(() => getToken(code) === null);

  useEffect(() => {
    const s = getSocket();
    const onState = (v: RoomView) => setView(v);
    const tryRejoin = async () => {
      const token = getToken(code);
      if (!token) return setNeedsJoin(true);
      const r = await request<{ token: string }>(s, 'room:join', { code, token });
      if (r.ok) {
        setError(null);
        setNeedsJoin(false);
      } else {
        setError(r.error);
        if (REJOIN_FAIL.includes(r.error)) setNeedsJoin(true);
      }
    };
    s.on('room:state', onState);
    s.on('connect', tryRejoin);
    if (s.connected) void tryRejoin();
    return () => {
      s.off('room:state', onState);
      s.off('connect', tryRejoin);
    };
  }, [code]);

  const join = useCallback(
    async (nickname: string) => {
      const r = await request<{ token: string }>(getSocket(), 'room:join', { code, nickname });
      if (r.ok) {
        setToken(code, r.token);
        setError(null);
        setNeedsJoin(false);
      } else setError(r.error);
    },
    [code],
  );

  const emit = useCallback(
    (ev: keyof ClientToServerEvents, ...args: unknown[]) => request(getSocket(), ev, ...args),
    [],
  );

  return { view, error, needsJoin, join, emit };
}
