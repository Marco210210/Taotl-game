import { describe, expect, it } from 'vitest';
import { cardId } from '../src/cards';
import { legalBids } from '../src/bidding';
import { applyIntent, createGame } from '../src/game';
import { mulberry32 } from '../src/rng';
import { legalCards, trickSuit } from '../src/trick';
import type { Card, GameState } from '../src/types';
import { viewFor } from '../src/view';
import { simulate } from './helpers';

function cardsIn(value: unknown, out: Card[] = []): Card[] {
  if (Array.isArray(value)) value.forEach((v) => cardsIn(v, out));
  else if (value && typeof value === 'object') {
    const o = value as Record<string, unknown>;
    if (o.kind === 'suited' || o.kind === 'god' || o.kind === 'chipetl') out.push(value as Card);
    else Object.values(o).forEach((v) => cardsIn(v, out));
  }
  return out;
}

describe('viewFor', () => {
  it('non rivela mani altrui né avanzo (proprietà, ogni stato, 2..12 giocatori)', () => {
    const leaks: string[] = [];
    let checked = 0;
    for (let count = 2; count <= 12; count++) {
      for (let seed = 1; seed <= 10; seed++) {
        simulate(count, seed, {
          onState: (s) => {
            const owner = new Map<string, string>();
            for (const q of s.players) for (const card of q.hand) owner.set(cardId(card), q.id);
            for (const card of s.leftover) owner.set(cardId(card), '#leftover');
            for (const p of s.players) {
              const view = viewFor(s, p.id);
              checked++;
              const bad = (id: string) => {
                const o = owner.get(id);
                if (o !== undefined && o !== p.id) leaks.push(`${p.id} vede ${id} di ${o}`);
              };
              for (const card of cardsIn(view)) bad(cardId(card));
              view.playableCardIds.forEach(bad);
              for (const m of JSON.stringify(view).matchAll(/"((?:[a-z]+)-(?:\d+|taotl|rosso|nero))"/g)) {
                bad(m[1]!);
              }
              if ('leftover' in view || 'rng' in view || 'deck' in view) leaks.push('campo');
            }
          },
        });
      }
    }
    expect(checked).toBeGreaterThan(100_000);
    expect(leaks).toEqual([]);
  }, 30_000);

  it('tricksThisHand è uguale per tutti, ha la lunghezza giusta e si svuota dopo handEnd', () => {
    for (const count of [2, 5, 12]) {
      let prev: GameState | null = null;
      simulate(count, 3, {
        onState: (s) => {
          const views = s.players.map((p) => viewFor(s, p.id));
          for (const v of views) expect(v.tricksThisHand).toEqual(views[0]!.tricksThisHand);
          const won = s.players.reduce((a, p) => a + p.tricksWon, 0);
          expect(views[0]!.tricksThisHand).toHaveLength(won);
          if (prev?.phase === 'handEnd' && s.phase === 'bidding') {
            expect(views[0]!.tricksThisHand).toEqual([]);
          }
          prev = s;
        },
      });
    }
  });

  it('legalBids del mazziere esclude il valore vietato; playableCardIds = legalCards', () => {
    let sawDealer = false;
    let sawPlay = false;
    simulate(4, 7, {
      onState: (s) => {
        for (const [i, p] of s.players.entries()) {
          const v = viewFor(s, p.id);
          const myTurn = i === s.turnIndex;
          if (s.phase === 'bidding' && myTurn) {
            const prev = s.players.filter((q) => q.bid !== null).map((q) => q.bid as number);
            expect(v.legalBids).toEqual(legalBids(s.cardsPerPlayer, prev, i === s.dealerIndex));
            if (i === s.dealerIndex) {
              sawDealer = true;
              const total = prev.reduce((a, b) => a + b, 0);
              expect(v.legalBids).not.toContain(s.cardsPerPlayer - total);
            }
          } else expect(v.legalBids).toEqual([]);
          if (s.phase === 'playing' && myTurn) {
            sawPlay = true;
            expect(v.playableCardIds).toEqual(legalCards(p.hand, trickSuit(s.currentTrick)).map(cardId));
          } else expect(v.playableCardIds).toEqual([]);
          expect(v.turnId).toBe(s.phase === 'bidding' || s.phase === 'playing' ? s.players[s.turnIndex]!.id : null);
        }
      },
    });
    expect(sawDealer && sawPlay).toBe(true);
  });

  it('campi base e totalBid', () => {
    const rng = mulberry32(5);
    let s = createGame(['a', 'b', 'c'], { dealerIndex: 0, rng });
    const r = applyIntent(s, 'b', { type: 'bid', value: 1 });
    if (!r.ok) throw new Error(r.error);
    s = r.state;
    const v = viewFor(s, 'c');
    expect(v.me).toBe('c');
    expect(v.dealerId).toBe('a');
    expect(v.totalBid).toBe(1);
    expect(v.hand).toEqual(s.players[2]!.hand);
    expect(v.players.map((p) => p.handCount)).toEqual(s.players.map((p) => p.hand.length));
    expect(v.players[1]!.bid).toBe(1);
  });

  it('lancia per giocatore sconosciuto', () => {
    const s = createGame(['a', 'b'], { dealerIndex: 0, rng: mulberry32(1) });
    expect(() => viewFor(s, 'zz')).toThrow();
  });

  it('non condivide riferimenti mutabili con lo stato', () => {
    let found: GameState | undefined;
    simulate(3, 2, {
      onState: (st) => {
        if (!found && st.tricksThisHand.length > 0 && st.currentTrick.length > 0) found = st;
      },
    });
    const st = found as GameState;
    const before = JSON.stringify(st);
    const me = st.players[0]!.id;
    const v = viewFor(st, me);
    v.hand.pop();
    v.hand.forEach((x) => Object.assign(x, { kind: 'x' }));
    v.players.forEach((p) => {
      p.handScores.push(99);
      p.total = 999;
    });
    v.currentTrick.forEach((pc) => {
      pc.valid = !pc.valid;
      Object.assign(pc.card, { kind: 'x' });
    });
    v.currentTrick.pop();
    v.tricksThisHand.forEach((t) => {
      t.cards.forEach((pc) => Object.assign(pc.card, { kind: 'x' }));
      t.cards.pop();
      t.winnerId = 'zz';
    });
    v.tricksThisHand.pop();
    v.legalBids.push(1);
    v.playableCardIds.push('x');
    expect(JSON.stringify(st)).toBe(before);
  });
});
