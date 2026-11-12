import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import { loadConfig } from '../src/config';

describe('createApp: RNG', () => {
  afterEach(() => vi.restoreAllMocks());

  it('avviare una partita non usa Math.random (RNG crittografico di default)', async () => {
    const spy = vi.spyOn(Math, 'random');
    const app = createApp({ ...loadConfig({}), port: 0, botMoveDelayMs: 100000 });
    const created = app.manager.createRoom('A');
    if (!created.ok) throw new Error(created.error);
    expect(created.room.addBot(created.playerId).ok).toBe(true);
    expect(created.room.start(created.playerId).ok).toBe(true);
    expect(created.room.game).not.toBeNull();
    expect(spy).not.toHaveBeenCalled();
    await app.close();
  });

  it('accetta un rng iniettato', async () => {
    const rng = vi.fn(() => 0.5);
    const app = createApp({ ...loadConfig({}), port: 0, botMoveDelayMs: 100000 }, { rng });
    const created = app.manager.createRoom('A');
    if (!created.ok) throw new Error(created.error);
    created.room.addBot(created.playerId);
    created.room.start(created.playerId);
    expect(rng).toHaveBeenCalled();
    await app.close();
  });
});
