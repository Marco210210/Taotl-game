import type { PlayerView } from '@taotl/engine';
import type { SeatView } from '@taotl/protocol';

type PlayerInfo = PlayerView['players'][number];

export interface Standing {
  seat: SeatView;
  player: PlayerInfo;
  /** totale delle sole mani concluse (somma di `handScores`) */
  total: number;
}

/** Totale delle mani concluse: mai i punti della mano in corso. */
export const completedTotal = (p: PlayerInfo): number => p.handScores.reduce((a, b) => a + b, 0);

/** Numero di mani concluse (tutti i giocatori ne hanno lo stesso numero). */
export const completedHands = (players: PlayerInfo[]): number => Math.max(0, ...players.map((p) => p.handScores.length));

/**
 * Classifica per totale decrescente; a parità, ordine dei posti a partire dal mazziere.
 * Usata dal riepilogo di fine mano e dal pulsante "Classifica" (SPEC §7.4).
 */
export function standings(seats: SeatView[], players: PlayerInfo[], dealerId: string): Standing[] {
  const n = seats.length;
  const dealer = Math.max(0, seats.findIndex((s) => s.id === dealerId));
  const fromDealer = (i: number) => (i - dealer + n) % n;
  return seats
    .map((seat, i) => ({ seat, i, player: players.find((p) => p.id === seat.id) }))
    .filter((x): x is { seat: SeatView; i: number; player: PlayerInfo } => x.player !== undefined)
    .map((x) => ({ ...x, total: completedTotal(x.player) }))
    .sort((a, b) => b.total - a.total || fromDealer(a.i) - fromDealer(b.i))
    .map(({ seat, player, total }) => ({ seat, player, total }));
}
