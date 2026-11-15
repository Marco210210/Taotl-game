export interface ServerConfig {
  port: number;
  /** Interfaccia di ascolto; undefined = tutte (default di Node). */
  host?: string;
  botMoveDelayMs: number;
  trickPauseMs: number;
  disconnectGraceMs: number;
  /** Dopo la grazia, se l'host non sceglie entro questo tempo il bot prende il posto da solo. */
  autoBotMs: number;
  roomIdleMs: number;
}

function num(v: string | undefined, def: number): number {
  if (v === undefined || v.trim() === '') return def;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : def;
}

export function loadConfig(env: Record<string, string | undefined> = process.env): ServerConfig {
  return {
    port: num(env.PORT, 3000),
    host: env.HOST?.trim() || undefined,
    botMoveDelayMs: num(env.BOT_MOVE_DELAY_MS, 800),
    trickPauseMs: num(env.TRICK_PAUSE_MS, 2000),
    disconnectGraceMs: num(env.DISCONNECT_GRACE_MS, 120000),
    autoBotMs: num(env.AUTO_BOT_MS, 60000),
    roomIdleMs: num(env.ROOM_IDLE_MS, 1800000),
  };
}
