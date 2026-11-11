import { DEFAULT_RULES, type PlayerId, type RuleConfig } from './types';

/** Punteggio di una mano (§6.1): m = numero mano, bid = D, made = F. */
export function handScore(
  m: number,
  bid: number,
  made: number,
  cfg: RuleConfig = DEFAULT_RULES,
): number {
  if (cfg.scoring !== 'progressive') {
    throw new Error(`Punteggio non supportato: ${cfg.scoring}`);
  }
  if (made === bid) return 10 * m + 5 * m * bid;
  return -5 * m * Math.abs(made - bid);
}

/** Classifica per totale decrescente; pari merito = stessa posizione (1,1,3). */
export function ranking(
  players: { id: PlayerId; total: number }[],
): { id: PlayerId; total: number; position: number; winner: boolean }[] {
  const sorted = [...players].sort((a, b) => b.total - a.total);
  const max = sorted[0]?.total ?? 0;
  return sorted.map((p, i) => {
    const first = sorted.findIndex((q) => q.total === p.total);
    return { id: p.id, total: p.total, position: first + 1, winner: p.total === max };
  });
}
