import { useCallback, useEffect, useRef, useState } from 'react';
import type { RoomView } from '@taotl/protocol';
import { getSocket, getToken, removeToken, request, setToken, type AppSocket, type TypedEmit } from './socket';

const REJOIN_FAIL = ['bad-token', 'kicked'];
/** Oltre questo tempo senza risposta, al ritorno in primo piano la connessione si considera morta. */
const PROBE_MS = 2500;

/** Chiude e riapre subito la connessione, saltando l'attesa crescente dei tentativi automatici. */
function reconnectNow(s: AppSocket) {
  s.disconnect();
  s.connect();
}

export function useRoom(code: string) {
  const [view, setView] = useState<RoomView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [takenOver, setTakenOver] = useState(false);
  const [needsJoin, setNeedsJoin] = useState(() => getToken(code) === null);
  const [connected, setConnected] = useState(() => getSocket().connected);
  const takenOverRef = useRef(false);

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
      setConnected(false);
      if (reason === 'io server disconnect') {
        takenOverRef.current = true;
        setTakenOver(true);
      }
    };
    const tryRejoin = async () => {
      setConnected(true);
      takenOverRef.current = false;
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

    /**
     * Ritorno in primo piano (es. da WhatsApp), focus o rete di nuovo disponibile: riconnessione
     * immediata e automatica, senza schermate. Se il socket sembra connesso ma era morto in background,
     * lo scopre una sonda con timeout (un rientro col token, innocuo sullo stesso posto).
     */
    let lastWake = 0;
    const wake = () => {
      if (document.visibilityState === 'hidden' || takenOverRef.current) return;
      const now = Date.now();
      if (now - lastWake < 1000) return;
      lastWake = now;
      if (!s.connected) return reconnectNow(s);
      const token = getToken(code);
      if (!token) return;
      (s.timeout(PROBE_MS) as unknown as { emit: (e: string, p: unknown, cb: (err: unknown) => void) => void }).emit(
        'room:join',
        { code, token },
        (err) => {
          if (err && !takenOverRef.current) reconnectNow(s);
        },
      );
    };
    const onPageShow = (e: PageTransitionEvent) => e.persisted && wake();

    s.on('room:state', onState);
    s.on('room:kicked', onKicked);
    s.on('connect', tryRejoin);
    s.on('disconnect', onDisconnect);
    document.addEventListener('visibilitychange', wake);
    window.addEventListener('focus', wake);
    window.addEventListener('online', wake);
    window.addEventListener('pageshow', onPageShow);
    if (s.connected) void tryRejoin();
    return () => {
      s.off('room:state', onState);
      s.off('room:kicked', onKicked);
      s.off('connect', tryRejoin);
      s.off('disconnect', onDisconnect);
      document.removeEventListener('visibilitychange', wake);
      window.removeEventListener('focus', wake);
      window.removeEventListener('online', wake);
      window.removeEventListener('pageshow', onPageShow);
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

  return { view, error, needsJoin, join, emit, takenOver, resume, connected };
}
