import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@taotl/protocol';

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: AppSocket | null = null;
export function getSocket(): AppSocket {
  return (socket ??= io());
}

const key = (code: string) => `taotl:token:${code.toUpperCase()}`;
export function getToken(code: string): string | null {
  try {
    return localStorage.getItem(key(code));
  } catch {
    return null;
  }
}
export function setToken(code: string, token: string): void {
  try {
    localStorage.setItem(key(code), token);
    localStorage.setItem(CURRENT, code.toUpperCase());
  } catch {
    /* localStorage non disponibile */
  }
}

export function removeToken(code: string): void {
  try {
    localStorage.removeItem(key(code));
  } catch {
    /* localStorage non disponibile */
  }
  clearCurrentRoom(code);
}

/**
 * Stanza in corso (SPEC §7.2): chi chiude l'app e la riapre torna direttamente lì, finché la partita
 * non finisce. Si imposta entrando in una stanza e si cancella a fine partita, espulsione o stanza sparita.
 */
const CURRENT = 'taotl:current-room';
export function getCurrentRoom(): string | null {
  try {
    const code = localStorage.getItem(CURRENT);
    return code && getToken(code) ? code : null;
  } catch {
    return null;
  }
}
export function clearCurrentRoom(code?: string): void {
  try {
    if (!code || localStorage.getItem(CURRENT) === code.toUpperCase()) localStorage.removeItem(CURRENT);
  } catch {
    /* localStorage non disponibile */
  }
}

type Ev = keyof ClientToServerEvents;
type Params<E extends Ev> = Parameters<ClientToServerEvents[E]>;
/** Argomenti dell'evento, escluso l'ack finale. */
export type EmitArgs<E extends Ev> = Params<E> extends [...infer A, unknown] ? A : never;
/** Risultato dell'ack dell'evento. */
export type EmitResult<E extends Ev> = Params<E> extends [...unknown[], (r: infer R) => void] ? R : never;
export type TypedEmit = <E extends Ev>(ev: E, ...args: EmitArgs<E>) => Promise<EmitResult<E>>;

/** Emette un evento con ack e restituisce la risposta come promessa. */
export const request =
  (s: AppSocket): TypedEmit =>
  (ev, ...args) =>
    new Promise((resolve) => {
      // unico punto non tipizzato: la signature di socket.io non sa unire argomenti e ack
      (s.emit as (e: string, ...a: unknown[]) => void).call(s, ev, ...args, resolve);
    });
