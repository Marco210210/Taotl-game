import { cardId, createDeck, type Card as CardT, type PlayedCard, type PlayerView } from '@taotl/engine';
import type { RoomView } from '@taotl/protocol';
import { Table } from './Table';

const NAMES = ['Marco', 'Giulia', 'Bot Ixtli', 'Francesca', 'Luca', 'Bot Coatl', 'Alessandro', 'Sara', 'Bot Tecpatl', 'Matteo', 'Chiara', 'Bot Ollin'];

/** Solo sviluppo: tavolo con dati finti. /dev/table?n=4&phase=playing|bidding|trickEnd|handEnd */
export function TablePreview() {
  const q = new URLSearchParams(location.search);
  const n = Math.min(12, Math.max(2, Number(q.get('n') ?? 4)));
  const phase = (q.get('phase') ?? 'playing') as PlayerView['phase'];
  const deck = createDeck();
  const per = Math.floor(72 / n);
  const hand: CardT[] = deck.filter((_, i) => i % n === 0).slice(0, Math.min(per, 12));
  const ids = NAMES.slice(0, n).map((_, i) => `p${i}`);
  const played = Math.min(n - 1, Math.ceil(n / 2) + 1);
  const leader = 2 % n;
  const trick: PlayedCard[] = Array.from({ length: phase === 'trickEnd' ? n : played }, (_, k) => {
    const pid = ids[(leader + k) % n]!;
    const card = deck[(k * 7 + 3) % deck.length]!;
    const label = card.kind === 'god' ? 'Nullo' : null;
    return { playerId: pid, card, valid: true, label };
  });
  const turnId = phase === 'bidding' ? ids[0]! : ids[(leader + played) % n]!;
  const game: PlayerView = {
    me: 'p0',
    hand,
    players: ids.map((id, i) => ({ id, handCount: hand.length - (i % 2), bid: phase === 'bidding' && i < 2 ? null : (i * 3) % 5, tricksWon: i % 3, handScores: [((i * 7) % 11) - 4], total: ((i * 37) % 90) - 20 })),
    dealerId: ids[n - 1]!,
    handNumber: 3,
    cardsPerPlayer: per,
    phase,
    turnId: phase === 'trickEnd' || phase === 'handEnd' ? null : turnId,
    currentTrick: phase === 'bidding' ? [] : trick,
    trickSuit: 'cuori',
    tricksThisHand: phase === 'trickEnd' ? [{ cards: trick, winnerId: ids[(leader + 1) % n]! }] : [],
    totalBid: 7,
    legalBids: phase === 'bidding' && turnId === 'p0' ? Array.from({ length: per + 1 }, (_, i) => i).filter((v) => v !== 3) : [],
    playableCardIds: phase === 'playing' && turnId === 'p0' ? hand.filter((_, i) => i % 3 !== 1).map(cardId) : [],
  };
  if (phase === 'playing' && q.get('mine') === '1') {
    game.turnId = 'p0';
    game.playableCardIds = hand.filter((_, i) => i % 3 !== 1).map(cardId);
  }
  const view: RoomView = {
    code: 'K7QX',
    me: 'p0',
    hostId: 'p0',
    status: 'playing',
    seats: ids.map((id, i) => ({ id, nickname: NAMES[i]!, isBot: NAMES[i]!.startsWith('Bot'), connected: i !== 4, botControlled: false })),
    game,
    pause: null,
  };
  return <Table view={view} emit={(async () => ({ ok: true })) as unknown as Parameters<typeof Table>[0]["emit"]} />;
}
