import { describe, expect, it } from 'vitest';
import { cardId } from '../src/cards';
import { advance, applyIntent, createGame, endGameNow } from '../src/game';
import { mulberry32 } from '../src/rng';
import { DEFAULT_RULES, type GameState, type Intent } from '../src/types';
import { c, randomLegalIntent, simulate } from './helpers';

const ids = ['a', 'b', 'c', 'd'];
function fresh(dealerIndex = 0): GameState {
  return createGame(ids, { dealerIndex, rng: mulberry32(7) });
}
function ok(s: GameState, id: string, i: Intent): GameState {
  const r = applyIntent(s, id, i);
  if (!r.ok) throw new Error(r.error);
  return r.state;
}
function err(s: GameState, id: string, i: Intent) {
  const r = applyIntent(s, id, i);
  return r.ok ? 'ok' : r.error;
}
/** Stato in fase playing con mani fissate (giocatori p0..pk). */
function playing(hands: string[][], dealer = 0): GameState {
  const s = createGame(
    hands.map((_, i) => `p${i}`),
    { dealerIndex: dealer, rng: mulberry32(1) },
  );
  return {
    ...s,
    cardsPerPlayer: hands[0]!.length,
    players: s.players.map((p, i) => ({ ...p, hand: hands[i]!.map(c), bid: 0 })),
    phase: 'playing',
  };
}
const play = (str: string, declareChipetl?: boolean): Intent => ({
  type: 'play',
  cardId: cardId(c(str)),
  ...(declareChipetl === undefined ? {} : { declareChipetl }),
});

describe('createGame', () => {
  it('parte da mano 1 in bidding dal posto dopo il mazziere', () => {
    const s = fresh(2);
    expect(s.phase).toBe('bidding');
    expect(s.handNumber).toBe(1);
    expect(s.turnIndex).toBe(3);
    expect(s.leaderIndex).toBe(3);
    expect(s.players.every((p) => p.hand.length === 18 && p.bid === null)).toBe(true);
  });
  it('createGame con config non di default lancia un errore', () => {
    expect(() =>
      createGame(ids, {
        dealerIndex: 0,
        rng: mulberry32(1),
        config: { ...DEFAULT_RULES, taotlGrace: true },
      }),
    ).toThrow();
  });
  it('rifiuta giocatori/mazziere non validi', () => {
    const o = { dealerIndex: 0, rng: mulberry32(1) };
    expect(() => createGame(['a'], o)).toThrow();
    expect(() => createGame(['a', 'a'], o)).toThrow();
    expect(() => createGame(ids, { ...o, dealerIndex: 4 })).toThrow();
  });
});

describe('bidding', () => {
  it('bidding parte dal posto dopo il mazziere e finisce col mazziere', () => {
    let s = fresh(1);
    expect(s.turnIndex).toBe(2);
    s = ok(s, 'c', { type: 'bid', value: 3 });
    s = ok(s, 'd', { type: 'bid', value: 3 });
    s = ok(s, 'a', { type: 'bid', value: 3 });
    expect(s.phase).toBe('bidding');
    expect(s.turnIndex).toBe(1);
    s = ok(s, 'b', { type: 'bid', value: 3 });
    expect(s.phase).toBe('playing');
    expect(s.turnIndex).toBe(2);
    expect(s.leaderIndex).toBe(2);
  });
  it('il mazziere riceve illegal-bid sul valore vietato', () => {
    let s = fresh(0);
    s = ok(s, 'b', { type: 'bid', value: 5 });
    s = ok(s, 'c', { type: 'bid', value: 5 });
    s = ok(s, 'd', { type: 'bid', value: 5 });
    expect(err(s, 'a', { type: 'bid', value: 3 })).toBe('illegal-bid');
    expect(err(s, 'a', { type: 'bid', value: 4 })).toBe('ok');
  });
  it('bid fuori 0..N → illegal-bid', () => {
    const s = fresh(0);
    expect(err(s, 'b', { type: 'bid', value: 19 })).toBe('illegal-bid');
    expect(err(s, 'b', { type: 'bid', value: -1 })).toBe('illegal-bid');
    expect(err(s, 'b', { type: 'bid', value: 1.5 })).toBe('illegal-bid');
  });
  it('precedenza errori', () => {
    const s = fresh(0);
    expect(err(s, 'zz', { type: 'bid', value: 1 })).toBe('unknown-player');
    expect(err(s, 'b', play('5♥'))).toBe('wrong-phase');
    expect(err(s, 'c', { type: 'bid', value: 99 })).toBe('not-your-turn');
  });
});

