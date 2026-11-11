import { describe, expect, it } from 'vitest';
import { botMove, viewFor, legalBids } from '../src';
import type { GameState, Intent, PlayerId } from '../src';
import { randomLegalIntent, simulate } from './helpers';

function botChooser(state: GameState): { playerId: PlayerId; intent: Intent } {
  const id = state.players[state.turnIndex]!.id;
  return { playerId: id, intent: botMove(viewFor(state, id)) };
}

/** Quota di mani rispettate (prese vinte === dichiarate) su tutti i giocatori. */
function hitRate(chooser: ((s: GameState, rng: () => number) => { playerId: PlayerId; intent: Intent }) | undefined): number {
  let hits = 0;
  let total = 0;
  for (let seed = 1; seed <= 100; seed++) {
    simulate(4, seed, {
      chooser,
      onState: (s) => {
        if (s.phase === 'handEnd') {
          for (const p of s.players) {
            total++;
            if (p.tricksWon === p.bid) hits++;
          }
        }
      },
    });
  }
  return hits / total;
}

describe('simulazioni del bot', () => {
  it('200 partite di soli bot: ogni intent è ok e la partita arriva a gameOver; il mazziere non dichiara il valore vietato', () => {
    const failures: string[] = [];
    const dealerViolations: string[] = [];
    for (let seed = 1; seed <= 200; seed++) {
      const playerCount = 2 + (seed % 11);
      let final: GameState | undefined;
      try {
        final = simulate(playerCount, seed, {
          chooser: (state, rng) => {
            const choice = botChooser(state);
            if (choice.intent.type === 'bid' && state.turnIndex === state.dealerIndex) {
              const previous = state.players.filter((q) => q.bid !== null).map((q) => q.bid as number);
              const legal = legalBids(state.cardsPerPlayer, previous, true);
              if (!legal.includes(choice.intent.value)) dealerViolations.push(`seed ${seed}`);
            }
            void rng;
            return choice;
          },
        });
      } catch (e) {
        failures.push(`seed ${seed}: ${(e as Error).message}`);
        continue;
      }
      if (final.phase !== 'gameOver') failures.push(`seed ${seed}: non è gameOver`);
    }
    expect(failures).toEqual([]);
    expect(dealerViolations).toEqual([]);
  });

  it('qualità: i bot rispettano almeno 10 punti in più della baseline casuale (4 giocatori, seed 1..100)', () => {
    const botRate = hitRate(botChooser);
    const baselineRate = hitRate(randomLegalIntent);
    expect(botRate, `bot=${botRate.toFixed(4)} baseline=${baselineRate.toFixed(4)}`).toBeGreaterThanOrEqual(
      baselineRate + 0.1,
    );
  });
});
