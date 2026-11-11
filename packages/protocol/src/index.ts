import type { Intent, PlayerId, PlayerView } from '@taotl/engine';

export interface SeatView {
  id: PlayerId;
  nickname: string;
  isBot: boolean;
  connected: boolean;
  botControlled: boolean;
}
export interface PauseView {
  waitingFor: PlayerId;
  hostCanDecide: boolean;
}
export interface RoomView {
  code: string;
  me: PlayerId;
  hostId: PlayerId | null;
  status: 'lobby' | 'playing' | 'ended';
  seats: SeatView[];
  game: PlayerView | null;
  pause: PauseView | null;
}

export type Ack<T = {}> = (r: ({ ok: true } & T) | { ok: false; error: string }) => void;

export interface ClientToServerEvents {
  'room:create': (p: { nickname: string }, ack: Ack<{ code: string; token: string }>) => void;
  'room:join': (p: { code: string; nickname?: string; token?: string }, ack: Ack<{ token: string }>) => void;
  'lobby:reorder': (p: { order: PlayerId[] }, ack: Ack) => void;
  'lobby:kick': (p: { playerId: PlayerId }, ack: Ack) => void;
  'lobby:addBot': (ack: Ack) => void;
  'game:start': (ack: Ack) => void;
  'game:intent': (i: Intent, ack: Ack) => void;
  'game:nextHand': (ack: Ack) => void;
  'host:decision': (p: { choice: 'wait' | 'bot' | 'end' }, ack: Ack) => void;
  'game:rematch': (ack: Ack) => void;
}
export interface ServerToClientEvents {
  'room:state': (v: RoomView) => void;
}

export type ServerErrorCode =
  | 'room-not-found'
  | 'game-started'
  | 'room-full'
  | 'nickname-taken'
  | 'invalid-nickname'
  | 'bad-token'
  | 'kicked'
  | 'not-host'
  | 'bad-player-count'
  | 'bad-player'
  | 'bad-order';
