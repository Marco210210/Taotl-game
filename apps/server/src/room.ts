import {
  advance,
  applyIntent,
  botMove,
  createGame,
  endGameNow,
  viewFor,
  type GameState,
  type Intent,
  type PlayerId,
} from '@taotl/engine';
import type { PauseView } from '@taotl/protocol';
import type { ServerConfig } from './config';
import { newPlayerId, newToken } from './tokens';

export const MAX_SEATS = 12;
export const MIN_SEATS_TO_START = 2;
export const MAX_NICKNAME_LENGTH = 16;

export interface RoomDeps {
  rng: () => number;
  now: () => number;
  setTimer: (fn: () => void, ms: number) => () => void;
  cfg: ServerConfig;
  onChange: (room: Room) => void;
}

export interface Seat {
  id: PlayerId;
  nickname: string;
  isBot: boolean;
  /** Segreto, solo per gli umani: non esce mai dal server. */
  token?: string;
  connected: boolean;
  botControlled: boolean;
  socketId?: string;
  disconnectedAt?: number;
}

export type RoomStatus = 'lobby' | 'playing' | 'ended';
export type Failure = { ok: false; error: string };
export type Res<T = {}> = ({ ok: true } & T) | Failure;

export function validateNickname(raw: string | undefined): string | null {
  const n = (raw ?? '').trim();
  return n.length >= 1 && n.length <= MAX_NICKNAME_LENGTH ? n : null;
}

export class Room {
  readonly code: string;
  seats: Seat[] = [];
  hostId: PlayerId | null = null;
  status: RoomStatus = 'lobby';
  game: GameState | null = null;
  lastHumanSeenAt: number;
  private kickedTokens = new Set<string>();
  private actionTimer: (() => void) | null = null;
  private graceTimer: (() => void) | null = null;

  constructor(
    code: string,
    private deps: RoomDeps,
  ) {
    this.code = code;
    this.lastHumanSeenAt = deps.now();
  }

  playerIdForToken(token: string | undefined): PlayerId | null {
    if (!token) return null;
    return this.seats.find((s) => !s.isBot && s.token === token)?.id ?? null;
  }

  hasConnectedHumans(): boolean {
    return this.seats.some((s) => !s.isBot && s.connected);
  }

  join(nickname: string | undefined, token?: string): Res<{ token: string; playerId: PlayerId }> {
    if (token && this.kickedTokens.has(token)) return { ok: false, error: 'kicked' };
    const existing = this.playerIdForToken(token);
    if (existing) return { ok: true, token: token as string, playerId: existing };
    if (this.status !== 'lobby') return { ok: false, error: 'game-started' };
    if (nickname === undefined) return { ok: false, error: 'bad-token' };
    const nick = validateNickname(nickname);
    if (nick === null) return { ok: false, error: 'invalid-nickname' };
    const lower = nick.toLowerCase();
    if (this.seats.some((s) => s.nickname.toLowerCase() === lower)) return { ok: false, error: 'nickname-taken' };
    if (this.seats.length >= MAX_SEATS) return { ok: false, error: 'room-full' };
    const seat: Seat = {
      id: newPlayerId(),
      nickname: nick,
      isBot: false,
      token: newToken(),
      connected: false,
      botControlled: false,
    };
    this.seats.push(seat);
    if (this.hostId === null) this.hostId = seat.id;
    this.changed();
    return { ok: true, token: seat.token as string, playerId: seat.id };
  }

  connect(playerId: PlayerId, socketId: string): void {
    const seat = this.seats.find((s) => s.id === playerId && !s.isBot);
    if (!seat) return;
    seat.connected = true;
    seat.socketId = socketId;
    seat.disconnectedAt = undefined;
    seat.botControlled = false;
    const host = this.seats.find((s) => s.id === this.hostId);
    if (!host || !host.connected) this.hostId = seat.id;
    this.lastHumanSeenAt = this.deps.now();
    this.changed();
  }

  /** Agisce solo se socketId e ancora quello corrente (il vecchio socket non oscura il nuovo). */
  disconnect(playerId: PlayerId, socketId: string): void {
    const seat = this.seats.find((s) => s.id === playerId && !s.isBot);
    if (!seat || seat.socketId !== socketId) return;
    seat.connected = false;
    seat.socketId = undefined;
    seat.disconnectedAt = this.deps.now();
    if (this.hostId === seat.id) this.transferHost(seat);
    this.lastHumanSeenAt = this.deps.now();
    this.changed();
  }

