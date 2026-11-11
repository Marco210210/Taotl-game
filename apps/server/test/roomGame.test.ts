import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { botMove, viewFor, type PlayerId } from '@taotl/engine';
import { Room, type RoomDeps } from '../src/room';
import { RoomManager } from '../src/roomManager';
import { roomViewFor } from '../src/roomView';
import { loadConfig } from '../src/config';

const cfg = loadConfig({});
const BOT = cfg.botMoveDelayMs;
const PAUSE = cfg.trickPauseMs;
const GRACE = cfg.disconnectGraceMs;

function mk(over: Partial<RoomDeps> = {}) {
  const onChange = vi.fn();
  const deps: RoomDeps = {
    rng: () => 0.3,
    now: () => Date.now(),
    setTimer: (fn, ms) => {
      const t = setTimeout(fn, ms);
      return () => clearTimeout(t);
    },
    cfg,
    onChange,
    ...over,
  };
  return { room: new Room('ABCD', deps), onChange };
}

/** Stanza con n umani connessi (host = primo) e partita avviata. */
function started(humans: number, bots = 0) {
  const ctx = mk();
  const ids: PlayerId[] = [];
  for (let i = 0; i < humans; i++) {
    const r = ctx.room.join(`P${i}`);
    if (!r.ok) throw new Error(r.error);
    ctx.room.connect(r.playerId, `s${i}`);
    ids.push(r.playerId);
  }
  for (let i = 0; i < bots; i++) ctx.room.addBot(ids[0] as PlayerId);
  expect(ctx.room.start(ids[0] as PlayerId).ok).toBe(true);
  return { ...ctx, ids };
}

const turnId = (room: Room) => room.game!.players[room.game!.turnIndex]!.id;
const view = (room: Room, id: PlayerId) => viewFor(room.game!, id);

