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

const SWEEP_INTERVAL_MS = 60_000;

export interface App {
  httpServer: HttpServer;
  io: Server<ClientToServerEvents, ServerToClientEvents>;
  manager: RoomManager;
  close(): Promise<void>;
}

/** apps/client/dist, relativo a apps/server/src (dev) e apps/server/dist (bundle). */
function clientDist(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');
}

export function createApp(cfg: ServerConfig): App {
  const expressApp = express();
  const httpServer = createServer(expressApp);
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer);

  const manager: RoomManager = new RoomManager({
    rng: Math.random,
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
    expressApp.use(express.static(dist));
    expressApp.get('/r/*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  }

  const sweep = setInterval(() => manager.sweep(Date.now()), SWEEP_INTERVAL_MS);

  return {
    httpServer,
    io,
    manager,
    close: async () => {
      clearInterval(sweep);
      await io.close();
    },
  };
}
