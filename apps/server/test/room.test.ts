import { describe, expect, it, vi } from 'vitest';
import { Room, type RoomDeps } from '../src/room';
import { RoomManager } from '../src/roomManager';
import { roomViewFor } from '../src/roomView';
import { loadConfig } from '../src/config';
import { newRoomCode, newToken, newPlayerId, cryptoRng, ROOM_CODE_ALPHABET } from '../src/tokens';

function mk(over: Partial<RoomDeps> = {}) {
  let t = 1000;
  const onChange = vi.fn();
  const deps: RoomDeps = {
    rng: () => 0,
    now: () => t,
    setTimer: () => () => {},
    cfg: loadConfig({}),
    onChange,
    ...over,
  };
  const room = new Room('ABCD', deps);
  return { room, onChange, setNow: (n: number) => (t = n) };
}
function joined(room: Room, nick: string) {
  const r = room.join(nick);
  if (!r.ok) throw new Error(r.error);
  return r;
}

describe('config', () => {
  it('default e override', () => {
    expect(loadConfig({})).toEqual({
      port: 3000,
      botMoveDelayMs: 800,
      trickPauseMs: 2000,
      disconnectGraceMs: 120000,
      roomIdleMs: 1800000,
    });
    expect(loadConfig({ PORT: '4000', ROOM_IDLE_MS: '5' }).port).toBe(4000);
    expect(loadConfig({ PORT: 'x' }).port).toBe(3000);
  });
});

describe('tokens', () => {
  it('codice stanza', () => {
    for (let i = 0; i < 200; i++) {
      const c = newRoomCode();
      expect(c).toHaveLength(4);
      for (const ch of c) expect(ROOM_CODE_ALPHABET).toContain(ch);
    }
  });
  it('token, id, rng', () => {
    expect(newToken()).toMatch(/^[0-9a-f]{32}$/);
    expect(newPlayerId()).not.toBe(newToken());
    const x = cryptoRng();
    expect(x >= 0 && x < 1).toBe(true);
  });
});

