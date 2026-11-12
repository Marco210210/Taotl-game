import { useCallback, useEffect, useState } from 'react';
import type { RoomView } from '@taotl/protocol';
import { getSocket, getToken, removeToken, request, setToken, type TypedEmit } from './socket';

const REJOIN_FAIL = ['bad-token', 'kicked'];

export function useRoom(code: string) {
  const [view, setView] = useState<RoomView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [takenOver, setTakenOver] = useState(false);
  const [needsJoin, setNeedsJoin] = useState(() => getToken(code) === null);

  useEffect(() => {
    const s = getSocket();
    const emit = request(s);
    const onState = (v: RoomView) => setView(v);
    const onKicked = () => {
      removeToken(code);
      setView(null);
      setError('kicked');
      setNeedsJoin(true);
    };
    const onDisconnect = (reason: string) => {
      if (reason === 'io server disconnect') setTakenOver(true);
    };
    const tryRejoin = async () => {
      setTakenOver(false);
      const token = getToken(code);
      if (!token) return setNeedsJoin(true);
      const r = await emit('room:join', { code, token });
      if (r.ok) {
        setError(null);
        setNeedsJoin(false);
      } else {
        setError(r.error);
        if (REJOIN_FAIL.includes(r.error)) {
          removeToken(code);
          setNeedsJoin(true);
        }
      }
    };
    s.on('room:state', onState);
    s.on('room:kicked', onKicked);
    s.on('connect', tryRejoin);
    s.on('disconnect', onDisconnect);
    if (s.connected) void tryRejoin();
    return () => {
      s.off('room:state', onState);
      s.off('room:kicked', onKicked);
      s.off('connect', tryRejoin);
      s.off('disconnect', onDisconnect);
    };
  }, [code]);

  const join = useCallback(
    async (nickname: string) => {
      const r = await request(getSocket())('room:join', { code, nickname });
      if (r.ok) {
        setToken(code, r.token);
        setError(null);
        setNeedsJoin(false);
      } else setError(r.error);
    },
    [code],
  );

  const emit: TypedEmit = useCallback((ev, ...args) => request(getSocket())(ev, ...args), []);

  const resume = useCallback(() => {
    getSocket().connect();
  }, []);

  return { view, error, needsJoin, join, emit, takenOver, resume };
}