describe('giocata', () => {
  it('la 1ª presa la apre il posto dopo il mazziere; la successiva la apre il vincitore', () => {
    let s = playing([['5♥', '2♠'], ['9♥', '3♠'], ['3♥', '4♠'], ['AT', '5♠']], 0);
    expect(s.turnIndex).toBe(1);
    s = ok(s, 'p1', play('9♥'));
    s = ok(s, 'p2', play('3♥'));
    s = ok(s, 'p3', play('AT'));
    s = ok(s, 'p0', play('5♥'));
    expect(s.phase).toBe('trickEnd');
    expect(s.tricksThisHand).toHaveLength(1);
    expect(s.tricksThisHand[0]!.winnerId).toBe('p3');
    expect(s.players[3]!.tricksWon).toBe(1);
    expect(s.currentTrick).toEqual([]);
    expect(s.turnIndex).toBe(3);
    s = advance(s, mulberry32(1));
    expect(s.phase).toBe('playing');
    expect(s.leaderIndex).toBe(3);
  });
  it('intent fuori turno → not-your-turn; in trickEnd → wrong-phase; stessa carta due volte rifiutata', () => {
    let s = playing([['5♥', '2♠'], ['9♥', '3♠'], ['3♥', '4♠'], ['6♥', '5♠']], 0);
    expect(err(s, 'p2', play('3♥'))).toBe('not-your-turn');
    s = ok(s, 'p1', play('9♥'));
    expect(err(s, 'p1', play('3♠'))).toBe('not-your-turn');
    s = ok(s, 'p2', play('3♥'));
    s = ok(s, 'p3', play('6♥'));
    s = ok(s, 'p0', play('5♥'));
    expect(err(s, 'p1', play('3♠'))).toBe('wrong-phase');
    expect(err(s, 'p1', { type: 'bid', value: 0 })).toBe('wrong-phase');
    // la stessa carta due volte: la seconda non è più in mano
    let t = playing([['5♥', '2♠'], ['9♥', '3♠']], 1);
    t = ok(t, 'p0', play('5♥'));
    t = ok(t, 'p1', play('9♥'));
    t = advance(t, mulberry32(1));
    expect(err(t, 'p1', play('9♥'))).toBe('card-not-in-hand');
  });
  it('card-not-in-hand; colore normale in presa di Totem con un Totem in mano → card-not-playable', () => {
    let s = playing([['5T', '2♠'], ['9♥', '3T'], ['3♥', '4♠']], 2);
    expect(err(s, 'p0', play('9♥'))).toBe('card-not-in-hand');
    s = ok(s, 'p0', play('5T'));
    expect(err(s, 'p1', play('3♥'))).toBe('card-not-in-hand');
    expect(err(s, 'p1', play('9♥'))).toBe('card-not-playable');
    expect(err(s, 'p1', play('3T'))).toBe('ok');
  });
  it('Dio in choice senza scelta → choice-required; declareChipetl → label Chipetl', () => {
    let s = playing([['5♥', '2♠'], ['DR', '3♠'], ['3♥', '4♠']], 2);
    s = ok(s, 'p0', play('5♥'));
    expect(err(s, 'p1', play('DR'))).toBe('choice-required');
    expect(ok(s, 'p1', play('DR', true)).currentTrick[1]).toMatchObject({
      valid: false,
      label: 'Chipetl',
    });
    expect(ok(s, 'p1', play('DR', false)).currentTrick[1]).toMatchObject({
      valid: true,
      label: null,
    });
  });
  it('Dio nullo: declareChipetl ignorato, etichetta Nullo; Chipetl non valido', () => {
    let s = playing([['5♠', '2♠'], ['DR', '3♠'], ['CH1', '4♠']], 2);
    s = ok(s, 'p0', play('5♠'));
    const a = ok(s, 'p1', play('DR', true));
    expect(a.currentTrick[1]).toMatchObject({ valid: false, label: 'Nullo' });
    const b = ok(a, 'p2', play('CH1'));
    expect(b.tricksThisHand[0]!.cards[2]).toMatchObject({ valid: false, label: null });
    const t = playing([['TAO', '2♠'], ['5♠', '3♠']], 1);
    expect(ok(t, 'p0', play('TAO')).currentTrick[0]).toMatchObject({
      valid: false,
      label: 'Nullo',
    });
  });
});

