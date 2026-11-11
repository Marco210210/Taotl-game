import { describe, expect, it } from 'vitest';
import { botMove } from '../src/bot';
import { cardId } from '../src/cards';
import { chooseBid } from '../src/bot/estimate';
import { cardRank } from '../src/bot/play';
import { trickSuit } from '../src/trick';
import type { PlayerView } from '../src/types';
import { c, playedSeq } from './helpers';

interface ViewSpec {
  hand: string[];
  trick?: string[];
  bid?: number;
  won?: number;
  phase?: PlayerView['phase'];
  turnId?: string | null;
  totalBid?: number;
  legalBids?: number[];
  cardsPerPlayer?: number;
}

function makeView(s: ViewSpec): PlayerView {
  const hand = s.hand.map(c);
  const currentTrick = playedSeq(s.trick ?? []);
  return {
    me: 'me',
    hand,
    players: [
      { id: 'me', handCount: hand.length, bid: s.bid ?? null, tricksWon: s.won ?? 0, handScores: [], total: 0 },
      { id: 'p0', handCount: hand.length, bid: 1, tricksWon: 0, handScores: [], total: 0 },
    ],
    dealerId: 'p0',
    handNumber: 1,
    cardsPerPlayer: s.cardsPerPlayer ?? 3,
    phase: s.phase ?? 'playing',
    turnId: s.turnId === undefined ? 'me' : s.turnId,
    currentTrick,
    trickSuit: trickSuit(currentTrick),
    tricksThisHand: [],
    totalBid: s.totalBid ?? 0,
    legalBids: s.legalBids ?? [],
    playableCardIds: hand.map(cardId),
  };
}

describe('botMove: scenari di gioco', () => {
  it('need 1, presa [5♥], mano {6♥,K♥,2♣} -> 6♥', () => {
    const v = makeView({ hand: ['6♥', 'K♥', '2♣'], trick: ['5♥'], bid: 1 });
    expect(botMove(v)).toEqual({ type: 'play', cardId: 'cuori-6' });
  });

  it('need 0, presa [5♥, 2T altrui], mano {A♥,3♥} -> A♥', () => {
    const v = makeView({ hand: ['A♥', '3♥'], trick: ['5♥', '2T'], bid: 0 });
    expect(botMove(v)).toEqual({ type: 'play', cardId: 'cuori-14' });
  });

  it('need 0, presa [5♥, 9♥], mano {DR, K♥} -> DR con declareChipetl true', () => {
    const v = makeView({ hand: ['DR', 'K♥'], trick: ['5♥', '9♥'], bid: 0 });
    expect(botMove(v)).toEqual({ type: 'play', cardId: 'god-rosso', declareChipetl: true });
  });

  it('need 1, presa [3T], mano {TAO, AT} -> AT (il Taotl si conserva)', () => {
    const v = makeView({ hand: ['TAO', 'AT'], trick: ['3T'], bid: 1 });
    expect(botMove(v)).toEqual({ type: 'play', cardId: 'totem-14' });
  });

  it('need 0, apre, mano {AT, 2♣} -> 2♣', () => {
    const v = makeView({ hand: ['AT', '2♣'], bid: 0 });
    expect(botMove(v)).toEqual({ type: 'play', cardId: 'fiori-2' });
  });

  it('stessa vista due volte, stesso intent', () => {
    const v = makeView({ hand: ['6♥', 'K♥', '2♣'], trick: ['5♥'], bid: 1 });
    expect(botMove(v)).toEqual(botMove(v));
  });

  it('need 1 con un Dio in choice che serve a vincere: Valido (senza declareChipetl true)', () => {
    const v = makeView({ hand: ['DR', '2♣'], trick: ['5♥'], bid: 1 });
    expect(botMove(v)).toEqual({ type: 'play', cardId: 'god-rosso', declareChipetl: false });
  });

  it('need > 0 e nessuna carta vince: gioca la carta più bassa, non un Dio', () => {
    const v = makeView({ hand: ['DR', '2♣'], trick: ['5♥', 'AT'], bid: 1 });
    expect(botMove(v)).toEqual({ type: 'play', cardId: 'fiori-2' });
  });

  it('need > 0, nessuna carta vince, solo un Dio in choice: lo gioca come Chipetl', () => {
    const v = makeView({ hand: ['DR'], trick: ['5♥', 'AT'], bid: 1 });
    expect(botMove(v)).toEqual({ type: 'play', cardId: 'god-rosso', declareChipetl: true });
  });

  it('need 0, apre, mano {DN, 2♣}: non apre con il Dio', () => {
    const v = makeView({ hand: ['DN', '2♣'], bid: 0 });
    expect(botMove(v)).toEqual({ type: 'play', cardId: 'fiori-2' });
  });

  it('far sballare: avversario che ha già raggiunto la dichiarazione non viene superato', () => {
    const v = makeView({ hand: ['A♥', '3♥'], trick: ['5♥'], bid: 0 });
    v.players[1] = { ...v.players[1]!, bid: 1, tricksWon: 1 };
    expect(botMove(v)).toEqual({ type: 'play', cardId: 'cuori-3' });
  });

  it('lancia in gioco senza dichiarazione', () => {
    expect(() => botMove(makeView({ hand: ['2♣'] }))).toThrow();
  });

  it('apre con need > 0 e meno carte quasi sicure di need: carta alta del colore più lungo', () => {
    const v = makeView({ hand: ['KT', 'AT', '3♥', '9♥', '4♣'], bid: 1 });
    expect(botMove(v)).toEqual({ type: 'play', cardId: 'cuori-9' });
  });

  it('apre con need >= carte quasi sicure: la più forte quasi sicura, mai un Dio', () => {
    const v = makeView({ hand: ['TAO', 'QT', 'AT', '3♥'], bid: 3 });
    expect(botMove(v)).toEqual({ type: 'play', cardId: 'totem-14' });
  });

  it('un Dio nullo non include declareChipetl', () => {
    const v = makeView({ hand: ['DN'], trick: ['5♥'], bid: 0 });
    expect(botMove(v)).toEqual({ type: 'play', cardId: 'god-nero' });
  });

  it('need 0 con presa vinta da altri: scarta la più forte che non supera', () => {
    const v = makeView({ hand: ['3♥', '8♥', 'AT'], trick: ['5♥', '9♥'], bid: 0 });
    expect(botMove(v)).toEqual({ type: 'play', cardId: 'cuori-8' });
  });
});

