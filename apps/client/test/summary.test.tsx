import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { PlayerView } from '@taotl/engine';
import type { RoomView } from '@taotl/protocol';
import { Table } from '../src/screens/Table';
import { FinalRanking } from '../src/screens/FinalRanking';

const seat = (id: string) => ({ id, nickname: id.toUpperCase(), isBot: false, connected: true, botControlled: false });
const game = (over: Partial<PlayerView> = {}): PlayerView => ({
  me: 'a',
  hand: [],
  players: [
    { id: 'a', handCount: 0, bid: 1, tricksWon: 1, handScores: [25], total: 25 },
    { id: 'b', handCount: 0, bid: 1, tricksWon: 0, handScores: [-15], total: -15 },
    { id: 'c', handCount: 0, bid: 0, tricksWon: 0, handScores: [10], total: 25 },
  ],
  dealerId: 'c',
  handNumber: 1,
  cardsPerPlayer: 1,
  phase: 'handEnd',
  turnId: null,
  currentTrick: [],
  trickSuit: null,
  tricksThisHand: [],
  totalBid: 2,
  legalBids: [],
  playableCardIds: [],
  ...over,
});
const view = (g: PlayerView, me = 'a', status: RoomView['status'] = 'playing'): RoomView => ({
  code: 'K7QX', me, hostId: 'a', status, seats: [seat('a'), seat('b'), seat('c')], game: g, pause: null,
});

