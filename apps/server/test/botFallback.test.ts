import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@taotl/engine', async (orig) => {
  const mod = await orig<typeof import('@taotl/engine')>();
  return { ...mod, botMove: vi.fn(mod.botMove) };
});

import { botMove, type PlayerId } from '@taotl/engine';
import { Room } from '../src/room';
import { loadConfig } from '../src/config';

const cfg = loadConfig({});

function mkStarted() {
  const room = new Room('ABCD', {
    rng: () => 0.3,
    now: () => Date.now(),
    setTimer: (fn, ms) => {
      const t = setTimeout(fn, ms);
      return () => clearTimeout(t);
    },
    cfg,
    onChange: vi.fn(),
  });
  const j = room.join('Host');
  if (!j.ok) throw new Error(j.error);
  room.connect(j.playerId, 's0');
  room.addBot(j.playerId);
  room.start(j.playerId);
  return { room, host: j.playerId as PlayerId };
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('bot: ripiego se la mossa fallisce', () => {
  it('botMove che lancia: gioca la prima mossa legale e logga l errore', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(botMove).mockImplementationOnce(() => {
      throw new Error('boom');
    });
    const { room } = mkStarted();
    const game = () => room.game!;
    const botId = room.seats[1]!.id;
    const before = game().players.find((p) => p.id === botId)!.bid;
    expect(game().players[game().turnIndex]!.id).toBe(botId);
    expect(before).toBeNull();
    vi.advanceTimersByTime(cfg.botMoveDelayMs + 1);
    expect(game().players.find((p) => p.id === botId)!.bid).not.toBeNull();
    expect(err).toHaveBeenCalledWith('Errore nella mossa del bot', expect.any(Error));
  });
});
