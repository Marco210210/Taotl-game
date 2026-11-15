# Decisioni prese durante l'implementazione

Decisioni non coperte da SPEC e PLAN: è stata scelta l'opzione più semplice coerente con la SPEC.
Formato: **decisione** — perché — costo se sbagliata.

- **Notazione di test per il Totem senza spazi** (`'JT'`, non `'J T'` come in un esempio del Task 1.4) — coerente con `c('7T')`/`c('AT')` del Task 1.2 — nessun costo, riguarda solo i test.
- **Il bot tiene conto delle dichiarazioni già fatte** arrotondando per difetto la stima quando la somma delle dichiarazioni precedenti è già ≥ N — lettura più semplice di SPEC §8 — costo se sbagliata: dichiarazioni del bot leggermente diverse.
- **Errori extra del protocollo: `bad-player` (kick di sé/sconosciuto) e `bad-order` (reorder non permutazione); token espulso ha precedenza su `game-started`** — il brief non li elenca — basta rinominare il codice
- **La rivincita mantiene il controllo del bot per i giocatori ancora disconnessi** (azzera botControlled solo per chi è connesso) — evita che la nuova partita vada subito in pausa — costo se sbagliata: l'host dovrà riscegliere 'Gioca al suo posto'.
- **Espulsione dal vivo: evento room:kicked al solo socket espulso, che viene slegato dalla stanza; il client cancella il token e mostra Join con "Sei stato espulso dalla stanza"** — senza evento il client espulso restava su uno stato vecchio — costo se sbagliata: togliere l evento e gestire l errore al prossimo join.
- **Rotta /dev/cards con React.lazy sotto `import.meta.env.DEV`** — esclusa dal bundle di produzione senza router — se serve in prod basta rimuovere la condizione.
- **Font Bevan da Google Fonts per i ranghi, con fallback serif di sistema** — carattere scolpito e leggibile — offline si ricade su Rockwell/Georgia.

## Restyling del 2026-11-14 (SPEC §7.4)
- **Valori degli indici in Grenze (tondo), nomi e titoli in Grenze Gotisch** — la "A" gotica a 10-13px non si leggeva — basta cambiare `--font-rank`.
- **Tavola SVG delle carte 120×184** (era 60×88) — proporzioni vicine al mazzo originale, più spazio per le figure — nessun costo, `<Card>` scala con CSS.
- **Indice ingrandito rispetto all'originale** (simbolo sopra, valore sotto, in tutti e quattro gli angoli) — nel ventaglio della mano si vede solo l'angolo in alto a sinistra — costo: meno fedeltà.
- **Figure costruite con un generatore parametrico** (copricapo, veste, motivo, oggetto per personaggio) e Dei/Chipetl/retro disegnati a parte — 15 figure coerenti senza ricalcare gli originali — per cambiarne una basta modificarne la scheda in `cardArt/figures.tsx`.
- **I 4 Chipetl hanno lo stesso disegno** (prima avevano dei puntini 1-4) — nell'originale sono identici e nel gioco equivalenti.
- **Sui Dei la scritta in alto e in basso è in italiano** ("dio rosso", "dio nero", "taotl") — l'originale usa francese e inglese.
- **Posti a passo costante lungo il bordo dell'ovale**, misurando le proporzioni reali del tavolo; spazio minimo tra me e i vicini = 15% del perimetro — con la distribuzione per angolo i posti laterali si accavallavano sugli schermi bassi.
- **Le carte della presa si allontanano da sole se si sovrappongono** (piccolo rilassamento in px, `separateSpots`) — a 12 giocatori su 844×390 l'ovale è basso — costo: con tanti giocatori la carta può stare un po' più in là del punto "davanti" al giocatore.
- **Sul posto: "prese fatte/dichiarate", punti, carte in mano; badge "bot", "bot" con contorno (bot al suo posto), "off" (disconnesso)** — sigle corte perché la targhetta è larga ~100px a 844×390.
- **Asterisco rosso = chi ha aperto la presa** — riprende l'asterisco stampato su ogni carta dell'originale; si mostra solo quando c'è almeno una carta sul tavolo.
- **"Tocca a te" e "Gioca" ai lati della mia targhetta**, la mano occupa tutta la larghezza in basso — più spazio alle carte; tocco sull'indice d'angolo.
- **Larghezza visibile delle carte sovrapposte calcolata sullo spazio disponibile (minimo 22px)**; sotto i 22px la mano si scorre — 36 carte entrano intere a 844px.
- **Avviso "Ruota il telefono" con `(orientation: portrait) and (max-width: 900px)`**, su tutte le schermate tranne `/dev/cards` e `/dev/table` — copre telefoni e tablet piccoli in verticale; una finestra desktop stretta e alta lo vede anche lei.
- **Rotta di sviluppo `/dev/table?n=2..12&phase=…`** con dati finti, esclusa dalla build come `/dev/cards` — per controllare il tavolo senza giocare una partita.
- **Riepilogo di fine mano in una finestra sopra il tavolo**; al termine della 6ª mano il pulsante dell'host dice "Vedi la classifica".
- **Animazioni: carta che arriva dal posto (220ms), presa che scivola al vincitore dopo ~1,25s (460ms), alone del turno**; tutte spente con `prefers-reduced-motion`.