describe('HandSummary', () => {
  it('mostra dichiarate, fatte, punti e totale per ogni giocatore', () => {
    render(<Table view={view(game())} emit={vi.fn()} />);
    const s = screen.getByTestId('hand-summary');
    expect(s).toHaveTextContent('Fine mano 1');
    const rowB = within(screen.getByTestId('summary-row-b'));
    expect(rowB.getByTestId('summary-bid')).toHaveTextContent('1');
    expect(rowB.getByTestId('summary-made')).toHaveTextContent('0');
    expect(rowB.getByTestId('summary-points')).toHaveTextContent('−15');
    expect(rowB.getByTestId('summary-total')).toHaveTextContent('-15');
    expect(within(screen.getByTestId('summary-row-a')).getByTestId('summary-points')).toHaveTextContent('+25');
  });
  it('btn-next-hand solo per l\'host, emette game:nextHand', async () => {
    const emit = vi.fn().mockResolvedValue({ ok: true });
    const { unmount } = render(<Table view={view(game())} emit={emit} />);
    await userEvent.click(screen.getByTestId('btn-next-hand'));
    expect(emit).toHaveBeenCalledWith('game:nextHand');
    unmount();
    render(<Table view={view(game(), 'b')} emit={emit} />);
    expect(screen.queryByTestId('btn-next-hand')).toBeNull();
    expect(screen.getByText("In attesa dell'host…")).toBeInTheDocument();
  });
  it('errore di nextHand in role=alert', async () => {
    const emit = vi.fn().mockResolvedValue({ ok: false, error: 'wrong-phase' });
    render(<Table view={view(game())} emit={emit} />);
    await userEvent.click(screen.getByTestId('btn-next-hand'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Non è il momento giusto');
  });
  it('non compare fuori da handEnd', () => {
    render(<Table view={view(game({ phase: 'playing' }))} emit={vi.fn()} />);
    expect(screen.queryByTestId('hand-summary')).toBeNull();
  });
});

describe('FinalRanking', () => {
  const ended = (me = 'a') => view(game(), me, 'ended');
  it('classifica con pari merito tutti vincitori', () => {
    render(<FinalRanking view={ended()} emit={vi.fn()} />);
    expect(screen.getByTestId('final-ranking')).toBeInTheDocument();
    const a = within(screen.getByTestId('ranking-row-a'));
    const c = within(screen.getByTestId('ranking-row-c'));
    expect(a.getByText('Vincitore')).toBeInTheDocument();
    expect(c.getByText('Vincitore')).toBeInTheDocument();
    expect(within(screen.getByTestId('ranking-row-b')).queryByText('Vincitore')).toBeNull();
    expect(within(screen.getByTestId('ranking-row-b')).getByTestId('ranking-position')).toHaveTextContent('3');
    expect(screen.getByRole('heading')).toHaveTextContent('Vincitori');
  });
  it('btn-rematch solo per l\'host, emette game:rematch, errori in alert', async () => {
    const emit = vi.fn().mockResolvedValue({ ok: false, error: 'not-host' });
    const { unmount } = render(<FinalRanking view={ended()} emit={emit} />);
    await userEvent.click(screen.getByTestId('btn-rematch'));
    expect(emit).toHaveBeenCalledWith('game:rematch');
    expect(await screen.findByRole('alert')).toHaveTextContent("Solo l'host può farlo");
    unmount();
    render(<FinalRanking view={ended('b')} emit={emit} />);
    expect(screen.queryByTestId('btn-rematch')).toBeNull();
  });
});

describe('Table: fix 4.2', () => {
  const playing = (over: Partial<PlayerView> = {}) =>
    game({
      phase: 'playing', turnId: 'a', hand: [{ kind: 'suited', suit: 'picche', rank: 3 }], playableCardIds: ['picche-3'],
      currentTrick: [{ playerId: 'b', card: { kind: 'suited', suit: 'cuori', rank: 9 }, valid: true, label: null }],
      ...over,
    });
  it('le carte della presa non sono bottoni', () => {
    render(<Table view={view(playing())} emit={vi.fn()} />);
    const trick = document.querySelector('[data-testid="trick"] [data-testid="card"]') as HTMLElement;
    expect(trick.tagName).not.toBe('BUTTON');
    expect(trick).not.toHaveAttribute('aria-pressed');
    expect(trick).toHaveAttribute('aria-disabled', 'true');
    expect(trick).toHaveAttribute('data-card-id', 'cuori-9');
    expect(within(screen.getByTestId('hand')).getAllByRole('button')).toHaveLength(1);
  });
  it("l'errore sparisce quando cambia turno o fase", async () => {
    const emit = vi.fn().mockResolvedValue({ ok: false, error: 'not-your-turn' });
    const { rerender } = render(<Table view={view(playing())} emit={emit} />);
    const card = document.querySelector('[data-testid="hand"] [data-testid="card"]') as HTMLElement;
    await userEvent.click(card);
    await userEvent.click(card);
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    rerender(<Table view={view(playing({ turnId: 'b' }))} emit={emit} />);
    expect(screen.queryByRole('alert')).toBeNull();
  });
  it('ogni posto mostra dichiarate, fatte, carte in mano e punteggio', () => {
    render(<Table view={view(playing())} emit={vi.fn()} />);
    const a = within(screen.getByTestId('seat-a'));
    expect(a.getByTestId('stat-bid')).toHaveTextContent('1');
    expect(a.getByTestId('stat-made')).toHaveTextContent('1');
    expect(a.getByTestId('stat-cards')).toHaveTextContent('0');
    expect(a.getByTestId('stat-total')).toHaveTextContent('25');
  });
  it('mazziere, turno e apertura della presa segnati sui posti', () => {
    render(<Table view={view(playing())} emit={vi.fn()} />);
    expect(within(screen.getByTestId('seat-c')).getByTestId('dealer-chip')).toBeInTheDocument();
    expect(screen.getByTestId('seat-a')).toHaveAttribute('data-turn', 'true');
    expect(screen.getByTestId('seat-b')).toHaveAttribute('data-turn', 'false');
    expect(within(screen.getByTestId('seat-b')).getByTestId('leader-mark')).toBeInTheDocument();
    expect(within(screen.getByTestId('seat-a')).queryByTestId('leader-mark')).toBeNull();
  });
  it('bot e disconnessi hanno il loro badge', () => {
    const v = view(playing());
    v.seats = [seat('a'), { ...seat('b'), isBot: true }, { ...seat('c'), connected: false }];
    render(<Table view={v} emit={vi.fn()} />);
    expect(within(screen.getByTestId('seat-b')).getByTestId('badge-bot')).toBeInTheDocument();
    expect(within(screen.getByTestId('seat-c')).getByTestId('badge-offline')).toBeInTheDocument();
    expect(within(screen.getByTestId('seat-a')).queryByTestId('badge-offline')).toBeNull();
  });
  it('niente ultima presa nell interfaccia', () => {
    const g = playing({ tricksThisHand: [{ winnerId: 'b', cards: [{ playerId: 'b', card: { kind: 'suited', suit: 'fiori', rank: 2 }, valid: true, label: null }] }] });
    render(<Table view={view(g)} emit={vi.fn()} />);
    expect(screen.queryByTestId('btn-last-trick')).toBeNull();
    expect(screen.queryByText(/ultima presa/i)).toBeNull();
    expect(document.querySelector('[data-card-id="fiori-2"]')).toBeNull();
  });
});
