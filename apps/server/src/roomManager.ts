import type { PlayerId } from '@taotl/engine';
import { Room, validateNickname, type Failure, type RoomDeps } from './room';
import { newRoomCode } from './tokens';

export class RoomManager {
  private rooms = new Map<string, Room>();

  constructor(private deps: RoomDeps) {}

  createRoom(nickname: string): { ok: true; room: Room; token: string; playerId: PlayerId } | Failure {
    if (validateNickname(nickname) === null) return { ok: false, error: 'invalid-nickname' };
    let code = newRoomCode();
    while (this.rooms.has(code)) code = newRoomCode();
    const room = new Room(code, this.deps);
    const r = room.join(nickname);
    if (!r.ok) return r;
    this.rooms.set(code, room);
    return { ok: true, room, token: r.token, playerId: r.playerId };
  }

  get(code: string): Room | undefined {
    return this.rooms.get(code.trim().toUpperCase());
  }

  sweep(now: number): void {
    for (const [code, room] of this.rooms) {
      if (!room.hasConnectedHumans() && now - room.lastHumanSeenAt > this.deps.cfg.roomIdleMs) {
        room.dispose();
        this.rooms.delete(code);
      }
    }
  }
}