## Correzioni del 2026-11-14, seconda serie (SPEC §7.2, §7.4)
- **Giocata con un tocco: sparisce il pulsante "Gioca"**; resta solo la scelta Valido/Chipetl dei Dei (§5.3) — richiesta esplicita — per tornare indietro basta ripristinare la doppia conferma in `Hand.tsx`.
- **Riepilogo e classifica usano lo stesso ordinamento** (`lib/standings.ts`): totale decrescente, a parità ordine dei posti dal mazziere; nel riepilogo è il mazziere della mano appena finita, che è ancora quello della vista.
- **I totali della classifica sono la somma di `handScores`**, non `total`, così per costruzione non entrano mai punti della mano in corso.
- **Posizione in classifica a pari merito**: stesso numero, mostrato solo sulla prima riga del gruppo.
- **Chi ha aperto la presa: asterisco rosso e bordo rosso sulla targhetta**; la carta che ha deciso il seme ha un contorno rosso; (2026-11-15) tolta su richiesta l'etichetta al centro col seme e chi l'ha giocato: al suo posto, solo a presa conclusa, "Presa di X".
- **Targhette su tre righe** (nome e punti; "Chiamate N" e carte in mano; "Prese N" e badge); con più di 8 giocatori il testo è più piccolo — con le due righe separate a 12 giocatori su 844×390 le targhette si sovrapponevano.
- **Tutto schermo automatico solo su dispositivi touch** (`pointer: coarse`), al tocco su "Crea stanza" o "Entra"; su desktop solo col pulsante — su un computer il tutto schermo non richiesto disturba e non serve a bloccare l'orientamento.
- **"Torna a tutto schermo" si ricorda per la scheda** (`sessionStorage`): compare se il giocatore aveva scelto il tutto schermo e il browser l'ha tolto; dopo "Esci da tutto schermo" non ricompare.
- **Riconnessione al ritorno in primo piano**: con il socket chiuso si riapre subito (saltando l'attesa crescente di socket.io); con il socket apparentemente aperto si fa una sonda (rientro col token) con timeout di 2,5 s, e se non risponde si riapre. Durante la riconnessione il tavolo resta com'era con una piccola scritta "Riconnessione…".
- **I 2 minuti di §7.2 restano invariati** — contano solo se tocca proprio a chi è uscito, e socket.io si accorge della disconnessione solo dopo ~45 s (ping 25 s + timeout 20 s): una breve uscita su WhatsApp di solito non risulta nemmeno disconnessa.
- **Service worker con vite-plugin-pwa (generateSW), registrato a mano senza ricaricare la pagina**: precache di JS, CSS e icone; `index.html` fuori dalla precache e pagine in "rete prima" (ripiego in cache dopo 4 s o offline); `skipWaiting` + `clientsClaim` — così dopo una pubblicazione si apre subito la versione nuova e una partita in corso non viene mai ricaricata dal service worker.
- **Font di Google in cache dal service worker** (CSS stale-while-revalidate, file cache-first) — l'app si apre subito anche con rete lenta.
- **Header di cache impostati da Node (Express), non da Caddy**: `no-cache` per `index.html`, `sw.js`, `workbox-*.js` e manifest; un anno `immutable` per `/assets/*`; un giorno per icone e screenshot. Caddy (`/etc/caddy/gioco-taotl.Caddyfile`) inoltra gli header così come sono, quindi non va modificato.
- **Icona: carta bianca inclinata con asterisco rosso e maschera del Totem su panno verde**; versioni normale, maskable e apple-touch generate da `scripts/pwa-assets.mjs icons`; gli screenshot del manifest (2 larghi 1440×900, 2 da telefono 1688×780) da `scripts/pwa-assets.mjs screenshots <url>` sul gioco vero coi bot.
- **`beforeinstallprompt` intercettato** (niente mini-barra del browser) e usato dal pulsante "Installa l'app"; il pulsante non compare dove il browser non lo permette (es. Firefox desktop) né nell'app installata.
- **Su iPhone/iPad le istruzioni si riconoscono dallo user agent** (iPadOS si presenta come Mac: si guarda anche il touch).
- **Link della stanza solo nei pulsanti "Copia link" e "Condividi"**: il link non si vede più come testo; il codice grande resta per dettarlo a voce. Se la copia fallisce compare un messaggio che invita a mandare il codice.
- **Menu contestuale e trascinamento bloccati su tutta l'app** (non solo carte e tavolo), tranne nei campi di input — comportamento da app coerente su ogni schermata.
- **Lighthouse 11.7.1 per il controllo PWA** — dalla versione 12 Lighthouse non ha più la categoria PWA.

## Correzione del 2026-11-15 (SPEC §7.4, DEPLOY)
- **Preselezione solo a presa aperta e solo sulle carte lecite; al mio turno la carta parte da sola** — richiesta esplicita, sostituisce la regola del 2026-11-14 (preselezione in qualsiasi momento fuori turno, carta che non partiva da sola).
- **Le carte lecite per la preselezione le calcola il client** con `legalCards` del motore sulla mia mano e sul seme della presa in corso (già nella vista); il server continua a validare la giocata, quindi un errore del client al massimo fa rifiutare la carta.
- **Chi apre la presa non preseleziona, nemmeno durante la dichiarazione o la pausa di fine presa**: la carta di apertura è una scelta libera, e senza la carta del primo di mano non si sa che cosa sarà lecito.
- **Nuovo indirizzo `taotl-game.duckdns.org`**: il filtro antiphishing di TIM bloccava i sottodomini di `sslip.io` (usati spesso per siti malevoli); il vecchio indirizzo rimanda al nuovo con un 301. Un dominio vero si sceglierà insieme al nome definitivo.

## Blocco di TIM Safe Web (2026-11-15, DEPLOY)
- **Causa probabile: dominio appena creato.** `taotl-game.duckdns.org` è nato il 2026-11-15, l'altro sito sullo stesso server, non bloccato, ha un dominio di settembre. I resolver pubblici con filtro (Quad9, Cloudflare 1.1.1.2, OpenDNS FamilyShield, AdGuard, CleanBrowsing) non bloccano nessuno dei due.
- **Nessun legame con altri progetti**: Taotl non usa domini o sottodomini di altri progetti (provato e tolto lo stesso giorno su richiesta).
- **Niente redirect dal vecchio `sslip.io`** (risponde 410): un rimando da un dominio segnalato verso uno nuovo è tipico dei siti di phishing.
- **Sito "pulito"**: font serviti da noi (via Google Fonts), CSP rigorosa, `robots.txt`, testo `noscript`, niente `X-Powered-By`; un test e2e verifica che non partano richieste esterne e che la CSP non blocchi nulla.

## Ingresso con il codice e link verso l'app (2026-11-15, SPEC §7.1)
- **Su iOS un link non può aprire l'app web installata**: Apple non offre a queste app né la cattura dei link né gli universal link, e Safari non sa nemmeno se l'app è installata, perché i dati sono separati. Unica strada: entrare nell'app con il codice; la pagina aperta in Safari lo mostra in evidenza.
- **Ingresso con il codice nella home, accanto a "Crea stanza"**, con lo stesso nickname: la stanza viene verificata subito (`room:join`), quindi un codice sbagliato dà l'errore nella home invece di portare in una pagina vuota.
- **Il suggerimento "Hai l'app?" compare solo nel browser di telefoni e tablet** (iOS, o puntatore "coarse") e mai nell'app installata o su computer.
- **Codici in carattere normale invece che gotico** (lobby, campo, suggerimento): in Grenze Gotisch lettere come H, M, G si confondono quando vanno dettate.