  private lobbyHostGuard(by: PlayerId): Failure | null {
    if (by !== this.hostId) return { ok: false, error: 'not-host' };
    if (this.status !== 'lobby') return { ok: false, error: 'game-started' };
    return null;
  }

  reorder(by: PlayerId, order: PlayerId[]): Res {
    const g = this.lobbyHostGuard(by);
    if (g) return g;
    const ids = this.seats.map((s) => s.id);
    if (order.length !== ids.length || new Set(order).size !== order.length || !order.every((id) => ids.includes(id))) {
      return { ok: false, error: 'bad-order' };
    }
    this.seats = order.map((id) => this.seats.find((s) => s.id === id) as Seat);
    this.changed();
    return { ok: true };
  }

  kick(by: PlayerId, target: PlayerId): Res {
    const g = this.lobbyHostGuard(by);
    if (g) return g;
    const seat = this.seats.find((s) => s.id === target);
    if (!seat || target === by) return { ok: false, error: 'bad-player' };
    if (!seat.isBot && seat.token) this.kickedTokens.add(seat.token);
    this.seats = this.seats.filter((s) => s.id !== target);
    this.changed();
    return { ok: true };
  }

  addBot(by: PlayerId): Res {
    const g = this.lobbyHostGuard(by);
    if (g) return g;
    if (this.seats.length >= MAX_SEATS) return { ok: false, error: 'room-full' };
    const used = new Set(this.seats.map((s) => s.nickname.toLowerCase()));
    let n = 1;
    while (used.has(`bot ${n}`)) n++;
    this.seats.push({ id: newPlayerId(), nickname: `Bot ${n}`, isBot: true, connected: true, botControlled: false });
    this.changed();
    return { ok: true };
  }

  start(by: PlayerId): Res {
    const g = this.lobbyHostGuard(by);
    if (g) return g;
    if (this.seats.length < MIN_SEATS_TO_START || this.seats.length > MAX_SEATS) {
      return { ok: false, error: 'bad-player-count' };
    }
    const dealerIndex = Math.floor(this.deps.rng() * this.seats.length);
    this.game = createGame(
      this.seats.map((s) => s.id),
      { dealerIndex, rng: this.deps.rng },
    );
    this.status = 'playing';
    this.changed();
    return { ok: true };
  }

  /** Primo umano connesso partendo dal posto successivo; se non c'e, l'host resta com'e. */
  private transferHost(old: Seat): void {
    const n = this.seats.length;
    const start = this.seats.indexOf(old);
    for (let i = 1; i < n; i++) {
      const s = this.seats[(start + i) % n] as Seat;
      if (!s.isBot && s.connected) {
        this.hostId = s.id;
        return;
      }
    }
  }

  private static validIntent(i: unknown): i is Intent {
    if (typeof i !== 'object' || i === null) return false;
    const o = i as Record<string, unknown>;
    if (o.type === 'bid') return typeof o.value === 'number';
    if (o.type === 'play') {
      return typeof o.cardId === 'string' && (o.declareChipetl === undefined || typeof o.declareChipetl === 'boolean');
    }
    return false;
  }

  intent(playerId: PlayerId, intent: unknown): Res {
    if (this.status !== 'playing' || !this.game) return { ok: false, error: 'wrong-phase' };
    const seat = this.seats.find((s) => s.id === playerId);
    if (!seat) return { ok: false, error: 'unknown-player' };
    if (seat.isBot || seat.botControlled) return { ok: false, error: 'not-your-turn' };
    if (!Room.validIntent(intent)) return { ok: false, error: 'bad-intent' };
    const r = applyIntent(this.game, playerId, intent);
    if (!r.ok) return r;
    this.setGame(r.state);
    this.changed();
    return { ok: true };
  }

  nextHand(by: PlayerId): Res {
    if (by !== this.hostId) return { ok: false, error: 'not-host' };
    if (this.status !== 'playing' || !this.game || this.game.phase !== 'handEnd') {
      return { ok: false, error: 'wrong-phase' };
    }
    this.setGame(advance(this.game, this.deps.rng));
    this.changed();
    return { ok: true };
  }

