/** Dichiarazioni lecite (§4): 0..n; il mazziere non può chiudere la somma a n. */
export function legalBids(n: number, previous: number[], isDealer: boolean): number[] {
  const all = Array.from({ length: n + 1 }, (_, i) => i);
  if (!isDealer) return all;
  const sum = previous.reduce((a, b) => a + b, 0);
  const forbidden = n - sum;
  if (forbidden < 0 || forbidden > n) return all;
  return all.filter((v) => v !== forbidden);
}
