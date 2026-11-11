import { createGame, type GameState, type PlayerId } from '@taotl/engine';
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
    this.lastHumanSeenAt = this.deps.now();
    this.changed();
  }

  /** Agisce solo se socketId e ancora quello corrente (il vecchio socket non oscura il nuovo). */
  disconnect(playerId: PlayerId, socketId: string): void {
    const seat = this.seats.find((s) => s.id === playerId && !s.isBot);
    if (!seat || seat.socketId !== socketId) return;
    seat.connected = false;
    seat.socketId = undefined;
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

  private changed(): void {
    this.deps.onChange(this);
  }
}
