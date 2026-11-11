export type Suit = 'picche' | 'cuori' | 'quadri' | 'fiori' | 'totem';
export type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;
export type Card =
  | { kind: 'suited'; suit: Suit; rank: Rank }
  | { kind: 'god'; god: 'rosso' | 'nero' | 'taotl' }
  | { kind: 'chipetl'; n: 1 | 2 | 3 | 4 };
/** 'cuori-14' | 'totem-11' | 'god-taotl' | 'chipetl-3' */
export type CardId = string;
export type PlayerId = string;

export interface PlayedCard {
  playerId: PlayerId;
  card: Card;
  /** true per carte di colore; per i Chipetl false; per i Dei, il loro stato (§5.3) */
  valid: boolean;
  label: null | 'Chipetl' | 'Nullo';
}
export interface CompletedTrick {
  cards: PlayedCard[];
  winnerId: PlayerId;
}
export type Phase = 'bidding' | 'playing' | 'trickEnd' | 'handEnd' | 'gameOver';

export interface RuleConfig {
  scoring: 'progressive' | 'classic';
  perfectGameBonus: number;
  taotlGrace: boolean;
}
export const DEFAULT_RULES: RuleConfig = {
  scoring: 'progressive',
  perfectGameBonus: 0,
  taotlGrace: false,
};

export interface PlayerState {
  id: PlayerId;
  hand: Card[];
  bid: number | null;
  tricksWon: number;
  handScores: number[];
  total: number;
}
export interface GameState {
  config: RuleConfig;
  players: PlayerState[];
  dealerIndex: number;
  handNumber: number;
  cardsPerPlayer: number;
  leftover: Card[];
  phase: Phase;
  turnIndex: number;
  leaderIndex: number;
  currentTrick: PlayedCard[];
  tricksThisHand: CompletedTrick[];
}

export type Intent =
  | { type: 'bid'; value: number }
  | { type: 'play'; cardId: CardId; declareChipetl?: boolean };
export type EngineError =
  | 'wrong-phase'
  | 'not-your-turn'
  | 'illegal-bid'
  | 'card-not-in-hand'
  | 'card-not-playable'
  | 'choice-required'
  | 'unknown-player';
export type Result<T> = { ok: true; state: T } | { ok: false; error: EngineError };

export interface PlayerView {
  me: PlayerId;
  hand: Card[];
  players: {
    id: PlayerId;
    handCount: number;
    bid: number | null;
    tricksWon: number;
    handScores: number[];
    total: number;
  }[];
  dealerId: PlayerId;
  handNumber: number;
  cardsPerPlayer: number;
  phase: Phase;
  turnId: PlayerId | null;
  currentTrick: PlayedCard[];
  trickSuit: Suit | null;
  tricksThisHand: CompletedTrick[];
  totalBid: number;
  /** vuoto se non tocca a me dichiarare */
  legalBids: number[];
  /** vuoto se non tocca a me giocare */
  playableCardIds: CardId[];
}
