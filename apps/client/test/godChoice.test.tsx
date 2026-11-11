import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { PlayerView, Suit } from '@taotl/engine';
import type { RoomView } from '@taotl/protocol';
import { Table } from '../src/screens/Table';
import { PauseDialog } from '../src/components/PauseDialog';

const game = (trickSuit: Suit | null): PlayerView => ({
  me: 'a',
  hand: [{ kind: 'god', god: 'rosso' }, { kind: 'suited', suit: 'picche', rank: 3 }],
  players: [
    { id: 'a', handCount: 2, bid: 1, tricksWon: 0, handScores: [], total: 0 },
    { id: 'b', handCount: 2, bid: 0, tricksWon: 0, handScores: [], total: 0 },
  ],
  dealerId: 'b',
  handNumber: 1,
  cardsPerPlayer: 2,
  phase: 'playing',
  turnId: 'a',
  currentTrick: trickSuit ? [{ playerId: 'b', card: { kind: 'suited', suit: trickSuit, rank: 9 }, valid: true, label: null }] : [],
  trickSuit,
  tricksThisHand: [],
  totalBid: 1,
  legalBids: [],
  playableCardIds: ['god-rosso', 'picche-3'],
});
const seat = (id: string) => ({ id, nickname: id.toUpperCase(), isBot: false, connected: true, botControlled: false });
const view = (g: PlayerView, pause: RoomView['pause'] = null, me = 'a'): RoomView => ({
  code: 'K7QX', me, hostId: 'a', status: 'playing', seats: [seat('a'), seat('b')], game: g, pause,
});
const god = () => document.querySelector('[data-card-id="god-rosso"]') as HTMLElement;
const play = async () => {
  await userEvent.click(god());
  await userEvent.click(god());
};

describe('Table: scelta del Dio', () => {
  it('con trickSuit cuori apre la scelta, Annulla non invia nulla', async () => {
    const emit = vi.fn().mockResolvedValue({ ok: true });
    render(<Table view={view(game('cuori'))} emit={emit} />);
    await play();
    expect(screen.getByTestId('btn-valido')).toBeInTheDocument();
    expect(screen.getByTestId('btn-chipetl')).toBeInTheDocument();
    await userEvent.click(screen.getByTestId('btn-cancel-choice'));
    expect(screen.queryByTestId('btn-valido')).toBeNull();
    expect(emit).not.toHaveBeenCalled();
  });
  it('le scelte inviano declareChipetl esplicito', async () => {
    const emit = vi.fn().mockResolvedValue({ ok: true });
    render(<Table view={view(game('cuori'))} emit={emit} />);
    await play();
    await userEvent.click(screen.getByTestId('btn-chipetl'));
    expect(emit).toHaveBeenCalledWith('game:intent', { type: 'play', cardId: 'god-rosso', declareChipetl: true });
    await play();
    await userEvent.click(screen.getByTestId('btn-valido'));
    expect(emit).toHaveBeenLastCalledWith('game:intent', { type: 'play', cardId: 'god-rosso', declareChipetl: false });
  });
  it('con trickSuit picche invia subito senza declareChipetl', async () => {
    const emit = vi.fn().mockResolvedValue({ ok: true });
    render(<Table view={view(game('picche'))} emit={emit} />);
    await play();
    expect(screen.queryByTestId('btn-valido')).toBeNull();
    expect(emit).toHaveBeenCalledWith('game:intent', { type: 'play', cardId: 'god-rosso' });
  });
  it('errore di un intent in role=alert', async () => {
    const emit = vi.fn().mockResolvedValue({ ok: false, error: 'not-your-turn' });
    render(<Table view={view(game('picche'))} emit={emit} />);
    await play();
    expect(await screen.findByRole('alert')).toHaveTextContent('Non è il tuo turno');
  });
  it('my-turn visibile solo quando tocca a me', () => {
    const emit = vi.fn();
    const { unmount } = render(<Table view={view(game('picche'))} emit={emit} />);
    expect(screen.getByTestId('my-turn')).toBeInTheDocument();
    unmount();
    render(<Table view={view({ ...game('picche'), turnId: 'b' })} emit={emit} />);
    expect(screen.queryByTestId('my-turn')).toBeNull();
  });
  it('dichiarazione: mostra bid per i valori leciti', async () => {
    const emit = vi.fn().mockResolvedValue({ ok: true });
    render(<Table view={view({ ...game(null), phase: 'bidding', legalBids: [0, 2], playableCardIds: [] })} emit={emit} />);
    await userEvent.click(screen.getByTestId('bid-2'));
    expect(emit).toHaveBeenCalledWith('game:intent', { type: 'bid', value: 2 });
  });
  it('header Dichiarate X / N', () => {
    render(<Table view={view(game('picche'))} emit={vi.fn()} />);
    expect(screen.getByText(/Dichiarate 1 \/ 2/)).toBeInTheDocument();
  });
});

describe('PauseDialog', () => {
  it("non-host vede solo l'attesa", () => {
    render(<PauseDialog view={view(game(null), { waitingFor: 'b', hostCanDecide: true }, 'b')} emit={vi.fn()} />);
    expect(screen.getByTestId('pause-dialog')).toHaveTextContent('In attesa di B');
    expect(screen.queryByTestId('btn-pause-wait')).toBeNull();
  });
  it('host con hostCanDecide vede i tre pulsanti', async () => {
    const emit = vi.fn().mockResolvedValue({ ok: true });
    render(<PauseDialog view={view(game(null), { waitingFor: 'b', hostCanDecide: true })} emit={emit} />);
    await userEvent.click(screen.getByTestId('btn-pause-bot'));
    expect(emit).toHaveBeenCalledWith('host:decision', { choice: 'bot' });
    expect(screen.getByTestId('btn-pause-wait')).toBeInTheDocument();
    expect(screen.getByTestId('btn-pause-end')).toBeInTheDocument();
  });
  it('host senza hostCanDecide non vede i pulsanti', () => {
    render(<PauseDialog view={view(game(null), { waitingFor: 'b', hostCanDecide: false })} emit={vi.fn()} />);
    expect(screen.queryByTestId('btn-pause-wait')).toBeNull();
  });
});
