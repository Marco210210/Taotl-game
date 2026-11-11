import { legalBids } from './bidding';
import { cardId } from './cards';
import { legalCards, trickSuit } from './trick';
import type { Card, GameState, PlayedCard, PlayerId, PlayerView } from './types';

const copyCard = (c: Card): Card => ({ ...c });
const copyPlayed = (p: PlayedCard): PlayedCard => ({ ...p, card: copyCard(p.card) });

/** Vista di `me`: solo ciò che può vedere (mai mani altrui, avanzo o mazzo). */
export function viewFor(s: GameState, me: PlayerId): PlayerView {
  const idx = s.players.findIndex((p) => p.id === me);
  if (idx < 0) throw new Error(`Giocatore sconosciuto: ${me}`);
  const mine = s.players[idx]!;
  const active = s.phase === 'bidding' || s.phase === 'playing';
  const myTurn = active && idx === s.turnIndex;
  const suit = trickSuit(s.currentTrick);
  const bids = s.players.filter((p) => p.bid !== null).map((p) => p.bid as number);

  return {
    me,
    hand: mine.hand.map(copyCard),
    players: s.players.map((p) => ({
      id: p.id,
      handCount: p.hand.length,
      bid: p.bid,
      tricksWon: p.tricksWon,
      handScores: [...p.handScores],
      total: p.total,
    })),
    dealerId: s.players[s.dealerIndex]!.id,
    handNumber: s.handNumber,
    cardsPerPlayer: s.cardsPerPlayer,
    phase: s.phase,
    turnId: active ? s.players[s.turnIndex]!.id : null,
    currentTrick: s.currentTrick.map(copyPlayed),
    trickSuit: suit,
    tricksThisHand: s.tricksThisHand.map((t) => ({
      winnerId: t.winnerId,
      cards: t.cards.map(copyPlayed),
    })),
    totalBid: bids.reduce((a, b) => a + b, 0),
    legalBids:
      s.phase === 'bidding' && myTurn
        ? legalBids(s.cardsPerPlayer, bids, idx === s.dealerIndex)
        : [],
    playableCardIds:
      s.phase === 'playing' && myTurn ? legalCards(mine.hand, suit).map(cardId) : [],
  };
}