describe('botMove: dichiarazione e guardie', () => {
  it('lancia se non è il suo turno', () => {
    expect(() => botMove(makeView({ hand: ['2♣'], turnId: 'p0' }))).toThrow();
  });

  it('lancia in fasi diverse da bidding/playing', () => {
    expect(() => botMove(makeView({ hand: ['2♣'], phase: 'trickEnd' }))).toThrow();
  });

  it('bidding: restituisce una dichiarazione lecita', () => {
    const v = makeView({
      hand: ['TAO', 'AT', 'KT'],
      phase: 'bidding',
      legalBids: [0, 1, 2, 3],
      cardsPerPlayer: 3,
    });
    expect(botMove(v)).toEqual({ type: 'bid', value: 3 });
  });

  it('bidding con somma già >= N: stima per difetto (2.7 -> 2)', () => {
    const v = makeView({
      hand: ['TAO', 'AT', 'KT'],
      phase: 'bidding',
      legalBids: [0, 1, 2, 3],
      cardsPerPlayer: 3,
      totalBid: 3,
    });
    expect(botMove(v)).toEqual({ type: 'bid', value: 2 });
  });

  it('chooseBid mode floor', () => {
    const h = ['TAO', 'AT', 'KT'].map(c);
    expect(chooseBid(h, 3, 4, [0, 1, 2, 3], 'floor')).toBe(2);
    expect(chooseBid(h, 3, 4, [0, 1, 2, 3])).toBe(3);
  });
});

describe('cardRank', () => {
  it('ordine dei valori', () => {
    expect(cardRank(c('CH1'))).toBe(0);
    expect(cardRank(c('2♣'))).toBe(2);
    expect(cardRank(c('AT'))).toBe(54);
    expect(cardRank(c('10T'))).toBe(30);
    expect(cardRank(c('DR'))).toBe(35);
    expect(cardRank(c('JT'))).toBe(51);
    expect(cardRank(c('TAO'))).toBe(60);
  });
});
