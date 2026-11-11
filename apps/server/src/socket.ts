import type { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@taotl/protocol';
import type { Failure, Res, Room } from './room';
import type { RoomManager } from './roomManager';

type IoServer = Server<ClientToServerEvents, ServerToClientEvents>;
type Sock = Socket<ClientToServerEvents, ServerToClientEvents>;
type Bound = { room: Room; playerId: string };

const BAD: Failure = { ok: false, error: 'bad-request' };
const NOT_IN_ROOM: Failure = { ok: false, error: 'not-in-room' };

const isObj = (p: unknown): p is Record<string, unknown> => typeof p === 'object' && p !== null;
const isStr = (v: unknown): v is string => typeof v === 'string';

export function attachSocket(io: IoServer, manager: RoomManager): void {
  io.on('connection', (socket: Sock) => {
    const bound = (): Bound | null => {
      const d = socket.data as { code?: string; playerId?: string };
      if (!d.code || !d.playerId) return null;
      const room = manager.get(d.code);
      return room ? { room, playerId: d.playerId } : null;
    };

    const unbind = () => {
      const b = bound();
      if (b) b.room.disconnect(b.playerId, socket.id);
      socket.data = {};
    };

    /** Registra un handler che risponde sempre con un ack, se il client lo ha passato. */
    const on = (ev: string, fn: (payload: unknown) => Res<object>) => {
      (socket as unknown as { on: (e: string, h: (...a: unknown[]) => void) => void }).on(ev, (...args) => {
        const ack = args[args.length - 1];
        const payload = args.length > 1 ? args[0] : undefined;
        let res: unknown;
        try {
          res = fn(payload);
        } catch (e) {
          console.error(`Errore nel gestore ${ev}`, e);
          res = BAD;
        }
        if (typeof ack === 'function') (ack as (r: unknown) => void)(res);
      });
    };

    const bind = (room: Room, playerId: string) => {
      const old = room.seats.find((s) => s.id === playerId)?.socketId;
      socket.data = { code: room.code, playerId };
      // prima il nuovo socket, poi si chiude il vecchio: la sua disconnect non avra effetto
      room.connect(playerId, socket.id);
      if (old && old !== socket.id) io.sockets.sockets.get(old)?.disconnect(true);
    };

    on('room:create', (p) => {
      if (!isObj(p) || !isStr(p.nickname)) return BAD;
      unbind();
      const r = manager.createRoom(p.nickname);
      if (!r.ok) return r;
      bind(r.room, r.playerId);
      return { ok: true, code: r.room.code, token: r.token };
    });

    on('room:join', (p) => {
      if (!isObj(p) || !isStr(p.code)) return BAD;
      if (p.nickname !== undefined && !isStr(p.nickname)) return BAD;
      if (p.token !== undefined && !isStr(p.token)) return BAD;
      unbind();
      const room = manager.get(p.code);
      if (!room) return { ok: false, error: 'room-not-found' };
      const r = room.join(p.nickname, p.token);
      if (!r.ok) return r;
      bind(room, r.playerId);
      return { ok: true, token: r.token };
    });

    const guarded = (ev: string, fn: (b: Bound, p: unknown) => Res<object>) =>
      on(ev, (p) => {
        const b = bound();
        return b ? fn(b, p) : NOT_IN_ROOM;
      });

    guarded('lobby:reorder', (b, p) =>
      isObj(p) && Array.isArray(p.order) && p.order.every(isStr) ? b.room.reorder(b.playerId, p.order) : BAD,
    );
    guarded('lobby:kick', (b, p) => (isObj(p) && isStr(p.playerId) ? b.room.kick(b.playerId, p.playerId) : BAD));
    guarded('lobby:addBot', (b) => b.room.addBot(b.playerId));
    guarded('game:start', (b) => b.room.start(b.playerId));
    guarded('game:intent', (b, p) => b.room.intent(b.playerId, p));
    guarded('game:nextHand', (b) => b.room.nextHand(b.playerId));
    guarded('host:decision', (b, p) =>
      isObj(p) && isStr(p.choice) ? b.room.hostDecision(b.playerId, p.choice as 'wait' | 'bot' | 'end') : BAD,
    );
    guarded('game:rematch', (b) => b.room.rematch(b.playerId));

    socket.on('disconnect', () => {
      const b = bound();
      if (b) b.room.disconnect(b.playerId, socket.id);
    });
  });
}
