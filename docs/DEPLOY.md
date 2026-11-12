# Deploy del gioco online

Il gioco è pubblicato su **https://gioco-taotl.130.110.16.97.sslip.io**, sul server Oracle
(`ubuntu@130.110.16.97`, host SSH `oracle-server` in `~/.ssh/config`).

## Pubblicare un aggiornamento

Dalla cartella del progetto, su Windows (PowerShell o Git Bash):

```sh
pnpm run publish:oracle
```

Lo script `scripts/publish.mjs`:

1. impacchetta la **cartella di lavoro locale** (non git) con `tar`, escludendo
   `node_modules`, `dist`, `build`, `.git`, `.claude`, `.playwright-mcp`, `.superpowers`,
   `test-results`, `playwright-report`, `taotl.zip`, `.mcp.json` e `skills-lock.json`;
2. la invia via `ssh` in `~/.Taotl-game-upload` sul server e stampa quanti file e MB ha trasferito;
3. la sincronizza in `~/Taotl-game` con `rsync --delete`, così i file cancellati in locale
   spariscono anche dal server (`node_modules` e `dist` del server restano);
4. lancia `~/Taotl-game/deploy.sh`.

Opzioni:

- `pnpm run publish:oracle -- --dry-run`: elenca i file che verrebbero caricati, senza inviare nulla;
- `pnpm run publish:oracle -- --no-deploy`: carica i file ma non esegue `deploy.sh`;
- variabile `TAOTL_SSH_HOST`: usa un host SSH diverso da `oracle-server`.

Servono soltanto `node`, `ssh` e `tar`, tutti già presenti su Windows 10/11.

## Cosa fa `deploy.sh` (sul server)

`deploy.sh` sta nella root del repo e arriva sul server con ogni publish. Lo script:
imposta `PATH` con Node 26 per primo (non legge il profilo della shell), controlla che `node -v`
sia una 26.x, poi esegue `pnpm install --frozen-lockfile`, `pnpm build` e
`systemctl --user restart taotl-game`. Infine attende che `http://127.0.0.1:<PORT>/` risponda;
se non risponde stampa gli ultimi log ed esce con errore.

Per lanciarlo a mano: `ssh oracle-server "bash ~/Taotl-game/deploy.sh"`.

## Come è configurato il server

| Cosa | Dove |
|---|---|
| Codice | `~/Taotl-game` |
| Node 26 + pnpm 12.18.0 | `~/.local/node-26` (isolato: il Node 22 di sistema serve agli altri servizi e **non va aggiornato**) |
| Servizio | systemd **utente** `taotl-game.service` (`~/.config/systemd/user/`), utente `ubuntu`, `Restart=always`, avvio al boot grazie al linger attivo; stesso schema di `taotl-expo-go` |
| Variabili d'ambiente | `~/.config/taotl-game.env` (permessi 600): `NODE_ENV=production`, `HOST=127.0.0.1`, `PORT=8140` |
| Reverse proxy | Caddy: `/etc/caddy/gioco-taotl.Caddyfile`, incluso con `import` in fondo a `/etc/caddy/Caddyfile`. HTTPS automatico, WebSocket inoltrati da `reverse_proxy` |
| Firewall | Nessuna modifica: iptables lascia passare solo 22/80/443 e il gioco ascolta solo su localhost |

Variabili facoltative del server (vedi `apps/server/src/config.ts`): `BOT_MOVE_DELAY_MS`,
`TRICK_PAUSE_MS`, `DISCONNECT_GRACE_MS`, `ROOM_IDLE_MS`. Dopo averle modificate:
`systemctl --user restart taotl-game`.

## Comandi utili (sul server)

```sh
systemctl --user status taotl-game          # stato
journalctl --user -u taotl-game -f          # log in tempo reale
systemctl --user restart taotl-game         # riavvio
sudo systemctl reload caddy                 # ricarica Caddy (mai restart: interrompe gli altri siti)
```

Le partite vivono in memoria: ogni deploy o riavvio chiude le stanze in corso.
