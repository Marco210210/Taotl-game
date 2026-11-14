import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { PlayerView } from '@taotl/engine';
import type { RoomView } from '@taotl/protocol';
import { Table } from '../src/screens/Table';
import { completedHands, standings } from '../src/lib/standings';

const seat = (id: string) => ({ id, nickname: id.toUpperCase(), isBot: false, connected: true, botControlled: false });
const ids = ['a', 'b', 'c', 'd'];
type P = PlayerView['players'][number];
const player = (id: string, handScores: number[], extra: Partial<P> = {}): P => ({
  id,
  handCount: 3,
  bid: null,
  tricksWon: 0,
  handScores,
  total: handScores.reduce((x, y) => x + y, 0),
  ...extra,
});
const game = (players: P[], over: Partial<PlayerView> = {}): PlayerView => ({
  me: 'a',
  hand: [],
  players,
  dealerId: 'c',
  handNumber: 1,
  cardsPerPlayer: 3,
  phase: 'bidding',
  turnId: 'd',
  currentTrick: [],
  trickSuit: null,
  tricksThisHand: [],
  totalBid: 0,
  legalBids: [],
  playableCardIds: [],
  ...over,
});
const view = (g: PlayerView): RoomView => ({ code: 'K7QX', me: 'a', hostId: 'a', status: 'playing', seats: ids.map(seat), game: g, pause: null });
const rowIds = () =>
  [...document.querySelectorAll('[data-testid^="standings-row-"]')].map((r) => r.getAttribute('data-testid')!.replace('standings-row-', ''));

describe('standings()', () => {
  it('totale decrescente, a parità ordine dei posti dal mazziere', () => {
    const players = [player('a', [10]), player('b', [30]), player('c', [10]), player('d', [10])];
    expect(standings(ids.map(seat), players, 'c').map((s) => s.seat.id)).toEqual(['b', 'c', 'd', 'a']);
  });
  it('conta solo le mani concluse', () => {
    expect(completedHands([player('a', [1, 2]), player('b', [3, 4])])).toBe(2);
    expect(completedHands([player('a', [])])).toBe(0);
  });
});

describe('Classifica durante la partita', () => {
  it('dopo 0 mani: "Nessuna mano conclusa", tutti a 0, ordine dei posti dal mazziere, M accanto al mazziere', async () => {
    render(<Table view={view(game(ids.map((id) => player(id, []))))} emit={vi.fn()} />);
    await userEvent.click(screen.getByTestId('btn-standings'));
    expect(screen.getByTestId('standings-after')).toHaveTextContent('Nessuna mano conclusa');
    expect(rowIds()).toEqual(['c', 'd', 'a', 'b']);
    expect(within(screen.getByTestId('standings-row-c')).getByTestId('standings-dealer')).toHaveTextContent('M');
    expect(screen.getAllByTestId('standings-dealer')).toHaveLength(1);
    expect(screen.getAllByTestId('standings-total').map((t) => t.textContent)).toEqual(['0', '0', '0', '0']);
  });
  it('dopo 2 mani, durante la 3ª: totali dopo la 2ª, mai i punti della mano in corso', async () => {
    const players = [
      player('a', [20, -10], { tricksWon: 2, bid: 2 }),
      player('b', [15, 25]),
      player('c', [-5, 15]),
      player('d', [0, 10]),
    ];
    render(<Table view={view(game(players, { handNumber: 3, dealerId: 'a', phase: 'playing', turnId: 'b' }))} emit={vi.fn()} />);
    await userEvent.click(screen.getByTestId('btn-standings'));
    expect(screen.getByTestId('standings-after')).toHaveTextContent('Dopo la mano 2 di 6');
    // b 40; a, c, d a 10: a parità dal mazziere a → a, c, d
    expect(rowIds()).toEqual(['b', 'a', 'c', 'd']);
    expect(screen.getAllByTestId('standings-total').map((t) => t.textContent)).toEqual(['40', '10', '10', '10']);
    expect(within(screen.getByTestId('standings-row-a')).getByTestId('standings-dealer')).toBeInTheDocument();
    await userEvent.click(screen.getByTestId('btn-close-standings'));
    expect(screen.queryByTestId('standings')).toBeNull();
  });
});
