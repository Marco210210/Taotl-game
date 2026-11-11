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

export type Res<T = object> = ({ ok: true } & T) | { ok: false; error: string };

/** Emette un evento con ack e restituisce la risposta come promessa. */
export function request<T = object>(s: AppSocket, ev: keyof ClientToServerEvents, ...args: unknown[]): Promise<Res<T>> {
  return new Promise((resolve) => {
    (s as unknown as { emit: (e: string, ...a: unknown[]) => void }).emit(ev, ...args, (r: Res<T>) => resolve(r));
  });
}