describe('fine mano', () => {
  it('handEnd assegna handScore a ognuno; il mazziere ruota; tricksThisHand si azzera', () => {
    let s = playing([['5♥'], ['9♥']], 0);
    s = { ...s, handNumber: 2, players: s.players.map((p, i) => ({ ...p, bid: i })) };
    s = ok(s, 'p1', play('9♥'));
    s = ok(s, 'p0', play('5♥'));
    expect(s.phase).toBe('trickEnd');
    s = advance(s, mulberry32(2));
    expect(s.phase).toBe('handEnd');
    // mano 2: p1 bid 1 fatta 1 -> 20+10; p0 bid 0 fatta 0 -> 20
    expect(s.players[1]!.handScores).toEqual([30]);
    expect(s.players[1]!.total).toBe(30);
    expect(s.players[0]!.handScores).toEqual([20]);
    const n = advance(s, mulberry32(2));
    expect(n.phase).toBe('bidding');
    expect(n.handNumber).toBe(3);
    expect(n.dealerIndex).toBe(1);
    expect(n.tricksThisHand).toEqual([]);
    expect(n.currentTrick).toEqual([]);
    expect(n.turnIndex).toBe(0);
    expect(n.leaderIndex).toBe(0);
    expect(
      n.players.every(
        (p) => p.bid === null && p.tricksWon === 0 && p.hand.length === n.cardsPerPlayer,
      ),
    ).toBe(true);
    expect(n.players[1]!.total).toBe(30);
  });
  it('dopo la 6ª mano → gameOver; altre fasi invariate; endGameNow', () => {
    const s = fresh(0);
    expect(advance(s, mulberry32(1))).toBe(s);
    const g = endGameNow({ ...s, players: s.players.map((p) => ({ ...p, total: 5 })) });
    expect(g.phase).toBe('gameOver');
    expect(g.players.every((p) => p.total === 5)).toBe(true);
    const h = { ...playing([['5♥'], ['9♥']]), phase: 'handEnd' as const, handNumber: 6 };
    expect(advance(h, mulberry32(1)).phase).toBe('gameOver');
  });
});

describe('purezza', () => {
  it('applyIntent e advance non mutano lo stato in ingresso', () => {
    const deepFreeze = <T>(o: T): T => {
      if (o && typeof o === 'object') {
        Object.values(o).forEach(deepFreeze);
        Object.freeze(o);
      }
      return o;
    };
    const rng = mulberry32(3);
    let s = deepFreeze(fresh(0));
    const snap = JSON.parse(JSON.stringify(s)) as GameState;
    const first = randomLegalIntent(s, rng);
    applyIntent(s, first.playerId, first.intent);
    expect(s).toEqual(snap);
    while (s.phase !== 'handEnd') {
      if (s.phase === 'trickEnd') s = deepFreeze(advance(s, rng));
      else {
        const r = randomLegalIntent(s, rng);
        const res = applyIntent(s, r.playerId, r.intent);
        if (!res.ok) throw new Error(res.error);
        s = deepFreeze(res.state);
      }
    }
    deepFreeze(advance(s, rng));
  });
});

describe('simulate', () => {
  for (let n = 2; n <= 12; n++) {
    it(`${n} giocatori (seed 1..20): gameOver dopo 6 mani; somma tricksWon = N`, () => {
      for (let seed = 1; seed <= 20; seed++) {
        const seen: GameState[] = [];
        const end = simulate(n, seed, {
          onState: (st) => {
            if (st.phase === 'handEnd') seen.push(st);
          },
        });
        expect(end.phase).toBe('gameOver');
        expect(seen).toHaveLength(6);
        seen.forEach((st) => {
          expect(st.players.reduce((a, p) => a + p.tricksWon, 0)).toBe(st.cardsPerPlayer);
          expect(st.tricksThisHand).toHaveLength(st.cardsPerPlayer);
        });
        expect(end.players.every((p) => p.handScores.length === 6)).toBe(true);
      }
    });
  }
});