describe('Room lobby', () => {
  it('il creatore è host e primo posto', () => {
    const { room } = mk();
    const a = joined(room, 'Anna');
    expect(room.hostId).toBe(a.playerId);
    expect(room.seats[0]?.id).toBe(a.playerId);
  });
  it('join col token restituisce lo stesso playerId', () => {
    const { room } = mk();
    const a = joined(room, 'Anna');
    const again = room.join('Altro', a.token);
    expect(again).toEqual({ ok: true, token: a.token, playerId: a.playerId });
    expect(room.seats).toHaveLength(1);
  });
  it('nickname: trim, lunghezza, duplicati case-insensitive', () => {
    const { room } = mk();
    joined(room, ' Anna ');
    expect(room.seats[0]?.nickname).toBe('Anna');
    expect(room.join('anna')).toEqual({ ok: false, error: 'nickname-taken' });
    expect(room.join('   ')).toEqual({ ok: false, error: 'invalid-nickname' });
    expect(room.join('x'.repeat(17))).toEqual({ ok: false, error: 'invalid-nickname' });
    expect(room.join('x'.repeat(16)).ok).toBe(true);
  });
  it('senza nickname né token valido: bad-token', () => {
    const { room } = mk();
    expect(room.join(undefined, 'nope')).toEqual({ ok: false, error: 'bad-token' });
  });
  it('13° posto: room-full', () => {
    const { room } = mk();
    for (let i = 0; i < 12; i++) joined(room, `P${i}`);
    expect(room.join('P12')).toEqual({ ok: false, error: 'room-full' });
  });
  it('addBot: crea posti bot e rispetta il limite', () => {
    const { room } = mk();
    const a = joined(room, 'Anna');
    expect(room.addBot(a.playerId).ok).toBe(true);
    expect(room.addBot(a.playerId).ok).toBe(true);
    const bots = room.seats.filter((s) => s.isBot);
    expect(bots.map((b) => b.nickname)).toEqual(['Bot 1', 'Bot 2']);
    expect(bots.every((b) => b.connected)).toBe(true);
    for (let i = 0; i < 9; i++) expect(room.addBot(a.playerId).ok).toBe(true);
    expect(room.addBot(a.playerId)).toEqual({ ok: false, error: 'room-full' });
  });
  it('addBot: non host', () => {
    const { room } = mk();
    joined(room, 'Anna');
    const b = joined(room, 'Bea');
    expect(room.addBot(b.playerId)).toEqual({ ok: false, error: 'not-host' });
  });
  it('bot rimosso libera il numero più basso', () => {
    const { room } = mk();
    const a = joined(room, 'Anna');
    room.addBot(a.playerId);
    room.addBot(a.playerId);
    const b1 = room.seats.find((s) => s.nickname === 'Bot 1')!;
    expect(room.kick(a.playerId, b1.id).ok).toBe(true);
    room.addBot(a.playerId);
    expect(room.seats.map((s) => s.nickname)).toContain('Bot 1');
  });
  it('reorder', () => {
    const { room } = mk();
    const a = joined(room, 'Anna');
    const b = joined(room, 'Bea');
    const c = joined(room, 'Cia');
    expect(room.reorder(a.playerId, [c.playerId, a.playerId, b.playerId]).ok).toBe(true);
    expect(room.seats.map((s) => s.id)).toEqual([c.playerId, a.playerId, b.playerId]);
    expect(room.reorder(a.playerId, [a.playerId, b.playerId])).toEqual({ ok: false, error: 'bad-order' });
    expect(room.reorder(a.playerId, [a.playerId, a.playerId, b.playerId])).toEqual({ ok: false, error: 'bad-order' });
    expect(room.reorder(b.playerId, [a.playerId, b.playerId, c.playerId])).toEqual({ ok: false, error: 'not-host' });
  });
  it('kick: umano blacklisted, non se stessi, solo host', () => {
    const { room } = mk();
    const a = joined(room, 'Anna');
    const b = joined(room, 'Bea');
    expect(room.kick(b.playerId, a.playerId)).toEqual({ ok: false, error: 'not-host' });
    expect(room.kick(a.playerId, a.playerId)).toEqual({ ok: false, error: 'bad-player' });
    expect(room.kick(a.playerId, 'zzz')).toEqual({ ok: false, error: 'bad-player' });
    expect(room.kick(a.playerId, b.playerId).ok).toBe(true);
    expect(room.seats).toHaveLength(1);
    expect(room.join('Bea', b.token)).toEqual({ ok: false, error: 'kicked' });
    expect(room.playerIdForToken(b.token)).toBeNull();
  });
  it('start: errori', () => {
    const { room } = mk();
    const a = joined(room, 'Anna');
    expect(room.start(a.playerId)).toEqual({ ok: false, error: 'bad-player-count' });
    const b = joined(room, 'Bea');
    expect(room.start(b.playerId)).toEqual({ ok: false, error: 'not-host' });
  });
  it('start sceglie il mazziere con rng e poi la lobby è chiusa', () => {
    const { room, onChange } = mk({ rng: () => 0.7 });
    const a = joined(room, 'Anna');
    const b = joined(room, 'Bea');
    const c = joined(room, 'Cia');
    onChange.mockClear();
    expect(room.start(a.playerId).ok).toBe(true);
    expect(room.status).toBe('playing');
    expect(room.game?.players.map((p) => p.id)).toEqual([a.playerId, b.playerId, c.playerId]);
    expect(room.game?.dealerIndex).toBe(2);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(roomViewFor(room, a.playerId).game?.dealerId).toBe(c.playerId);
    expect(room.join('Dino')).toEqual({ ok: false, error: 'game-started' });
    expect(room.join('Dino', 'tokenfinto')).toEqual({ ok: false, error: 'game-started' });
    expect(room.join('x', a.token)).toEqual({ ok: true, token: a.token, playerId: a.playerId });
    expect(room.addBot(a.playerId)).toEqual({ ok: false, error: 'game-started' });
    expect(room.kick(a.playerId, b.playerId)).toEqual({ ok: false, error: 'game-started' });
    expect(room.reorder(a.playerId, [c.playerId, b.playerId, a.playerId])).toEqual({
      ok: false,
      error: 'game-started',
    });
  });
  it('kicked ha precedenza anche a partita iniziata', () => {
    const { room } = mk();
    const a = joined(room, 'Anna');
    const b = joined(room, 'Bea');
    room.kick(a.playerId, b.playerId);
    joined(room, 'Cia');
    room.start(a.playerId);
    expect(room.join('Bea', b.token)).toEqual({ ok: false, error: 'kicked' });
  });
  it('onChange chiamato su ogni mutazione riuscita, non sugli errori', () => {
    const { room, onChange } = mk();
    const a = joined(room, 'Anna');
    expect(onChange).toHaveBeenCalledTimes(1);
    room.addBot('zz');
    expect(onChange).toHaveBeenCalledTimes(1);
    room.addBot(a.playerId);
    expect(onChange).toHaveBeenCalledTimes(2);
  });
});

