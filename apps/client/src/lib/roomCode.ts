/**
 * Codice stanza scritto a mano o incollato: accetta anche il link intero ("…/r/ABCD"),
 * spazi e minuscole. Restituisce il codice in maiuscolo, oppure null se non è un codice.
 */
export function normalizeRoomCode(input: string): string | null {
  const fromLink = /\/r\/([A-Za-z0-9]+)/.exec(input);
  const raw = (fromLink ? fromLink[1]! : input).replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  return /^[A-Z0-9]{4,8}$/.test(raw) ? raw : null;
}
