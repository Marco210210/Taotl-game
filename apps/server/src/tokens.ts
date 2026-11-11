import { randomBytes, randomInt } from 'node:crypto';

export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** Segreto del giocatore: non deve mai comparire in RoomView. */
export function newToken(): string {
  return randomBytes(16).toString('hex');
}

/** Id pubblico del posto (diverso dal token). */
export function newPlayerId(): string {
  return randomBytes(6).toString('hex');
}

export function newRoomCode(): string {
  let code = '';
  for (let i = 0; i < 4; i++) code += ROOM_CODE_ALPHABET[randomInt(ROOM_CODE_ALPHABET.length)];
  return code;
}

/** RNG crittografico in [0,1) per mescolata e mazziere. */
export function cryptoRng(): number {
  return randomInt(2 ** 32) / 2 ** 32;
}