describe('connessioni', () => {
  it('connect/disconnect con socket id e lastHumanSeenAt', () => {
    const { room, setNow } = mk();
    const a = joined(room, 'Anna');
    expect(room.hasConnectedHumans()).toBe(false);
    setNow(2000);
    room.connect(a.playerId, 's1');
    expect(room.hasConnectedHumans()).toBe(true);
    expect(room.lastHumanSeenAt).toBe(2000);
    room.connect(a.playerId, 's2');
    room.disconnect(a.playerId, 's1');
    expect(room.hasConnectedHumans()).toBe(true);
    setNow(3000);
    room.disconnect(a.playerId, 's2');
    expect(room.hasConnectedHumans()).toBe(false);
    expect(room.lastHumanSeenAt).toBe(3000);
  });
  it('i bot non contano come umani connessi', () => {
    const { room } = mk();
    const a = joined(room, 'Anna');
    room.addBot(a.playerId);
    expect(room.hasConnectedHumans()).toBe(false);
  });
});

describe('roomViewFor', () => {
  it('niente token né socket id; game null in lobby', () => {
    const { room } = mk();
    const a = joined(room, 'Anna');
    const b = joined(room, 'Bea');
    room.connect(a.playerId, 'sock-secret-1');
    const v = roomViewFor(room, a.playerId);
    expect(v).toMatchObject({
      code: 'ABCD',
      me: a.playerId,
      hostId: a.playerId,
      status: 'lobby',
      game: null,
      pause: null,
    });
    expect(v.seats[0]).toEqual({
      id: a.playerId,
      nickname: 'Anna',
      isBot: false,
      connected: true,
      botControlled: false,
    });
    room.start(a.playerId);
    const json = JSON.stringify(roomViewFor(room, b.playerId));
    expect(json).not.toContain(a.token);
    expect(json).not.toContain(b.token);
    expect(json).not.toContain('sock-secret-1');
    expect(roomViewFor(room, b.playerId).game?.me).toBe(b.playerId);
  });
});

describe('RoomManager', () => {
  const mkMgr = (now: () => number) =>
    new RoomManager({
      rng: () => 0,
      now,
      setTimer: () => () => {},
      cfg: loadConfig({ ROOM_IDLE_MS: '1000' }),
      onChange: () => {},
    });
  it('createRoom, get e errore nickname', () => {
    const m = mkMgr(() => 0);
    const r = m.createRoom('Anna');
    if (!r.ok) throw new Error('atteso ok');
    expect(m.get(r.room.code)).toBe(r.room);
    expect(r.room.hostId).toBe(r.playerId);
    expect(m.createRoom('')).toEqual({ ok: false, error: 'invalid-nickname' });
    expect(m.get('ZZZZ')).toBeUndefined();
  });
  it('sweep elimina solo le stanze vuote da più di ROOM_IDLE_MS', () => {
    let t = 0;
    const m = mkMgr(() => t);
    const idle = m.createRoom('A');
    const live = m.createRoom('B');
    const recent = m.createRoom('C');
    if (!(idle.ok && live.ok && recent.ok)) throw new Error('atteso ok');
    live.room.connect(live.playerId, 's');
    t = 5000;
    recent.room.connect(recent.playerId, 's');
    recent.room.disconnect(recent.playerId, 's');
    t = 5500;
    m.sweep(t);
    expect(m.get(idle.room.code)).toBeUndefined();
    expect(m.get(live.room.code)).toBeDefined();
    expect(m.get(recent.room.code)).toBeDefined();
    m.sweep(6001);
    expect(m.get(recent.room.code)).toBeUndefined();
    expect(m.get(live.room.code)).toBeDefined();
  });
});
