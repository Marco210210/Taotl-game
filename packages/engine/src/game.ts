import { legalBids } from './bidding';
import { cardId, createDeck } from './cards';
import { cardsPerHand, deal } from './deal';
import { shuffle } from './rng';
import { handScore } from './scoring';
import { godPlayStatus, legalCards, trickSuit, trickWinner } from './trick';
import {
  DEFAULT_RULES,
  type GameState,
  type Intent,
  type PlayedCard,
  type PlayerId,
  type Result,
  type RuleConfig,
} from './types';

type HandNo = 1 | 2 | 3 | 4 | 5 | 6;

function sameConfig(a: RuleConfig, b: RuleConfig): boolean {
  return (
    a.scoring === b.scoring &&
    a.perfectGameBonus === b.perfectGameBonus &&
    a.taotlGrace === b.taotlGrace
  );
}

/** Nuova mescolata e distribuzione per la mano `handNumber`. */
function dealHand(
  playerCount: number,
  handNumber: number,
  rng: () => number,
): { hands: GameState['players'][number]['hand'][]; leftover: GameState['leftover']; n: number } {
  const n = cardsPerHand(playerCount, handNumber as HandNo);
  const { hands, leftover } = deal(shuffle(createDeck(), rng), playerCount, n);
  return { hands, leftover, n };
}

export function createGame(
  playerIds: PlayerId[],
  opts: { dealerIndex: number; rng: () => number; config?: RuleConfig },
): GameState {
  const count = playerIds.length;
  if (count < 2 || count > 12) throw new Error(`Numero di giocatori non valido: ${count}`);
  if (new Set(playerIds).size !== count) throw new Error('Gli id dei giocatori devono essere unici');
  if (!Number.isInteger(opts.dealerIndex) || opts.dealerIndex < 0 || opts.dealerIndex >= count) {
    throw new Error(`Indice del mazziere non valido: ${opts.dealerIndex}`);
  }
  const config = opts.config ?? DEFAULT_RULES;
  if (!sameConfig(config, DEFAULT_RULES)) {
    throw new Error('Configurazione non supportata: solo le regole di default');
  }
  const { hands, leftover, n } = dealHand(count, 1, opts.rng);
  const first = (opts.dealerIndex + 1) % count;
  return {
    config: { ...DEFAULT_RULES },
    players: playerIds.map((id, i) => ({
      id,
      hand: hands[i]!,
      bid: null,
      tricksWon: 0,
      handScores: [],
      total: 0,
    })),
    dealerIndex: opts.dealerIndex,
    handNumber: 1,
    cardsPerPlayer: n,
    leftover,
    phase: 'bidding',
    turnIndex: first,
    leaderIndex: first,
    currentTrick: [],
    tricksThisHand: [],
  };
}

export function applyIntent(s: GameState, playerId: PlayerId, intent: Intent): Result<GameState> {
  const idx = s.players.findIndex((p) => p.id === playerId);
  if (idx < 0) return { ok: false, error: 'unknown-player' };
  const expectedPhase = intent.type === 'bid' ? 'bidding' : 'playing';
  if (s.phase !== expectedPhase) return { ok: false, error: 'wrong-phase' };
  if (idx !== s.turnIndex) return { ok: false, error: 'not-your-turn' };
  return intent.type === 'bid' ? applyBid(s, idx, intent.value) : applyPlay(s, idx, intent);
}

function applyBid(s: GameState, idx: number, value: number): Result<GameState> {
  const previous = s.players.filter((p) => p.bid !== null).map((p) => p.bid as number);
  const legal = legalBids(s.cardsPerPlayer, previous, idx === s.dealerIndex);
  if (!legal.includes(value)) return { ok: false, error: 'illegal-bid' };
  const count = s.players.length;
  const players = s.players.map((p, i) => (i === idx ? { ...p, bid: value } : p));
  const done = idx === s.dealerIndex;
  const first = (s.dealerIndex + 1) % count;
  return {
    ok: true,
    state: {
      ...s,
      players,
      phase: done ? 'playing' : 'bidding',
      turnIndex: done ? first : (idx + 1) % count,
      leaderIndex: first,
    },
  };
}

