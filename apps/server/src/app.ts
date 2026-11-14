import { createServer, type Server as HttpServer } from 'node:http';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import express from 'express';
import { Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@taotl/protocol';
import type { ServerConfig } from './config';
import { RoomManager } from './roomManager';
import { roomViewFor } from './roomView';
import { attachSocket } from './socket';
import { cryptoRng } from './tokens';

const SWEEP_INTERVAL_MS = 60_000;

export interface App {
  httpServer: HttpServer;
  io: Server<ClientToServerEvents, ServerToClientEvents>;
  manager: RoomManager;
  close(): Promise<void>;
}

const NO_CACHE = 'no-cache';
/** File che devono sempre essere ricontrollati: pagina, service worker, manifest (SPEC §7.4). */
const ALWAYS_FRESH = new Set(['index.html', 'sw.js', 'registerSW.js', 'manifest.webmanifest']);

/**
 * Cache HTTP dei file del client: asset con hash nel nome per un anno (immutabili),
 * service worker, manifest e pagina sempre ricontrollati, così un aggiornamento arriva subito.
 */
export function setStaticHeaders(res: { setHeader(name: string, value: string): unknown }, file: string): void {
  const rel = file.split(path.sep).join('/');
  const name = rel.slice(rel.lastIndexOf('/') + 1);
  if (ALWAYS_FRESH.has(name) || /^workbox-[\w-]+\.js$/.test(name)) res.setHeader('Cache-Control', NO_CACHE);
  else if (rel.includes('/assets/')) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  else res.setHeader('Cache-Control', 'public, max-age=86400');
  if (name === 'manifest.webmanifest') res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
  if (name === 'sw.js') res.setHeader('Service-Worker-Allowed', '/');
}

/** apps/client/dist, relativo a apps/server/src (dev) e apps/server/dist (bundle). */
function clientDist(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');
}

export function createApp(cfg: ServerConfig, deps: { rng?: () => number } = {}): App {
  const expressApp = express();
  const httpServer = createServer(expressApp);
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer);

  const manager: RoomManager = new RoomManager({
    rng: deps.rng ?? cryptoRng,
    now: () => Date.now(),
    setTimer: (fn, ms) => {
      const t = setTimeout(fn, ms);
      return () => clearTimeout(t);
    },
    cfg,
    onChange: (room) => {
      for (const seat of room.seats) {
        if (seat.isBot || !seat.socketId) continue;
        io.sockets.sockets.get(seat.socketId)?.emit('room:state', roomViewFor(room, seat.id));
      }
    },
  });
  attachSocket(io, manager);

  const dist = clientDist();
  if (existsSync(path.join(dist, 'index.html'))) {
    expressApp.use(express.static(dist, { setHeaders: setStaticHeaders }));
    expressApp.get('/r/*', (_req, res) => res.sendFile(path.join(dist, 'index.html'), { headers: { 'Cache-Control': NO_CACHE } }));
  }

  const sweep = setInterval(() => manager.sweep(Date.now()), SWEEP_INTERVAL_MS);

  return {
    httpServer,
    io,
    manager,
    close: async () => {
      clearInterval(sweep);
      manager.dispose();
      await io.close();
    },
  };
}
