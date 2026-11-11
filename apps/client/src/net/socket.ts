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
