import type { Card, PlayedCard, Rank, Suit } from '../src/types';
import { godPlayStatus, trickSuit } from '../src/trick';

const NORMAL_SUITS: Record<string, Suit> = {
  '♠': 'picche',
  '♥': 'cuori',
  '♦': 'quadri',
  '♣': 'fiori',
};
const RANKS: Record<string, Rank> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  J: 11, Q: 12, K: 13, A: 14,
};
const GODS: Record<string, 'rosso' | 'nero' | 'taotl'> = { DR: 'rosso', DN: 'nero', TAO: 'taotl' };

/** Parser di notazione: '5♥' '10♣' 'AT' (Totem) 'DR' 'DN' 'TAO' 'CH1'..'CH4'. */
export function c(s: string): Card {
  if (s in GODS) return { kind: 'god', god: GODS[s]! };
  const ch = /^CH([1-4])$/.exec(s);
  if (ch) return { kind: 'chipetl', n: Number(ch[1]) as 1 | 2 | 3 | 4 };
  if (s.length >= 2) {
    const rankStr = s.slice(0, -1);
    const sym = s.slice(-1);
    const rank = RANKS[rankStr];
    if (rank !== undefined) {
      if (sym === 'T') return { kind: 'suited', suit: 'totem', rank };
      const suit = NORMAL_SUITS[sym];
      if (suit) return { kind: 'suited', suit, rank };
    }
  }
  throw new Error(`Notazione carta sconosciuta: ${s}`);
}

/**
 * Costruisce una presa da notazione. Suffisso '!' = Dio dichiarato Valido, '~' = dichiarato Chipetl.
 * Un Dio senza suffisso è nullo d'ufficio; se lo stato è 'choice' lancia un errore.
 * Autori: p0..pk nell'ordine.
 */
export function playedSeq(spec: string[]): PlayedCard[] {
  const played: PlayedCard[] = [];
  spec.forEach((raw, i) => {
    const suffix = raw.endsWith('!') || raw.endsWith('~') ? raw.slice(-1) : '';
    const card = c(suffix ? raw.slice(0, -1) : raw);
    const playerId = `p${i}`;
    if (card.kind === 'suited') {
      played.push({ playerId, card, valid: true, label: null });
    } else if (card.kind === 'chipetl') {
      played.push({ playerId, card, valid: false, label: null });
    } else {
      const status = godPlayStatus(card.god, trickSuit(played));
      if (status === 'null') {
        if (suffix) throw new Error(`Dio con suffisso ma nullo d'ufficio: ${raw}`);
        played.push({ playerId, card, valid: false, label: 'Nullo' });
      } else if (suffix === '!') {
        played.push({ playerId, card, valid: true, label: null });
      } else if (suffix === '~') {
        played.push({ playerId, card, valid: false, label: 'Chipetl' });
      } else {
        throw new Error(`Dio con scelta: serve il suffisso ! o ~: ${raw}`);
      }
    }
  });
  return played;
}

import { legalBids } from '../src/bidding';
import { cardId } from '../src/cards';
import { advance, applyIntent, createGame } from '../src/game';
import { godPlayStatus as godStatus, legalCards, trickSuit as suitOf } from '../src/trick';
import { mulberry32 } from '../src/rng';
import type { GameState, Intent, PlayerId } from '../src/types';

/** Intent casuale ma lecito per il giocatore di turno. */
export function randomLegalIntent(
  state: GameState,
  rng: () => number,
): { playerId: PlayerId; intent: Intent } {
  const p = state.players[state.turnIndex]!;
  if (state.phase === 'bidding') {
    const previous = state.players.filter((q) => q.bid !== null).map((q) => q.bid as number);
    const bids = legalBids(state.cardsPerPlayer, previous, state.turnIndex === state.dealerIndex);
    return { playerId: p.id, intent: { type: 'bid', value: bids[Math.floor(rng() * bids.length)]! } };
  }
  const suit = suitOf(state.currentTrick);
  const options = legalCards(p.hand, suit);
  const card = options[Math.floor(rng() * options.length)]!;
  const intent: Intent = { type: 'play', cardId: cardId(card) };
  if (card.kind === 'god' && godStatus(card.god, suit) === 'choice') {
    intent.declareChipetl = rng() < 0.5;
  }
  return { playerId: p.id, intent };
}

/** Porta una partita fino a gameOver; `onState` osserva ogni stato intermedio. */
export function simulate(
  playerCount: number,
  seed: number,
  opts: {
    chooser?: (state: GameState, rng: () => number) => { playerId: PlayerId; intent: Intent };
    onState?: (state: GameState) => void;
  } = {},
): GameState {
  const rng = mulberry32(seed);
  const ids = Array.from({ length: playerCount }, (_, i) => `p${i}`);
  const chooser = opts.chooser ?? randomLegalIntent;
  let state = createGame(ids, { dealerIndex: Math.floor(rng() * playerCount), rng });
  opts.onState?.(state);
  while (state.phase !== 'gameOver') {
    if (state.phase === 'trickEnd' || state.phase === 'handEnd') {
      state = advance(state, rng);
    } else {
      const { playerId, intent } = chooser(state, rng);
      const r = applyIntent(state, playerId, intent);
      if (!r.ok) throw new Error(`Intent rifiutato: ${r.error}`);
      state = r.state;
    }
    opts.onState?.(state);
  }
  return state;
}
