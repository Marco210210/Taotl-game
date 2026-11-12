#!/usr/bin/env bash
# Deploy del gioco Taotl sul server: install, build, restart del servizio.
# Va eseguito SUL SERVER, dentro ~/progetti/Taotl-game (lo lancia scripts/publish.mjs).
# Non legge il profilo della shell: PATH e percorsi sono espliciti.
set -euo pipefail

NODE_HOME="$HOME/.local/node-26"
export PATH="$NODE_HOME/bin:/usr/local/bin:/usr/bin:/bin"
export CI=true                                  # pnpm non interattivo
export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}"   # per systemctl --user via ssh

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE=taotl-game.service
ENV_FILE="$HOME/.config/taotl-game.env"
cd "$APP_DIR"

echo "==> node $(node -v), pnpm $(pnpm -v)"
case "$(node -v)" in v26.*) ;; *) echo "ERRORE: serve Node 26, trovato $(node -v)" >&2; exit 1;; esac

echo "==> pnpm install --frozen-lockfile"
pnpm install --frozen-lockfile

echo "==> pnpm build"
pnpm build

echo "==> restart $SERVICE"
systemctl --user restart "$SERVICE"

PORT="$(sed -n 's/^PORT=//p' "$ENV_FILE" | tail -1)"
PORT="${PORT:-8140}"
echo "==> attendo la risposta su 127.0.0.1:$PORT"
for _ in $(seq 1 30); do
  if curl -fs -o /dev/null "http://127.0.0.1:$PORT/"; then
    systemctl --user --no-pager --lines=0 status "$SERVICE" | head -3
    echo "==> deploy OK"
    exit 0
  fi
  sleep 1
done
echo "ERRORE: il servizio non risponde. Ultimi log:" >&2
journalctl --user -u "$SERVICE" -n 40 --no-pager >&2
exit 1