function applyPlay(
  s: GameState,
  idx: number,
  intent: Extract<Intent, { type: 'play' }>,
): Result<GameState> {
  const player = s.players[idx]!;
  const card = player.hand.find((x) => cardId(x) === intent.cardId);
  if (!card) return { ok: false, error: 'card-not-in-hand' };
  const suit = trickSuit(s.currentTrick);
  if (!legalCards(player.hand, suit).includes(card)) {
    return { ok: false, error: 'card-not-playable' };
  }

  let played: PlayedCard;
  if (card.kind === 'suited') {
    played = { playerId: player.id, card, valid: true, label: null };
  } else if (card.kind === 'chipetl') {
    played = { playerId: player.id, card, valid: false, label: null };
  } else if (godPlayStatus(card.god, suit) === 'null') {
    played = { playerId: player.id, card, valid: false, label: 'Nullo' };
  } else if (intent.declareChipetl === undefined) {
    return { ok: false, error: 'choice-required' };
  } else if (intent.declareChipetl) {
    played = { playerId: player.id, card, valid: false, label: 'Chipetl' };
  } else {
    played = { playerId: player.id, card, valid: true, label: null };
  }

  const count = s.players.length;
  const currentTrick = [...s.currentTrick, played];
  let players = s.players.map((p, i) =>
    i === idx ? { ...p, hand: p.hand.filter((x) => x !== card) } : p,
  );

  if (currentTrick.length < count) {
    return { ok: true, state: { ...s, players, currentTrick, turnIndex: (idx + 1) % count } };
  }

  const winnerId = currentTrick[trickWinner(currentTrick)]!.playerId;
  const winnerIndex = players.findIndex((p) => p.id === winnerId);
  players = players.map((p, i) => (i === winnerIndex ? { ...p, tricksWon: p.tricksWon + 1 } : p));
  return {
    ok: true,
    state: {
      ...s,
      players,
      phase: 'trickEnd',
      currentTrick: [],
      tricksThisHand: [...s.tricksThisHand, { cards: currentTrick, winnerId }],
      turnIndex: winnerIndex,
      leaderIndex: winnerIndex,
    },
  };
}

export function advance(s: GameState, rng: () => number): GameState {
  if (s.phase === 'trickEnd') {
    if (s.players.every((p) => p.hand.length === 0)) {
      const players = s.players.map((p) => {
        const score = handScore(s.handNumber, p.bid ?? 0, p.tricksWon, s.config);
        return { ...p, handScores: [...p.handScores, score], total: p.total + score };
      });
      return { ...s, players, phase: 'handEnd' };
    }
    return { ...s, phase: 'playing' };
  }
  if (s.phase === 'handEnd') {
    if (s.handNumber >= 6) return { ...s, phase: 'gameOver' };
    const count = s.players.length;
    const handNumber = s.handNumber + 1;
    const dealerIndex = (s.dealerIndex + 1) % count;
    const { hands, leftover, n } = dealHand(count, handNumber, rng);
    const first = (dealerIndex + 1) % count;
    return {
      ...s,
      players: s.players.map((p, i) => ({ ...p, hand: hands[i]!, bid: null, tricksWon: 0 })),
      dealerIndex,
      handNumber,
      cardsPerPlayer: n,
      leftover,
      phase: 'bidding',
      turnIndex: first,
      leaderIndex: first,
      currentTrick: [],
      tricksThisHand: [],
    };
  }
  return s;
}

/** Termina subito la partita; la mano in corso non viene conteggiata. */
export function endGameNow(s: GameState): GameState {
  return { ...s, phase: 'gameOver' };
}
