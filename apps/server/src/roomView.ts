import { viewFor, type PlayerId } from '@taotl/engine';
import type { RoomView } from '@taotl/protocol';
import type { Room } from './room';

/** Vista della stanza per un giocatore: mai token ne socket id. */
export function roomViewFor(room: Room, playerId: PlayerId): RoomView {
  return {
    code: room.code,
    me: playerId,
    hostId: room.hostId,
    status: room.status,
    seats: room.seats.map((s) => ({
      id: s.id,
      nickname: s.nickname,
      isBot: s.isBot,
      connected: s.connected,
      botControlled: s.botControlled,
    })),
    game: room.game ? viewFor(room.game, playerId) : null,
    pause: null,
  };
}
