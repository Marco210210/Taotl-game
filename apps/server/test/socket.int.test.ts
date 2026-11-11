import { afterEach, describe, expect, it } from 'vitest';
import { io as connect, type Socket } from 'socket.io-client';
import { botMove, cardId } from '@taotl/engine';
import type { ClientToServerEvents, RoomView, ServerToClientEvents } from '@taotl/protocol';
import { createApp } from '../src/app';
import { loadConfig } from '../src/config';

type Client = Socket<ServerToClientEvents, ClientToServerEvents> & { latest: RoomView | null };
type AckRes = { ok: boolean; error?: string; code?: string; token?: string };

const cfg = { ...loadConfig({}), port: 0, botMoveDelayMs: 0, trickPauseMs: 0 };

let app: ReturnType<typeof createApp>;
let clients: Client[] = [];

async function boot(): Promise<string> {
  app = createApp(cfg);
  await new Promise<void>((r) => app.httpServer.listen(0, r));
  const addr = app.httpServer.address();
  if (typeof addr !== 'object' || addr === null) throw new Error('no address');
  return `http://localhost:${addr.port}`;
}

function open(url: string): Promise<Client> {
  const s = connect(url, { transports: ['websocket'], forceNew: true }) as Client;
  s.latest = null;
  s.on('room:state', (v) => {
    s.latest = v;
  });
  clients.push(s);
  return new Promise((res, rej) => {
    s.on('connect', () => res(s));
    s.on('connect_error', rej);
  });
}

function rawEmit(s: Client, ev: string, ...args: unknown[]): void {
  (s as unknown as { emit: (...a: unknown[]) => void }).emit(ev, ...args);
}

function emitAck(s: Client, ev: string, ...args: unknown[]): Promise<AckRes> {
  return new Promise((res) => rawEmit(s, ev, ...args, res));
}

async function waitFor(s: Client, pred: (v: RoomView) => boolean, ms = 8000): Promise<RoomView> {
  const start = Date.now();
  while (Date.now() - start < ms) {
    if (s.latest && pred(s.latest)) return s.latest;
    await new Promise((r) => setTimeout(r, 5));
  }
  throw new Error('timeout waiting for state');
}

afterEach(async () => {
  for (const c of clients) c.close();
  clients = [];
  await app?.close();
});

describe('Socket.IO', () => {
  it('due client: create + join + start, giocano fino a status ended con gli stessi totali, senza leak', async () => {
    const url = await boot();
    const a = await open(url);
    const b = await open(url);
    const created = await emitAck(a, 'room:create', { nickname: 'Anna' });
    expect(created.ok).toBe(true);
    const code = created.code as string;
    expect((await emitAck(b, 'room:join', { code, nickname: 'Beppe' })).ok).toBe(true);
    // dopo create/join il socket riceve subito lo stato, con il proprio posto connesso
    const first = await waitFor(a, (v) => v.seats.length === 2 && v.seats.every((s) => s.connected));
    expect(first.hostId).toBe(first.me);
    await waitFor(b, (v) => v.seats.length === 2);

    let checks = 0;
    const checkLeak = (viewer: Client, other: Client, v: RoomView) => {
      const g = app.manager.get(code)?.game;
      if (!g || !v.game || !other.latest) return;
      // le mani si svuotano soltanto: il confronto e valido a parita di mano
      if (g.handNumber !== v.game.handNumber) return;
      const otherId = other.latest.me;
      const otherHand = g.players.find((p) => p.id === otherId)?.hand ?? [];
      const json = JSON.stringify(v);
      for (const card of otherHand) expect(json.includes(cardId(card))).toBe(false);
      checks++;
      void viewer;
    };

    const play = (c: Client, other: Client, host: boolean) => {
      c.on('room:state', (v) => {
        checkLeak(c, other, v);
        const g = v.game;
        if (!g) return;
        if (g.turnId === v.me && (g.phase === 'bidding' || g.phase === 'playing')) {
          rawEmit(c, 'game:intent', botMove(g), () => {});
        } else if (host && g.phase === 'handEnd') {
          rawEmit(c, 'game:nextHand', () => {});
        }
      });
    };
    play(a, b, true);
    play(b, a, false);

    expect((await emitAck(a, 'game:start')).ok).toBe(true);
    const endA = await waitFor(a, (v) => v.status === 'ended', 30000);
    const endB = await waitFor(b, (v) => v.status === 'ended', 30000);
    expect(endA.game?.phase).toBe('gameOver');
    expect(endA.game?.players.map((p) => p.total)).toEqual(endB.game?.players.map((p) => p.total));
    expect(checks).toBeGreaterThan(10);
  }, 40000);

  it('riconnessione: B chiude il socket e ne riapre uno con room:join {code, token}', async () => {
    const url = await boot();
    const a = await open(url);
    const b = await open(url);
    const code = (await emitAck(a, 'room:create', { nickname: 'Anna' })).code as string;
    const j = await emitAck(b, 'room:join', { code, nickname: 'Beppe' });
    const bId = (await waitFor(b, (v) => v.seats.length === 2)).me;
    b.close();
    await waitFor(a, (v) => v.seats.some((s) => s.id === bId && !s.connected));
    const b2 = await open(url);
    const r = await emitAck(b2, 'room:join', { code, token: j.token });
    expect(r.ok).toBe(true);
    const v = await waitFor(b2, (x) => x.seats.length === 2);
    expect(v.me).toBe(bId);
    await waitFor(a, (x) => x.seats.some((s) => s.id === bId && s.connected));
  });

  it('stesso token su due socket: il primo viene chiuso, il posto resta connected', async () => {
    const url = await boot();
    const a = await open(url);
    const b = await open(url);
    const code = (await emitAck(a, 'room:create', { nickname: 'Anna' })).code as string;
    const j = await emitAck(b, 'room:join', { code, nickname: 'Beppe' });
    const bId = (await waitFor(b, (v) => v.seats.length === 2)).me;
    const closed = new Promise<void>((res) => b.on('disconnect', () => res()));
    const b2 = await open(url);
    expect((await emitAck(b2, 'room:join', { code, token: j.token })).ok).toBe(true);
    await closed;
    await new Promise((r) => setTimeout(r, 100));
    const seat = app.manager.get(code)?.seats.find((s) => s.id === bId);
    expect(seat?.connected).toBe(true);
    expect(seat?.socketId).toBe(b2.id);
    expect(a.latest?.seats.find((s) => s.id === bId)?.connected).toBe(true);
  });

  it('room:join su codice inesistente: room-not-found', async () => {
    const url = await boot();
    const a = await open(url);
    expect(await emitAck(a, 'room:join', { code: 'ZZZZ', nickname: 'X' })).toEqual({
      ok: false,
      error: 'room-not-found',
    });
  });

  it('payload non valido o socket non associato: bad-request / not-in-room', async () => {
    const url = await boot();
    const a = await open(url);
    expect(await emitAck(a, 'room:create', { nickname: 5 })).toEqual({ ok: false, error: 'bad-request' });
    expect(await emitAck(a, 'room:join', null)).toEqual({ ok: false, error: 'bad-request' });
    expect(await emitAck(a, 'game:start')).toEqual({ ok: false, error: 'not-in-room' });
    await emitAck(a, 'room:create', { nickname: 'Anna' });
    expect(await emitAck(a, 'lobby:reorder', { order: 'x' })).toEqual({ ok: false, error: 'bad-request' });
    expect(await emitAck(a, 'host:decision', { choice: 3 })).toEqual({ ok: false, error: 'bad-request' });
  });
});
