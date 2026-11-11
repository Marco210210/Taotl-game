import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { RoomView } from '@taotl/protocol';
import { Lobby, type LobbyActions } from '../src/screens/Lobby';

const seat = (id: string, isBot = false) => ({ id, nickname: id.toUpperCase(), isBot, connected: true, botControlled: isBot });
const mkView = (me: string, seats = ['a', 'b']): RoomView => ({
  code: 'K7QX',
  me,
  hostId: 'a',
  status: 'lobby',
  seats: seats.map((s) => seat(s, s === 'b')),
  game: null,
  pause: null,
});
const actions = (): LobbyActions => ({ addBot: vi.fn(), kick: vi.fn(), reorder: vi.fn(), start: vi.fn() });

describe('Lobby', () => {
  it('host vede i comandi', () => {
    render(<Lobby view={mkView('a')} {...actions()} />);
    expect(screen.getByTestId('btn-add-bot')).toBeInTheDocument();
    expect(screen.getByTestId('btn-start')).toBeEnabled();
    expect(screen.getByTestId('btn-kick-b')).toBeInTheDocument();
    expect(screen.queryByTestId('btn-kick-a')).toBeNull();
    expect(screen.getByTestId('invite-link').textContent).toContain('/r/K7QX');
  });
  it('start disabilitato con meno di 2 posti', () => {
    render(<Lobby view={mkView('a', ['a'])} {...actions()} />);
    expect(screen.getByTestId('btn-start')).toBeDisabled();
  });
  it('non-host non vede i comandi', () => {
    render(<Lobby view={mkView('b')} {...actions()} />);
    expect(screen.queryByTestId('btn-add-bot')).toBeNull();
    expect(screen.queryByTestId('btn-start')).toBeNull();
    expect(screen.queryByTestId('btn-kick-a')).toBeNull();
    expect(screen.getByText('In attesa che l\'host avvii la partita')).toBeInTheDocument();
    expect(screen.getByTestId('invite-link').textContent).toContain('/r/K7QX');
  });
  it('riordino emette l\'ordine completo', async () => {
    const a = actions();
    render(<Lobby view={mkView('a', ['a', 'b', 'c'])} {...a} />);
    await userEvent.click(screen.getByTestId('btn-down-a'));
    expect(a.reorder).toHaveBeenCalledWith(['b', 'a', 'c']);
    await userEvent.click(screen.getByTestId('btn-up-c'));
    expect(a.reorder).toHaveBeenCalledWith(['a', 'c', 'b']);
  });
});