  /** Pausa attiva: turno di un umano disconnesso e non sostituito da un bot. */
  pauseInfo(): PauseView | null {
    const seat = this.pausedSeat();
    if (!seat) return null;
    return { waitingFor: seat.id, hostCanDecide: this.graceElapsed(seat) };
  }

  private turnSeat(): Seat | null {
    const g = this.game;
    if (this.status !== 'playing' || !g || (g.phase !== 'bidding' && g.phase !== 'playing')) return null;
    const id = g.players[g.turnIndex]?.id;
    return this.seats.find((s) => s.id === id) ?? null;
  }

  private pausedSeat(): Seat | null {
    const s = this.turnSeat();
    return s && !s.isBot && !s.connected && !s.botControlled ? s : null;
  }

  private graceElapsed(seat: Seat): boolean {
    return this.deps.now() - (seat.disconnectedAt ?? 0) >= this.deps.cfg.disconnectGraceMs;
  }

  hostDecision(by: PlayerId, choice: 'wait' | 'bot' | 'end'): Res {
    if (by !== this.hostId) return { ok: false, error: 'not-host' };
    const seat = this.pausedSeat();
    if (!seat || !this.graceElapsed(seat)) return { ok: false, error: 'no-pause' };
    if (choice === 'wait') return { ok: true };
    if (choice === 'bot') seat.botControlled = true;
    else if (choice === 'end') this.setGame(endGameNow(this.game as GameState));
    else return { ok: false, error: 'bad-choice' };
    this.changed();
    return { ok: true };
  }

  rematch(by: PlayerId): Res {
    if (by !== this.hostId) return { ok: false, error: 'not-host' };
    if (this.status !== 'ended') return { ok: false, error: 'wrong-phase' };
    for (const s of this.seats) if (!s.isBot && s.connected) s.botControlled = false;
    const dealerIndex = Math.floor(this.deps.rng() * this.seats.length);
    this.game = createGame(
      this.seats.map((s) => s.id),
      { dealerIndex, rng: this.deps.rng },
    );
    this.status = 'playing';
    this.changed();
    return { ok: true };
  }

  dispose(): void {
    this.cancelTimers();
  }

  private setGame(g: GameState): void {
    this.game = g;
    if (g.phase === 'gameOver') this.status = 'ended';
  }

  private cancelTimers(): void {
    this.actionTimer?.();
    this.graceTimer?.();
    this.actionTimer = null;
    this.graceTimer = null;
  }

  /** Cancella i timer pendenti e arma quelli che servono allo stato corrente. */
  private reschedule(): void {
    this.cancelTimers();
    const g = this.game;
    if (this.status !== 'playing' || !g) return;
    if (g.phase === 'trickEnd') {
      this.actionTimer = this.deps.setTimer(() => {
        this.actionTimer = null;
        if (this.status !== 'playing' || !this.game || this.game.phase !== 'trickEnd') return;
        this.setGame(advance(this.game, this.deps.rng));
        this.changed();
      }, this.deps.cfg.trickPauseMs);
      return;
    }
    const seat = this.turnSeat();
    if (!seat) return;
    if (seat.isBot || seat.botControlled) {
      this.actionTimer = this.deps.setTimer(() => {
        this.actionTimer = null;
        this.runBotMove();
      }, this.deps.cfg.botMoveDelayMs);
    } else if (this.pausedSeat() && !this.graceElapsed(seat)) {
      const wait = this.deps.cfg.disconnectGraceMs - (this.deps.now() - (seat.disconnectedAt ?? 0));
      this.graceTimer = this.deps.setTimer(() => {
        this.graceTimer = null;
        this.deps.onChange(this);
      }, Math.max(0, wait));
    }
  }

  private runBotMove(): void {
    const seat = this.turnSeat();
    if (!seat || !this.game || !(seat.isBot || seat.botControlled)) return;
    try {
      const r = applyIntent(this.game, seat.id, botMove(viewFor(this.game, seat.id), this.game.config));
      if (!r.ok) {
        console.error(`Mossa del bot rifiutata: ${r.error}`);
        return;
      }
      this.setGame(r.state);
      this.changed();
    } catch (e) {
      console.error('Errore nella mossa del bot', e);
    }
  }

  private changed(): void {
    this.reschedule();
    this.deps.onChange(this);
  }
}
