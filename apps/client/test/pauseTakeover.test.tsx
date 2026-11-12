import { act, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RoomView } from '@taotl/protocol';
import { PauseDialog } from '../src/components/PauseDialog';
import { TakenOver } from '../src/screens/Room';
import { errorMessage } from '../src/lib/errors';

const seat = (id: string) => ({ id, nickname: id.toUpperCase(), isBot: false, connected: true, botControlled: false });
const view = (pause: RoomView['pause']): RoomView => ({
  code: 'K7QX', me: 'a', hostId: 'a', status: 'playing', seats: [seat('a'), seat('b')], game: null, pause,
});

describe('PauseDialog: Aspetta', () => {
  it('dopo Aspetta nasconde le scelte e mostra feedback; torna a mostrarle se la pausa cambia', async () => {
    const emit = vi.fn().mockResolvedValue({ ok: true });
    const { rerender } = render(<PauseDialog view={view({ waitingFor: 'b', hostCanDecide: true })} emit={emit} />);
    await userEvent.click(screen.getByTestId('btn-pause-wait'));
    expect(emit).toHaveBeenCalledWith('host:decision', { choice: 'wait' });
    expect(screen.getByText('Ok, aspettiamo')).toBeInTheDocument();
    expect(screen.queryByTestId('btn-pause-bot')).toBeNull();
    rerender(<PauseDialog view={view({ waitingFor: 'b', hostCanDecide: false })} emit={emit} />);
    expect(screen.queryByText('Ok, aspettiamo')).toBeNull();
    rerender(<PauseDialog view={view({ waitingFor: 'b', hostCanDecide: true })} emit={emit} />);
    expect(screen.getByTestId('btn-pause-bot')).toBeInTheDocument();
  });
  it('se Aspetta fallisce le scelte restano', async () => {
    const emit = vi.fn().mockResolvedValue({ ok: false, error: 'no-pause' });
    render(<PauseDialog view={view({ waitingFor: 'b', hostCanDecide: true })} emit={emit} />);
    await userEvent.click(screen.getByTestId('btn-pause-wait'));
    expect(screen.getByTestId('btn-pause-bot')).toBeInTheDocument();
  });
});

describe('scheda sostituita', () => {
  afterEach(() => vi.resetModules());
  it('TakenOver mostra il messaggio e Riprendi qui chiama onResume', async () => {
    const onResume = vi.fn();
    render(<TakenOver onResume={onResume} />);
    expect(screen.getByText("Sei connesso da un'altra scheda")).toBeInTheDocument();
    await userEvent.click(screen.getByTestId('btn-resume'));
    expect(onResume).toHaveBeenCalled();
  });
  it('useRoom: disconnect "io server disconnect" -> takenOver; resume riconnette', async () => {
    const handlers: Record<string, (...a: unknown[]) => void> = {};
    const fake = {
      connected: true,
      on: vi.fn((e: string, h: (...a: unknown[]) => void) => { handlers[e] = h; }),
      off: vi.fn(),
      emit: vi.fn(),
      connect: vi.fn(),
    };
    vi.doMock('../src/net/socket', async (orig) => ({ ...(await orig<object>()), getSocket: () => fake, getToken: () => null }));
    const { useRoom } = await import('../src/net/useRoom');
    const { result } = renderHook(() => useRoom('K7QX'));
    expect(result.current.takenOver).toBe(false);
    act(() => handlers.disconnect!('transport close'));
    expect(result.current.takenOver).toBe(false);
    act(() => handlers.disconnect!('io server disconnect'));
    expect(result.current.takenOver).toBe(true);
    act(() => result.current.resume());
    expect(fake.connect).toHaveBeenCalled();
    vi.doUnmock('../src/net/socket');
  });
});

describe('messaggi', () => {
  it('game-started copre anche la partita terminata', () => {
    expect(errorMessage('game-started')).toBe('La partita è già iniziata o terminata: non si può più entrare');
  });
});
