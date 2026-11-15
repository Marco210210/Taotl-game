import { describe, expect, it } from 'vitest';
import { normalizeRoomCode } from '../src/lib/roomCode';

describe('normalizeRoomCode', () => {
  it('maiuscole, spazi e trattini tolti', () => {
    expect(normalizeRoomCode('abcd')).toBe('ABCD');
    expect(normalizeRoomCode(' ab cd ')).toBe('ABCD');
    expect(normalizeRoomCode('AB-CD')).toBe('ABCD');
  });
  it('accetta il link intero incollato', () => {
    expect(normalizeRoomCode('https://taotl-game.duckdns.org/r/XY7K')).toBe('XY7K');
  });
  it('rifiuta vuoto, troppo corto o troppo lungo', () => {
    expect(normalizeRoomCode('')).toBeNull();
    expect(normalizeRoomCode('AB')).toBeNull();
    expect(normalizeRoomCode('ABCDEFGHIJ')).toBeNull();
  });
});