/** Fa giocare con botMove il giocatore di turno (usato per gli umani nei test). */
function humanMove(room: Room, id: PlayerId) {
  return room.intent(id, botMove(view(room, id)));
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('intent', () => {
  it('forma non valida -> bad-intent, stato invariato', () => {
    const { room, ids } = started(2);
    const before = room.game;
    const t = turnId(room);
    for (const bad of [
      null,
      42,
      { type: 'x' },
      { type: 'bid' },
      { type: 'bid', value: '1' },
      { type: 'play' },
      { type: 'play', cardId: 5 },
      { type: 'play', cardId: 'a', declareChipetl: null },
      { type: 'play', cardId: 'a', declareChipetl: 'si' },
    ]) {
      expect(room.intent(t, bad)).toEqual({ ok: false, error: 'bad-intent' });
    }
    expect(room.game).toBe(before);
    expect(ids).toHaveLength(2);
  });

  it('illegale -> errore del motore, stato invariato; fuori turno rifiutato', () => {
    const { room, ids } = started(2);
    const t = turnId(room);
    const other = ids.find((i) => i !== t) as PlayerId;
    const before = room.game;
    expect(room.intent(other, { type: 'bid', value: 0 })).toEqual({ ok: false, error: 'not-your-turn' });
    expect(room.intent(t, { type: 'bid', value: 99 })).toEqual({ ok: false, error: 'illegal-bid' });
    expect(room.intent(t, { type: 'play', cardId: 'x' })).toEqual({ ok: false, error: 'wrong-phase' });
    expect(room.game).toBe(before);
  });

  it('due play rapidi della stessa carta: il secondo e rifiutato', () => {
    const { room } = started(2);
    // dichiarazioni
    while (room.game!.phase === 'bidding') humanMove(room, turnId(room));
    const t = turnId(room);
    const intent = botMove(view(room, t));
    expect(room.intent(t, intent).ok).toBe(true);
    const second = room.intent(t, intent);
    expect(second.ok).toBe(false);
    expect(room.game!.currentTrick.filter((c) => c.playerId === t)).toHaveLength(1);
  });

  it('rifiuta intent di bot, botControlled, in lobby', () => {
    const lobby = mk();
    const a = lobby.room.join('Anna');
    if (!a.ok) throw new Error();
    expect(lobby.room.intent(a.playerId, { type: 'bid', value: 0 })).toEqual({ ok: false, error: 'wrong-phase' });
    const { room, ids } = started(1, 1);
    const bot = room.seats.find((s) => s.isBot)!;
    expect(room.intent(bot.id, { type: 'bid', value: 0 }).ok).toBe(false);
    room.seats.find((s) => s.id === ids[0])!.botControlled = true;
    expect(room.intent(ids[0] as PlayerId, { type: 'bid', value: 0 })).toEqual({ ok: false, error: 'not-your-turn' });
  });
});

describe('timer', () => {
  it('advance solo dopo TRICK_PAUSE_MS dall ultima carta della presa', () => {
    const { room } = started(2);
    while (room.game!.phase === 'bidding') humanMove(room, turnId(room));
    while (room.game!.phase === 'playing') humanMove(room, turnId(room));
    expect(room.game!.phase).toBe('trickEnd');
    vi.advanceTimersByTime(PAUSE - 1);
    expect(room.game!.phase).toBe('trickEnd');
    vi.advanceTimersByTime(1);
    expect(room.game!.phase).not.toBe('trickEnd');
  });

  it('un bot gioca dopo BOT_MOVE_DELAY_MS, non prima', () => {
    const { room, ids } = started(1, 1);
    const bot = room.seats.find((s) => s.isBot)!;
    // porta il turno al bot
    if (turnId(room) !== bot.id) {
      humanMove(room, ids[0] as PlayerId);
    }
    expect(turnId(room)).toBe(bot.id);
    const bids = () => room.game!.players.find((p) => p.id === bot.id)!.bid;
    expect(bids()).toBeNull();
    vi.advanceTimersByTime(BOT - 1);
    expect(bids()).toBeNull();
    vi.advanceTimersByTime(1);
    expect(bids()).not.toBeNull();
  });

  it('onChange a ogni azione di timer', () => {
    const { room, onChange, ids } = started(1, 1);
    const bot = room.seats.find((s) => s.isBot)!;
    if (turnId(room) !== bot.id) humanMove(room, ids[0] as PlayerId);
    onChange.mockClear();
    vi.advanceTimersByTime(BOT);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('dispose annulla i timer', () => {
    const { room, ids } = started(1, 1);
    const bot = room.seats.find((s) => s.isBot)!;
    if (turnId(room) !== bot.id) humanMove(room, ids[0] as PlayerId);
    room.dispose();
    vi.advanceTimersByTime(BOT * 3);
    expect(room.game!.players.find((p) => p.id === bot.id)!.bid).toBeNull();
  });

  it('RoomManager.sweep chiama dispose sulle stanze eliminate', () => {
    let t = 0;
    const m = new RoomManager({
      rng: () => 0,
      now: () => t,
      setTimer: () => () => {},
      cfg: loadConfig({ ROOM_IDLE_MS: '10' }),
      onChange: () => {},
    });
    const r = m.createRoom('A');
    if (!r.ok) throw new Error();
    const spy = vi.spyOn(r.room, 'dispose');
    t = 100;
    m.sweep(t);
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe('pause e decisioni dell host', () => {
  /** 3 umani; disconnette un non-host e porta il turno a lui o lo lascia. */
  function setup() {
    const ctx = started(3);
    const host = ctx.ids[0] as PlayerId;
    const victim = ctx.ids[1] as PlayerId;
    return { ...ctx, host, victim };
  }
  /** Fa giocare gli altri finche tocca a `target`. */
  function untilTurnOrPause(room: Room, target: PlayerId) {
    let guard = 0;
    while (turnId(room) !== target && guard++ < 20) {
      humanMove(room, turnId(room));
    }
  }


  it('disconnesso ma non di turno -> nessuna pausa; al suo turno -> pause.waitingFor', () => {
    const { room, victim, host } = setup();
    // Si disconnette l'umano che NON e di turno ora.
    const notTurn = turnId(room) === victim ? (host as PlayerId) : victim;
    room.disconnect(notTurn, notTurn === victim ? 's1' : 's0');
    expect(turnId(room)).not.toBe(notTurn);
    expect(room.pauseInfo()).toBeNull();
    const viewer = room.seats.find((x) => x.connected && !x.isBot)!.id;
    expect(roomViewFor(room, viewer).pause).toBeNull();
    untilTurnOrPause(room, notTurn);
    expect(turnId(room)).toBe(notTurn);
    expect(roomViewFor(room, viewer).pause).toEqual({ waitingFor: notTurn, hostCanDecide: false });
  });

  it('hostDecision prima della grazia -> rifiutata; dopo -> bot gioca il turno in sospeso', () => {
    const { room, victim, host, onChange } = setup();
    room.disconnect(victim, 's1');
    untilTurnOrPause(room, victim);
    expect(room.hostDecision(host, 'bot')).toEqual({ ok: false, error: 'no-pause' });
    vi.advanceTimersByTime(GRACE - 1);
    expect(room.pauseInfo()?.hostCanDecide).toBe(false);
    onChange.mockClear();
    vi.advanceTimersByTime(1);
    expect(room.pauseInfo()?.hostCanDecide).toBe(true);
    expect(onChange).toHaveBeenCalledTimes(1); // timer di grazia
    expect(room.hostDecision(host, 'wait')).toEqual({ ok: true });
    expect(room.pauseInfo()?.hostCanDecide).toBe(true);
    expect(room.hostDecision(victim, 'bot')).toEqual({ ok: false, error: 'not-host' });
    expect(room.hostDecision(host, 'bot')).toEqual({ ok: true });
    expect(room.seats.find((s) => s.id === victim)!.botControlled).toBe(true);
    expect(room.pauseInfo()).toBeNull();
    const before = room.game;
    vi.advanceTimersByTime(BOT);
    expect(room.game).not.toBe(before);
    expect(room.game!.players.find((p) => p.id === victim)!.bid).not.toBeNull();
  });

  it('il giocatore rientra mentre il bot sostituto ha una mossa in timer -> il timer non gioca', () => {
    const { room, victim, host } = setup();
    room.disconnect(victim, 's1');
    untilTurnOrPause(room, victim);
    vi.advanceTimersByTime(GRACE);
    room.hostDecision(host, 'bot');
    const before = room.game;
    room.connect(victim, 's1b');
    expect(room.seats.find((s) => s.id === victim)!.botControlled).toBe(false);
    vi.advanceTimersByTime(BOT * 3);
    expect(room.game).toBe(before);
  });

  it('end -> status ended e ranking con i totali attuali', () => {
    const { room, victim, host } = setup();
    room.disconnect(victim, 's1');
    untilTurnOrPause(room, victim);
    vi.advanceTimersByTime(GRACE);
    const totals = room.game!.players.map((p) => p.total);
    expect(room.hostDecision(host, 'end')).toEqual({ ok: true });
    expect(room.status).toBe('ended');
    expect(room.game!.phase).toBe('gameOver');
    expect(room.game!.players.map((p) => p.total)).toEqual(totals);
    expect(roomViewFor(room, host).pause).toBeNull();
  });
});

describe('passaggio di host', () => {
  function lobby(n: number) {
    const ctx = mk();
    const ids: PlayerId[] = [];
    for (let i = 0; i < n; i++) {
      const r = ctx.room.join(`P${i}`);
      if (!r.ok) throw new Error(r.error);
      ids.push(r.playerId);
    }
    return { ...ctx, ids };
  }

  it('host disconnesso -> primo umano connesso dopo di lui; il vecchio host non torna', () => {
    const { room, ids } = lobby(4);
    ids.forEach((id, i) => room.connect(id, `s${i}`));
    room.disconnect(ids[2] as PlayerId, 's2'); // P2 non host: niente cambia
    expect(room.hostId).toBe(ids[0]);
    room.disconnect(ids[0] as PlayerId, 's0');
    expect(room.hostId).toBe(ids[1]);
    room.connect(ids[0] as PlayerId, 's0b');
    expect(room.hostId).toBe(ids[1]);
  });

  it('scansione circolare e salto dei bot', () => {
    const { room, ids } = lobby(3);
    room.addBot(ids[0] as PlayerId);
    room.connect(ids[0] as PlayerId, 's0');
    room.connect(ids[1] as PlayerId, 's1');
    room.connect(ids[2] as PlayerId, 's2');
    room.disconnect(ids[2] as PlayerId, 's2');
    room.connect(ids[2] as PlayerId, 's2b');
    room.disconnect(ids[1] as PlayerId, 's1');
    room.disconnect(ids[0] as PlayerId, 's0');
    expect(room.hostId).toBe(ids[2]);
    room.disconnect(ids[2] as PlayerId, 's2b');
    room.connect(ids[1] as PlayerId, 's1b');
    expect(room.hostId).toBe(ids[1]);
    room.disconnect(ids[1] as PlayerId, 's1b');
    expect(room.hostId).toBe(ids[1]); // nessuno connesso: invariato
  });

  it('nessun umano connesso, poi rientra il vecchio host -> torna host', () => {
    const { room, ids } = lobby(2);
    room.connect(ids[0] as PlayerId, 's0');
    room.disconnect(ids[0] as PlayerId, 's0');
    expect(room.hostId).toBe(ids[0]);
    room.connect(ids[1] as PlayerId, 's1');
    expect(room.hostId).toBe(ids[1]);
    room.disconnect(ids[1] as PlayerId, 's1');
    room.connect(ids[0] as PlayerId, 's0b');
    expect(room.hostId).toBe(ids[0]);
  });

  it('un non host che si connette non prende il ruolo se l host e connesso', () => {
    const { room, ids } = lobby(2);
    room.connect(ids[0] as PlayerId, 's0');
    room.connect(ids[1] as PlayerId, 's1');
    expect(room.hostId).toBe(ids[0]);
  });
});

describe('partita completa e rivincita', () => {
  function fullGame(humans: number, bots: number) {
    const ctx = started(humans, bots);
    const host = ctx.ids[0] as PlayerId;
    const humanIds = new Set(ctx.ids);
    let guard = 0;
    while (ctx.room.status === 'playing' && guard++ < 5000) {
      const g = ctx.room.game!;
      if (g.phase === 'handEnd') {
        expect(ctx.room.nextHand(host).ok).toBe(true);
      } else if ((g.phase === 'bidding' || g.phase === 'playing') && humanIds.has(turnId(ctx.room))) {
        const r = humanMove(ctx.room, turnId(ctx.room));
        expect(r.ok).toBe(true);
      } else {
        vi.advanceTimersByTime(Math.max(BOT, PAUSE));
      }
    }
    return { ...ctx, host };
  }

  it('nextHand: solo host, solo a handEnd', () => {
    const { room, ids } = started(2);
    expect(room.nextHand(ids[0] as PlayerId)).toEqual({ ok: false, error: 'wrong-phase' });
    expect(room.nextHand(ids[1] as PlayerId)).toEqual({ ok: false, error: 'not-host' });
  });

  it('1 umano + 2 bot: arriva a ended dopo 6 nextHand', () => {
    const { room, onChange } = fullGame(1, 2);
    expect(room.status).toBe('ended');
    expect(room.game!.phase).toBe('gameOver');
    expect(room.game!.players.every((p) => p.handScores.length === 6)).toBe(true);
    expect(onChange).toHaveBeenCalled();
  });

  it('rematch azzera i totali e mantiene i posti', () => {
    const { room, host, ids } = fullGame(1, 2);
    const seatIds = room.seats.map((s) => s.id);
    expect(room.rematch('x')).toEqual({ ok: false, error: 'not-host' });
    room.seats[0]!.botControlled = true;
    expect(room.rematch(host)).toEqual({ ok: true });
    expect(room.status).toBe('playing');
    expect(room.seats.map((s) => s.id)).toEqual(seatIds);
    expect(room.seats[0]!.botControlled).toBe(false);
    expect(room.game!.players.every((p) => p.total === 0 && p.handScores.length === 0)).toBe(true);
    expect(room.game!.handNumber).toBe(1);
    expect(ids).toHaveLength(1);
    expect(room.rematch(host)).toEqual({ ok: false, error: 'wrong-phase' });
  });
});
