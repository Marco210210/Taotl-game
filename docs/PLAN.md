# Il Taotl MVP — Piano di implementazione

> **Per chi esegue (agenti):** SOTTO-SKILL OBBLIGATORIA: usare superpowers:subagent-driven-development (consigliato) o superpowers:executing-plans per eseguire il piano task per task. Gli step usano le checkbox (`- [ ]`).

**Obiettivo:** gioco di carte "Il Taotl" giocabile online fra amici (2–12 giocatori, 6 mani, bot), con server autoritativo e client mobile-first.

**Architettura:** monorepo pnpm. `packages/engine` è un modulo TypeScript puro (regole, `viewFor`, bot), senza I/O, con RNG iniettato. `apps/server` (Node + Socket.IO) tiene le stanze in memoria e manda a ogni giocatore solo la sua vista. `apps/client` (React + Vite) invia solo intenzioni e mostra la vista. `packages/protocol` contiene solo i tipi degli eventi socket, condivisi da server e client.

**Stack:** Node ≥ 20 (in locale 26), pnpm (installato con `npm install -g pnpm`), TypeScript strict in ESM, Vitest, Socket.IO 4, Express (file statici), React 18 + Vite, @testing-library/react + jsdom, Playwright, tsx (dev) e tsup (build del server).

**Spec:** `docs/SPEC.md`. È la fonte di verità e prevale sul PDF. Chi esegue legge sia lo spec sia questo piano. I riferimenti "§x" rimandano allo spec.

## Vincoli globali

- 72 carte sempre; i Chipetl hanno id `chipetl-1..4`, ma nel gioco sono equivalenti (§2).
- `Rank` va da 2 a 14 (11=J, 12=Q, 13=K, 14=A); l'interfaccia mostra J, Q, K, A (§7.4).
- La tabella delle carte per mano è esattamente quella della §3.2; le carte avanzate non compaiono mai in nessuna vista (§3.2, §7.3).
- Il mazziere dichiara per ultimo, e la somma delle dichiarazioni deve essere ≠ N (§4). Apre la 1ª presa il giocatore dopo il mazziere (§5.1).
- Punteggio: rispettata `10·m + 5·m·D`, sbagliata `−5·m·|F−D|` (§6.1). Niente bonus +50 e niente Grazia (§6.2).
- Pareggio finale: vincono tutti i giocatori a pari merito in testa (§6.3).
- Il motore è puro: niente `Math.random`, `Date`, I/O o import da Node. La casualità arriva da un parametro `rng: () => number` con valori in [0,1).
- Server: mescolata con RNG crittografico (`crypto.randomInt`) e dealer iniziale casuale (§3.1, §3.2).
- Il client manda solo `bid(n)` e `play(cardId, declareChipetl?)`. Il server valida tutto col motore (§7.3).
- Default configurabili via env: `BOT_MOVE_DELAY_MS=800`, `TRICK_PAUSE_MS=2000`, `DISCONNECT_GRACE_MS=120000`, `ROOM_IDLE_MS=1800000`, `PORT=3000`.
- Interfaccia in italiano, mobile-first (riferimento 360×740), niente chat e niente timer di turno (§7.2, §7.4).
- Grafica delle carte originale: nessuna copia di grafiche esistenti, un unico componente `<Card>` (§7.4).
- `RuleConfig` accetta per ora solo i default `{scoring:'progressive', perfectGameBonus:0, taotlGrace:false}`; con altri valori `createGame` lancia un errore (§9).

## Review Focus

Casi non coperti esplicitamente dallo spec, che però faranno male a chi gioca. Ognuno ha un test nel task indicato.

1. **Host disconnesso senza altri umani connessi, poi rientra qualcuno** (anche il vecchio host). Chi rientra deve diventare host, altrimenti nessuno può più decidere e la stanza resta bloccata. → Task 3.2
2. **Stesso token aperto in due schede, o reload veloce.** Vince l'ultimo socket. Quando il socket vecchio si chiude, il posto non deve risultare "disconnesso". → Task 3.3
3. **Doppio tocco su "Gioca", oppure intent durante la pausa di fine presa.** Il secondo intent va rifiutato (`wrong-phase` / `not-your-turn`) e la carta non deve essere giocata due volte. → Task 1.5 (motore) e Task 3.2 (server)
4. **Il giocatore rientra mentre il bot sostituto ha una mossa programmata.** La mossa del bot già in timer non deve partire dopo che l'umano ha ripreso il posto. → Task 3.2
5. **Mano da 36 carte su un telefono largo 360px.** La mano si scorre o si apre a ventaglio, senza scroll orizzontale della pagina (`scrollWidth ≤ 360`), e ogni carta resta toccabile. → Task 5.2 e Task 6.1

## Decisioni che lo spec lascia aperte (prese qui, da confermare)

- **Avanzamento dopo il riepilogo di fine mano:** l'host preme "Prossima mano". Se l'host cambia, il pulsante passa al nuovo host.
- **Pausa di fine presa:** il motore ha una fase esplicita `trickEnd`. È il server che, dopo `TRICK_PAUSE_MS`, chiama `advance()`. Nel motore non c'è nessuna temporizzazione.
- **Espulsione:** solo in lobby. Il token espulso viene invalidato e un nuovo `join` con quel token viene rifiutato. Durante la partita, l'host ha l'opzione "Gioca al suo posto".
- **Riconnessione quando nessun host è connesso:** il primo umano che si riconnette diventa host (Review Focus 1). Il vecchio host, se rientra, non riprende il ruolo finché un altro host è connesso.
- **Stanza inattiva:** si elimina quando resta senza umani connessi per `ROOM_IDLE_MS`.
- **Nickname:** da 1 a 16 caratteri dopo il trim, unico nella stanza (rifiuto con `nickname-taken`).
- **Codice stanza:** 4 caratteri dall'alfabeto `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (senza caratteri ambigui).

---

## Struttura dei file

```
package.json                  # script root: test, build, dev, e2e
pnpm-workspace.yaml           # packages/*, apps/*
tsconfig.base.json            # strict, ESM, moduleResolution bundler
packages/engine/
  package.json                # @taotl/engine, "exports": "./src/index.ts" (sorgente TS, nessuna build)
  src/types.ts                # Card, Suit, Rank, CardId, PlayedCard, CompletedTrick, GameState, PlayerView, Intent, RuleConfig, EngineError
  src/cards.ts                # createDeck, cardId, cardFromId, isMagic, isTotem
  src/rng.ts                  # mulberry32(seed) per test/simulazioni; shuffle(cards, rng)
  src/deal.ts                 # CARDS_PER_HAND, cardsPerHand, deal
  src/bidding.ts              # legalBids
  src/trick.ts                # trickSuit, godPlayStatus, legalCards, strength, trickWinner
  src/scoring.ts              # handScore, ranking
  src/game.ts                 # createGame, applyIntent, advance, endGameNow
  src/view.ts                 # viewFor
  src/bot/estimate.ts         # estimateTricks
  src/bot/play.ts             # choosePlay
  src/bot/index.ts            # botMove
  src/index.ts                # export pubblici
  test/helpers.ts             # c('5♥') parser di notazione, playedSeq, randomLegalIntent, simulate
  test/*.test.ts
packages/protocol/
  package.json                # @taotl/protocol (solo tipi)
  src/index.ts                # RoomView, SeatView, PauseView, ClientToServerEvents, ServerToClientEvents, Ack
apps/server/
  src/config.ts               # lettura env con default
  src/tokens.ts               # newToken, newRoomCode
  src/room.ts                 # classe Room: lobby, partita, bot, pause, host, rivincita (nessun socket)
  src/roomView.ts             # roomViewFor(room, playerId): RoomView
  src/roomManager.ts          # registro stanze, sweep inattività
  src/socket.ts               # binding eventi Socket.IO ↔ Room
  src/main.ts                 # Express (static client) + Socket.IO
  test/room.test.ts           # unit con fake timers
  test/socket.int.test.ts     # 2 client socket.io-client reali
apps/client/
  index.html, vite.config.ts  # proxy /socket.io verso :3000 in dev
  src/main.tsx, src/App.tsx   # routing minimale: "/" e "/r/:code"
  src/net/socket.ts           # connessione, emit tipizzati, gestione token in localStorage
  src/net/useRoom.ts          # hook che espone RoomView
  src/lib/labels.ts           # rankLabel, suitName, cardLabel (testo a11y italiano)
  src/lib/sortHand.ts         # ordinamento per colore
  src/screens/Home.tsx, Join.tsx, Lobby.tsx, Table.tsx, HandSummary.tsx, FinalRanking.tsx
  src/components/Card.tsx     # unico componente carta
  src/components/Hand.tsx, TrickArea.tsx, BidPanel.tsx, GodChoice.tsx, PlayersBar.tsx, LastTrick.tsx, PauseDialog.tsx
  src/styles/theme.css
  test/*.test.tsx
e2e/
  playwright.config.ts
  helpers.ts                  # playTurnViaUI(page)
  hand3players.spec.ts, fullGameBots.spec.ts, reconnect.spec.ts
```

**Contratto `data-testid`** (fissato in Fase 4, usato in Fase 6, invariato in Fase 5):
`card` (con `data-card-id`, `aria-disabled`, `aria-label` = `cardLabel`), `btn-play`, `bid-<n>`, `btn-valido`, `btn-chipetl`, `btn-cancel-choice`, `btn-create`, `input-nickname`, `btn-join`, `invite-link`, `btn-add-bot`, `btn-start`, `seat-<playerId>`, `btn-kick-<playerId>`, `btn-last-trick`, `hand-summary`, `btn-next-hand`, `final-ranking`, `btn-rematch`, `pause-dialog`, `btn-pause-wait`, `btn-pause-bot`, `btn-pause-end`, `my-turn` (indicatore visibile quando tocca a me).

---

## Fase 1 — Monorepo + motore delle regole (TDD)

**Verifica di fine fase:** `pnpm --filter @taotl/engine test` è verde e copre tutti i casi della §10. `pnpm -r typecheck` è verde.

### Task 1.1: Scaffolding del monorepo e tipi

**File:** creare `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `.gitignore` (node_modules, dist, test-results, playwright-report), `packages/engine/{package.json,tsconfig.json,vitest.config.ts}`, `packages/engine/src/types.ts`, `packages/engine/src/index.ts`, `packages/engine/test/smoke.test.ts`.

**Interfacce prodotte** (`src/types.ts`):
```ts
type Suit = 'picche'|'cuori'|'quadri'|'fiori'|'totem';
type Rank = 2|3|4|5|6|7|8|9|10|11|12|13|14;
type Card = {kind:'suited';suit:Suit;rank:Rank} | {kind:'god';god:'rosso'|'nero'|'taotl'} | {kind:'chipetl';n:1|2|3|4};
type CardId = string;            // 'cuori-14' | 'totem-11' | 'god-taotl' | 'chipetl-3'
type PlayerId = string;
interface PlayedCard { playerId: PlayerId; card: Card; valid: boolean; label: null|'Chipetl'|'Nullo' }
  // valid: true per carte di colore; per i Chipetl false; per i Dei, il loro stato (§5.3)
interface CompletedTrick { cards: PlayedCard[]; winnerId: PlayerId }
type Phase = 'bidding'|'playing'|'trickEnd'|'handEnd'|'gameOver';
interface PlayerState { id: PlayerId; hand: Card[]; bid: number|null; tricksWon: number; handScores: number[]; total: number }
interface GameState { config: RuleConfig; players: PlayerState[]; dealerIndex: number; handNumber: number;
  cardsPerPlayer: number; leftover: Card[]; phase: Phase; turnIndex: number; leaderIndex: number;
  currentTrick: PlayedCard[]; tricksThisHand: CompletedTrick[] }
type Intent = {type:'bid'; value:number} | {type:'play'; cardId:CardId; declareChipetl?: boolean};
type EngineError = 'wrong-phase'|'not-your-turn'|'illegal-bid'|'card-not-in-hand'|'card-not-playable'|'choice-required'|'unknown-player';
type Result<T> = {ok:true; state:T} | {ok:false; error:EngineError};
interface RuleConfig { scoring:'progressive'|'classic'; perfectGameBonus:number; taotlGrace:boolean }
const DEFAULT_RULES: RuleConfig;
interface PlayerView { me: PlayerId; hand: Card[];
  players: {id:PlayerId; handCount:number; bid:number|null; tricksWon:number; handScores:number[]; total:number}[];
  dealerId: PlayerId; handNumber: number; cardsPerPlayer: number; phase: Phase; turnId: PlayerId|null;
  currentTrick: PlayedCard[]; trickSuit: Suit|null; tricksThisHand: CompletedTrick[]; totalBid: number;
  legalBids: number[];          // vuoto se non tocca a me dichiarare
  playableCardIds: CardId[] }   // vuoto se non tocca a me giocare
```
(Nickname, connessione e host sono dati della stanza: li aggiunge `RoomView` in Fase 3.)

- [ ] Installare pnpm: `npm install -g pnpm` (niente corepack: Node 26 non lo include), poi `pnpm -v` deve stampare una versione.
- [ ] Scrivere `smoke.test.ts`: `expect(DEFAULT_RULES).toEqual({scoring:'progressive',perfectGameBonus:0,taotlGrace:false})`.
- [ ] Eseguire `pnpm install && pnpm --filter @taotl/engine test` → prima FAIL, poi PASS dopo aver scritto `types.ts`.
- [ ] Script root: `test` = `pnpm -r test`, `typecheck` = `pnpm -r typecheck` (`tsc --noEmit`). Eseguire `pnpm typecheck` → verde.
- [ ] Commit `chore: monorepo pnpm e tipi del motore`.

### Task 1.2: Mazzo, RNG, distribuzione

**File:** `src/cards.ts`, `src/rng.ts`, `src/deal.ts`, `test/helpers.ts` (solo `c()` per ora), `test/cards.test.ts`, `test/deal.test.ts`.

**Interfacce:** `createDeck(): Card[]` (72) · `cardId(c: Card): CardId` · `cardFromId(id: CardId): Card` (lancia un errore su id ignoto) · `isTotem(c)`, `isMagic(c)` · `mulberry32(seed:number): () => number` · `shuffle<T>(xs: readonly T[], rng): T[]` (Fisher–Yates, non modifica l'input) · `CARDS_PER_HAND: Record<number, readonly number[]>` · `cardsPerHand(players:number, hand:1..6): number` · `deal(deck: Card[], players:number, n:number): {hands: Card[][]; leftover: Card[]}`.

Notazione dei test `c(s)`: `'5♥' '3♦' 'A♠' '2♣'` (colori normali; ranghi `2..10,J,Q,K,A`), `'7T'` / `'AT'` (Totem), `'DR'` `'DN'` `'TAO'` (Dei), `'CH1'..'CH4'` (Chipetl).

- [ ] Test `cards.test.ts`: il mazzo ha 72 carte con id unici; 13 carte per ciascuno dei 5 semi; 3 Dei; 4 Chipetl; `cardFromId(cardId(x))` equivale a `x` per tutte; `c('AT')` equivale a `{kind:'suited',suit:'totem',rank:14}`.
- [ ] Test `deal.test.ts`: `it.each` sull'intera tabella §3.2 (11 righe × 6 mani) per `cardsPerHand`; `deal` con 2 giocatori e N=36 → leftover 0; con 5 giocatori e N=14 → leftover 2; nessun id duplicato fra mani e leftover, e unione = mazzo; `shuffle` con lo stesso seed dà lo stesso risultato, con seed diversi dà risultati diversi, e l'input non cambia.
- [ ] Eseguire → FAIL; implementare; eseguire → PASS.
- [ ] Commit `feat(engine): mazzo, rng e distribuzione`.

### Task 1.3: Dichiarazioni e punteggio

**File:** `src/bidding.ts`, `src/scoring.ts`, `test/bidding.test.ts`, `test/scoring.test.ts`.

**Interfacce:** `legalBids(n:number, previous: number[], isDealer:boolean): number[]` · `handScore(m:number, bid:number, made:number, cfg?:RuleConfig): number` · `ranking(players: {id:PlayerId; total:number}[]): {id:PlayerId; total:number; position:number; winner:boolean}[]` (ordinata per totale decrescente; a parità di totale, stessa `position`; `winner` = totale massimo).

- [ ] Test: le 5 righe di §10.1 con `it.each` (per esempio `legalBids(7,[…somma 4…],true)` → `[0,1,2,4,5,6,7]`); un non-mazziere riceve sempre `0..n`; con `previous` che somma più di N il mazziere è libero.
- [ ] Test: le 9 righe di §10.2 con `it.each` su `handScore`; `ranking` con pari merito in testa → due `winner:true` con `position` 1, il successivo ha `position` 3.
- [ ] FAIL → implementare → PASS.
- [ ] Commit `feat(engine): dichiarazioni e punteggio`.

### Task 1.4: Regole della presa

**File:** `src/trick.ts`, `test/trick.test.ts`, `test/helpers.ts` (aggiungere `playedSeq`).

**Interfacce:**
- `trickSuit(played: PlayedCard[]): Suit|null`: seme della prima carta di colore giocata.
- `godPlayStatus(god:'rosso'|'nero'|'taotl', suit: Suit|null): 'null'|'choice'`: la tabella di §5.3.
- `legalCards(hand: Card[], suit: Suit|null): Card[]`: come §5.4.
- `strength(p: PlayedCard, suit: Suit): number`: come la funzione della §5.5.
- `trickWinner(played: PlayedCard[]): number`: indice del vincitore; nel caso B, `0`.
- helper di test `playedSeq(spec: string[]): PlayedCard[]`: notazione con suffisso `'DR!'` = Dio giocato e dichiarato Valido, `'DR~'` = dichiarato Chipetl; i Dei senza suffisso diventano nulli d'ufficio se `godPlayStatus` vale `'null'`, altrimenti l'helper lancia un errore (il test deve dichiarare la scelta). Gli autori sono `p0..pk` nell'ordine.

- [ ] Test: i 15 casi di §10.3 con `it.each` `[seq, expectedIndex]`. Esempi: `['5♥','J T','DR!'] → 1`, `['TAO','CH1','DN'] → 0`, `['5♥','TAO~','6♥'] → 2`. Per #6, #8, #10, #11, #13, #14 verificare anche che il Dio risulti `valid:false, label:'Nullo'`. Per #12: `trickSuit(['CH1','4T'])` vale `'totem'`, mentre `trickSuit(['CH1'])` vale `null`.
- [ ] Test: i 5 casi di §10.4 su `legalCards`, confrontando insiemi di id.
- [ ] Test: tabella completa `godPlayStatus` (3 Dei × {null, i 4 colori normali, totem}).
- [ ] FAIL → implementare → PASS.
- [ ] Commit `feat(engine): colore, validità dei Dei, obblighi e vincitore della presa`.

### Task 1.5: Macchina a stati della partita

**File:** `src/game.ts`, `test/game.test.ts`, `test/helpers.ts` (aggiungere `randomLegalIntent(state, rng): {playerId; intent}` e `simulate(players, seed, chooser)`, che porta una partita fino a `gameOver` chiamando `advance` quando la fase è `trickEnd`/`handEnd`).

**Interfacce:**
- `createGame(playerIds: PlayerId[], opts:{dealerIndex:number; rng:()=>number; config?:RuleConfig}): GameState`: parte da mano 1, fase `bidding`, `turnIndex = dealer+1`.
- `applyIntent(s: GameState, playerId: PlayerId, intent: Intent): Result<GameState>`: non modifica lo stato in ingresso.
  - Giocare un Dio in situazione `choice` senza `declareChipetl` → `choice-required`. In situazione `null` il campo viene ignorato e l'etichetta diventa `'Nullo'`. Con `declareChipetl:true` → `valid:false, label:'Chipetl'`.
  - Dopo l'ultima carta di una presa: fase `trickEnd`, presa aggiunta a `tricksThisHand`, `tricksWon` del vincitore incrementato, `currentTrick` svuotato, `turnIndex = vincitore`.
- `advance(s: GameState, rng): GameState`: da `trickEnd` → `playing`, oppure, se le mani sono vuote, → `handEnd` con `handScores`/`total` aggiornati. Da `handEnd` → mano successiva (mazziere +1, nuova distribuzione, `tricksThisHand = []`, bid azzerati), oppure `gameOver` dopo la 6ª mano. In tutte le altre fasi restituisce lo stato invariato.
- `endGameNow(s): GameState` → `gameOver` con i totali attuali.

Test (nomi = asserzioni):
- [ ] `bidding parte dal posto dopo il mazziere e finisce col mazziere`
- [ ] `il mazziere riceve illegal-bid sul valore vietato`, `bid fuori 0..N → illegal-bid`
- [ ] `la 1ª presa la apre il posto dopo il mazziere; la successiva la apre il vincitore`
- [ ] `intent fuori turno → not-your-turn; intent in trickEnd → wrong-phase; la stessa carta giocata due volte → la seconda è rifiutata` (Review Focus 3)
- [ ] `carta non in mano → card-not-in-hand; carta di colore normale in presa di Totem con un Totem in mano → card-not-playable`
- [ ] `Dio in choice senza scelta → choice-required; declareChipetl → label Chipetl`
- [ ] `handEnd assegna handScore a ognuno; il mazziere ruota; tricksThisHand si azzera nella nuova mano`
- [ ] `simulate con randomLegalIntent per 2..12 giocatori (seed 1..20) arriva a gameOver dopo 6 mani; la somma di tricksWon per mano = N`
- [ ] `createGame con config non di default lancia un errore`
- [ ] FAIL → implementare → PASS. Commit `feat(engine): macchina a stati della partita`.

### Task 1.6: `viewFor`

**File:** `src/view.ts`, `test/view.test.ts`.

**Interfaccia:** `viewFor(s: GameState, me: PlayerId): PlayerView`. `legalBids` e `playableCardIds` sono pieni solo quando è il turno di `me` nella fase giusta.

- [ ] Test §10.5 (proprietà): usando `simulate` su seed 1..10 e 2..12 giocatori, a **ogni** stato intermedio e per ogni giocatore `p`, `JSON.stringify(viewFor(s,p))` non contiene nessun `cardId` delle mani di `q≠p` né del `leftover`. Attenzione: le carte già giocate sono legittimamente visibili, e una carta giocata non è più in nessuna mano.
- [ ] Test: in ogni stato, `tricksThisHand` è deep-equal fra le viste di tutti i giocatori, ha lunghezza = numero di prese completate nella mano e torna `[]` dopo l'`advance` da `handEnd`.
- [ ] Test: `legalBids` del mazziere esclude il valore vietato; `playableCardIds` coincide con `legalCards`.
- [ ] FAIL → implementare → PASS. Eseguire `pnpm --filter @taotl/engine test` → tutto verde. Commit `feat(engine): viste per giocatore`.

---

## Fase 2 — Bot euristico

**Verifica di fine fase:** `pnpm --filter @taotl/engine test` verde, compresi i test del bot. Una simulazione di 200 partite di soli bot finisce senza nessuna mossa rifiutata.

### Task 2.1: Stima delle prese e dichiarazione

**File:** `src/bot/estimate.ts`, `test/bot-bid.test.ts`.

**Interfaccia:** `estimateTricks(hand: Card[], n: number, playerCount: number): number` (reale ≥ 0).

Euristica (§8). Pesi iniziali da tarare con il test di qualità del Task 2.3:
- Taotl e Totem J/Q/K/A: 0.9 ciascuno.
- Totem 2..10: 0.35 ciascuno, ×1.5 se la mano ha almeno 2 colori normali con ≤ 1 carta.
- Dio Rosso/Nero e Assi normali: `0.6 × min(1, n/8)`.
- K normali: `0.3 × min(1, n/10)`.
- Risultato limitato all'intervallo [0, n].

La dichiarazione è `round(estimate)`. Se non è in `legalBids`, si prende il valore lecito più vicino (a parità, quello più basso).

- [ ] Test: `{TAO, AT, KT}` con n=3 e 4 giocatori → stima arrotondata 3. `{2♣,3♦,4♠}` con n=3 → 0. Una mano da 18 carte ricca di Totem alti stima più di una da 18 carte povera.
- [ ] FAIL → implementare → PASS. Commit `feat(engine): stima prese del bot`.

### Task 2.2: Scelta della carta e `botMove`

**File:** `src/bot/play.ts`, `src/bot/index.ts`, `test/bot-play.test.ts`.

**Interfacce:** `botMove(view: PlayerView, config?: RuleConfig): Intent`: usa solo `view` e niente stato esterno (§8). Lancia un errore se `view.turnId !== view.me`. `choosePlay(view): Intent`.

Logica (§8), con `need = bid − tricksWon` e "carte uscite" ricavate da `tricksThisHand` + `currentTrick`:
- `need > 0`: fra le carte giocabili che vincerebbero subito (simulando `strength` contro la presa in corso, con il Dio giocato Valido se è in situazione `choice`), gioca la più debole. Se apre la presa: la carta più forte quasi sicura se `need` ≥ il numero di carte quasi sicure, altrimenti la carta normale più alta del colore più lungo. Se nessuna carta vince: la più debole, e i Dei vanno giocati come Chipetl.
- `need ≤ 0`: se un'altra carta vince già, scarta la carta più forte fra quelle che **non** supererebbero la vincente. Altrimenti gioca la più debole. Chipetl e Dei in `choice` vanno con `declareChipetl:true`.
- Far sballare: se `need ≤ 0` e la presa in corso è vinta da un avversario che ha `need ≤ 0`, non superarlo.

Test di scenario (vista costruita a mano):
- [ ] `need 1, presa [5♥], mano {6♥,K♥,2♣} → gioca 6♥`
- [ ] `need 0, presa [5♥, 2T altrui], mano {A♥,3♥} → gioca A♥` (si libera della carta forte quando la presa è già vinta da altri)
- [ ] `need 0, presa [5♥, 9♥], mano {DR, K♥} → gioca DR con declareChipetl true` (K♥ prenderebbe)
- [ ] `need 1, presa [3T], mano {TAO, AT} → gioca AT` (la più bassa sufficiente; il Taotl si conserva)
- [ ] `need 0, apre, mano {AT, 2♣} → gioca 2♣`
- [ ] `botMove(view) chiamato due volte sulla stessa vista dà lo stesso intent` (nessuna memoria)
- [ ] FAIL → implementare → PASS. Commit `feat(engine): bot di gioco`.

### Task 2.3: Legalità e qualità in simulazione

**File:** `test/bot-sim.test.ts`.

- [ ] Test `200 partite di soli bot (seed 1..200, giocatori = 2 + seed % 11): ogni applyIntent(botMove(viewFor(...))) è ok e la partita arriva a gameOver`.
- [ ] Test `il mazziere bot non dichiara mai il valore vietato` (controllato su ogni dichiarazione del mazziere nella simulazione sopra).
- [ ] Test di qualità: con 4 giocatori e seed 1..100, la percentuale di mani rispettate (F=D) dei bot è **almeno 10 punti** sopra una baseline "dichiarazione casuale lecita + giocata casuale lecita" sugli stessi seed. Se fallisce, tarare i pesi di 2.1 e 2.2, non la soglia.
- [ ] PASS. Commit `test(engine): simulazioni del bot`.

---

## Fase 3 — Server

**Verifica di fine fase:** `pnpm --filter @taotl/server test` verde. Il test di integrazione porta 2 client socket reali fino a `gameOver`. `pnpm --filter @taotl/server dev` si avvia sulla porta 3000.

### Task 3.1: Protocollo e scheletro della stanza (lobby)

**File:** `packages/protocol/{package.json,src/index.ts}`, `apps/server/{package.json,tsconfig.json,vitest.config.ts}`, `src/config.ts`, `src/tokens.ts`, `src/room.ts`, `src/roomView.ts`, `src/roomManager.ts`, `test/room.test.ts`.

**Interfacce (`@taotl/protocol`):**
```ts
interface SeatView { id: PlayerId; nickname: string; isBot: boolean; connected: boolean; botControlled: boolean }
interface PauseView { waitingFor: PlayerId; hostCanDecide: boolean }
interface RoomView { code: string; me: PlayerId; hostId: PlayerId|null; status: 'lobby'|'playing'|'ended';
  seats: SeatView[]; game: PlayerView|null; pause: PauseView|null }
type Ack<T = {}> = (r: ({ok:true} & T) | {ok:false; error:string}) => void;
interface ClientToServerEvents {
  'room:create': (p:{nickname:string}, ack: Ack<{code:string; token:string}>) => void;
  'room:join':   (p:{code:string; nickname?:string; token?:string}, ack: Ack<{token:string}>) => void;
  'lobby:reorder': (p:{order:PlayerId[]}, ack: Ack) => void;
  'lobby:kick': (p:{playerId:PlayerId}, ack: Ack) => void;
  'lobby:addBot': (ack: Ack) => void;
  'game:start': (ack: Ack) => void;
  'game:intent': (i: Intent, ack: Ack) => void;
  'game:nextHand': (ack: Ack) => void;
  'host:decision': (p:{choice:'wait'|'bot'|'end'}, ack: Ack) => void;
  'game:rematch': (ack: Ack) => void; }
interface ServerToClientEvents { 'room:state': (v: RoomView) => void }
```
Codici di errore (stringhe): `room-not-found`, `game-started`, `room-full`, `nickname-taken`, `invalid-nickname`, `bad-token`, `kicked`, `not-host`, `bad-player-count`, più gli `EngineError`.

**`Room` (src/room.ts)** — nessuna dipendenza da Socket.IO:
```ts
new Room(code, deps:{ rng:()=>number; now:()=>number; setTimer:(fn,ms)=>()=>void; cfg:ServerConfig; onChange:(room)=>void })
join(nickname, token?): {ok, token, playerId} | {ok:false, error}
connect(playerId, socketId) / disconnect(playerId, socketId)
reorder(by, order) · kick(by, target) · addBot(by) · start(by)
intent(playerId, intent) · nextHand(by) · hostDecision(by, choice) · rematch(by)
playerIdForToken(token) · hasConnectedHumans() · lastHumanSeenAt
```
`roomViewFor(room, playerId): RoomView` usa `viewFor` del motore per `game`.

- [ ] Test lobby: chi crea diventa host; `join` col token esistente restituisce lo stesso `playerId`; nickname duplicato → `nickname-taken`; 13° posto → `room-full`; `start` con 1 posto → `bad-player-count`; `start` da un non-host → `not-host`; `join` dopo l'inizio senza token valido → `game-started`; il token espulso viene rifiutato con `kicked`; `addBot` crea un posto `isBot`; `reorder` cambia l'ordine dei posti.
- [ ] Test: `start` sceglie il mazziere con `rng` (iniettare un rng fisso e verificare `dealerId`).
- [ ] Test `roomManager`: `newRoomCode` usa solo l'alfabeto deciso e ha 4 caratteri; `sweep(now)` elimina le stanze senza umani connessi da più di `ROOM_IDLE_MS` e lascia le altre.
- [ ] FAIL → implementare → PASS. Commit `feat(server): protocollo, stanze e lobby`.

### Task 3.2: Partita, bot, pause, host

**File:** modificare `src/room.ts`; test in `test/room.test.ts` (con `vi.useFakeTimers` e `setTimer` basato su `setTimeout`).

Comportamento:
- Dopo ogni cambio di stato: se la fase è `trickEnd`, programmare `advance` dopo `TRICK_PAUSE_MS`. Se è il turno di un bot o di un posto `botControlled`, programmare `botMove` dopo `BOT_MOVE_DELAY_MS`. A ogni cambio di stato si annullano i timer pendenti (Review Focus 4).
- `handEnd` aspetta `nextHand` dall'host.
- La pausa è attiva quando il turno è di un umano disconnesso e non `botControlled`. `hostCanDecide` diventa true quando `now − disconnectedAt ≥ DISCONNECT_GRACE_MS`. In quel momento parte un timer che chiama `onChange`.
- `hostDecision`: `'wait'` non fa nulla; `'bot'` imposta `botControlled=true` e programma la mossa; `'end'` chiama `endGameNow` e mette lo stato a `ended`. Viene rifiutato se `!hostCanDecide`.
- Il ritorno del giocatore (`connect`) azzera `botControlled`.
- Disconnessione dell'host: il ruolo passa al primo umano connesso partendo dal posto successivo. Se non ce n'è nessuno, `hostId` resta quello del vecchio host disconnesso, e il primo umano che si connette diventa host (Review Focus 1).
- `rematch` (solo quando la partita è finita, solo l'host): stessi posti, nuovo mazziere casuale, punteggi azzerati.

Test:
- [ ] `intent illegale → errore del motore, stato invariato; due play rapidi della stessa carta → il secondo rifiutato` (Review Focus 3)
- [ ] `dopo l'ultima carta, advance avviene solo dopo TRICK_PAUSE_MS`
- [ ] `un bot dichiara/gioca dopo BOT_MOVE_DELAY_MS, non prima`
- [ ] `disconnesso ma non di turno → nessuna pausa; quando arriva il suo turno → pause.waitingFor`
- [ ] `hostDecision prima di 2 minuti → rifiutata; dopo → 'bot' gioca subito il turno in sospeso`
- [ ] `il giocatore rientra mentre il bot sostituto ha una mossa in timer → il timer non gioca` (Review Focus 4)
- [ ] `'end' → status ended e ranking con i totali attuali`
- [ ] `host disconnesso → il nuovo host è il primo umano connesso dopo di lui; il vecchio host che rientra non torna host`
- [ ] `nessun umano connesso, poi rientra il vecchio host → torna host` (Review Focus 1)
- [ ] `partita 1 umano + 2 bot, con l'umano che gioca via botMove: arriva a status ended dopo 6 nextHand`
- [ ] `rematch azzera i totali e mantiene i posti`
- [ ] FAIL → implementare → PASS. Commit `feat(server): partita, bot, pause e passaggio di host`.

### Task 3.3: Socket.IO e integrazione con 2 client

**File:** `src/socket.ts`, `src/main.ts`, `test/socket.int.test.ts`. Dipendenze di sviluppo: `socket.io-client`, `tsx`, `tsup`.

**Interfacce:** `attachSocket(io: Server<ClientToServerEvents, ServerToClientEvents>, manager: RoomManager): void`. `createApp(cfg): {httpServer, io, manager}` (usato da `main.ts` e dai test, su porta 0). `main.ts` serve `apps/client/dist` come statico, con fallback su `index.html` per `/r/*`.

Ogni socket è associato a `(code, playerId)` dopo `room:create` o `room:join`. Su `onChange` il server manda `room:state` a ciascun socket con la sua `roomViewFor`. Un nuovo socket con lo stesso token sostituisce il precedente: il vecchio riceve `disconnect`, ma la sua chiusura non marca il posto come disconnesso (Review Focus 2).

- [ ] Test `due client: create + join + start, entrambi giocano con botMove(view) a ogni room:state in cui è il loro turno (BOT_MOVE_DELAY_MS=0, TRICK_PAUSE_MS=0) e l'host invia nextHand; entrambi ricevono status ended con gli stessi totali`.
- [ ] Nello stesso test: per ogni `room:state` ricevuto da A, nessuna carta della `game.hand` di B compare in `JSON.stringify` della vista di A nello stesso istante. Il confronto usa lo snapshot dello stato della `Room` letto dal manager.
- [ ] Test `riconnessione: B chiude il socket e ne riapre uno con room:join {code, token} → stesso playerId, connected torna true`.
- [ ] Test `stesso token su due socket → il primo viene chiuso, il posto resta connected` (Review Focus 2).
- [ ] Test `room:join su codice inesistente → room-not-found`.
- [ ] FAIL → implementare → PASS. Avviare `pnpm --filter @taotl/server dev` e controllare che il log mostri `listening on 3000`. Commit `feat(server): trasporto Socket.IO`.

---

## Fase 4 — Client minimale ma completo

**Verifica di fine fase:** `pnpm --filter @taotl/client test` verde. Verifica manuale: con server e client in dev, due finestre (una in emulazione mobile 360×740) giocano almeno una mano con un bot. Le carte sono ancora rettangoli testuali (`<Card>` provvisorio).

### Task 4.1: Scaffolding, rete, home/join/lobby

**File:** `apps/client/{package.json,index.html,vite.config.ts,tsconfig.json,vitest.config.ts}`, `src/main.tsx`, `src/App.tsx`, `src/net/socket.ts`, `src/net/useRoom.ts`, `src/screens/{Home,Join,Lobby}.tsx`, `src/lib/labels.ts`, `test/labels.test.ts`, `test/lobby.test.tsx`.

**Interfacce:**
- `getToken(code): string|null` / `setToken(code, token)`: chiave `taotl:token:<CODE>` in localStorage, letture e scritture dentro try/catch.
- `useRoom(code): {view: RoomView|null; error: string|null; emit: TypedEmit}`: al mount tenta `room:join {code, token}`. Se non c'è un token o il token è rifiutato, mostra `Join`.
- `rankLabel(r: Rank): string` (11..14 → J,Q,K,A). `suitName(s)` (Picche, Cuori, Quadri, Fiori, Totem). `cardLabel(c: Card): string` (es. `"A di Cuori"`, `"J di Totem"`, `"Dio Rosso"`, `"Taotl"`, `"Chipetl"`).
- Testi degli errori in italiano (mappa codice → messaggio, es. `room-not-found` → "Stanza non trovata").

- [ ] Test: `rankLabel` e `cardLabel` su campioni di ogni tipo di carta.
- [ ] Test `Lobby` (RTL, `RoomView` finta): l'host vede `btn-add-bot`, `btn-start` (disabilitato con meno di 2 posti) e `btn-kick-*`; un non-host non li vede; `invite-link` contiene `/r/<code>`.
- [ ] FAIL → implementare → PASS. Commit `feat(client): rete, home e lobby`.

### Task 4.2: Tavolo di gioco

**File:** `src/screens/Table.tsx`, `src/components/{Card,Hand,TrickArea,BidPanel,GodChoice,PlayersBar,LastTrick,PauseDialog}.tsx`, `src/lib/sortHand.ts`, `test/{sortHand,hand,bid,godChoice}.test.tsx`.

**Interfacce:**
- `sortHand(cards: Card[]): Card[]`: ordine dei gruppi Totem, Picche, Cuori, Fiori, Quadri (rossi e neri alternati), poi Dei, poi Chipetl. Dentro ogni colore, rango decrescente.
- `<Card card: Card; label?: 'Chipetl'|'Nullo'|null; disabled?; selected?; onClick?; size?: 'hand'|'trick'|'mini' />`: imposta il contratto `data-testid="card"`.
- `<Hand cards playable: Set<CardId> onPlay:(id)=>void />`: il primo tocco seleziona, il secondo tocco sulla stessa carta (o `btn-play`) chiama `onPlay`. Le carte non giocabili hanno `aria-disabled` e non reagiscono.
- `<GodChoice onChoose:(declareChipetl:boolean)=>void onCancel />`: mostra `btn-valido`, `btn-chipetl`, `btn-cancel-choice`, senza nessun default.
- In `Table`: quando si gioca un Dio, si calcola `godPlayStatus(god, view.game.trickSuit)` (dal motore). Con `'choice'` si apre `GodChoice`, con `'null'` l'intent parte subito.
- `<BidPanel allowed: number[] onBid />`: un pulsante `bid-<n>` per ogni valore lecito, e solo per quelli.
- `PlayersBar`: per ogni posto mostra nickname, dichiarate/fatte, carte in mano, totale, segni di mazziere e turno, stato connesso/bot. In alto, "Dichiarate X / N".
- `LastTrick`: `btn-last-trick` mostra l'ultimo elemento di `tricksThisHand`.
- `PauseDialog`: chi non è host vede "In attesa di <nick>". L'host, quando `hostCanDecide`, vede i 3 pulsanti.
- La presa completata resta visibile nella `TrickArea` durante `trickEnd` (il server la tiene ferma per 2 s): in quella fase si mostra l'ultimo elemento di `tricksThisHand`.

- [ ] Test `sortHand` su una mano mista.
- [ ] Test `Hand`: primo click → `selected`, `onPlay` non chiamato; secondo click → `onPlay(id)`; click su una carta disabilitata → nulla.
- [ ] Test `BidPanel` con `allowed=[0,1,2,4]` → nessun `bid-3`.
- [ ] Test `Table`: giocare `DR` con `trickSuit='cuori'` mostra `GodChoice`, e "Annulla" richiude senza inviare nulla. Con `trickSuit='picche'` l'intent parte subito senza `declareChipetl`.
- [ ] FAIL → implementare → PASS. Commit `feat(client): tavolo, dichiarazione e gioco`.

### Task 4.3: Riepilogo, classifica, rivincita

**File:** `src/screens/{HandSummary,FinalRanking}.tsx`, `test/summary.test.tsx`.

- [ ] Test `HandSummary` (fase `handEnd`): per ogni giocatore mostra dichiarate, fatte, punti della mano (`handScores.at(-1)`) e totale. `btn-next-hand` lo vede solo l'host.
- [ ] Test `FinalRanking` (status `ended`): usa `ranking` del motore; i pari merito sono tutti marcati vincitori; `btn-rematch` solo per l'host.
- [ ] FAIL → implementare → PASS.
- [ ] Verifica manuale: `pnpm dev` (script root che avvia insieme server e client, ad esempio con `concurrently`), poi da 2 finestre: crea, entra, aggiungi un bot, gioca una mano e controlla il riepilogo. Commit `feat(client): riepilogo e classifica`.

---

## Fase 5 — Grafica (skill frontend-design)

**Verifica di fine fase:** tutti i test del client restano verdi (il contratto `data-testid`/`aria-label` non cambia). Screenshot Playwright MCP a 360×740 e a 1280×800 di: lobby, tavolo con presa in corso, mano da 24 carte, GodChoice, riepilogo, galleria delle carte. Mostrarli all'utente per l'ok.

### Task 5.1: Carte SVG originali

**Prima:** invocare la skill `frontend-design:frontend-design`.

**File:** riscrivere `src/components/Card.tsx`; creare `src/components/cardArt/{glyphs.tsx,faces.tsx}` e `src/styles/theme.css` (token di colore e font su `:root`); creare `src/screens/CardGallery.tsx` (rotta `/dev/cards`, inclusa solo in sviluppo) con tutte le 72 carte.

Vincoli da rispettare (la direzione artistica la decide la skill):
- Stile ispirato al Messico antico, ma originale: niente glifi o immagini copiate da opere esistenti.
- 5 semi con **simbolo e colore distinti**, riconoscibili anche in scala di grigi. Picche/Fiori e Cuori/Quadri restano riconducibili a nero/rosso (la regola dei Dei dipende da questo) ma distinguibili fra loro. Totem ha un aspetto proprio, da atout.
- Dio Rosso, Dio Nero, Taotl e Chipetl hanno illustrazioni riconoscibili. Etichetta sovrapposta "Chipetl"/"Nullo" quando la prop `label` è valorizzata.
- Indice angolare (rango + simbolo) leggibile a 44px di larghezza (dimensione `mini`). Solo SVG inline e CSS, nessuna immagine raster. La prop `card` resta l'unica fonte, così un domani si possono sostituire le facce con immagini.
- [ ] Implementare. Aprire `/dev/cards` con Playwright MCP a 360px e fare uno screenshot. Controllare a vista che i 5 semi si distinguano. Commit `feat(client): carte SVG originali`.

### Task 5.2: Tavolo e layout mobile

**File:** `src/screens/{Table,Lobby,Home}.tsx`, `src/components/{Hand,TrickArea,PlayersBar}.tsx`, `src/styles/theme.css`.

- Mano: ventaglio sovrapposto con scroll orizzontale **interno** al contenitore. La carta selezionata si alza. Bersagli di tocco ≥ 44px.
- Tavolo: posti in cima in una striscia compatta (scorrevole oltre 6 giocatori), presa al centro, mano in basso, pannello dichiarazione o pulsante "Gioca" fissato in basso.
- [ ] Test (Vitest + jsdom non basta per il layout, quindi la verifica è in Playwright, Task 6.1): `scrollWidth` del documento ≤ larghezza della viewport, con una mano da 36 carte (Review Focus 5).
- [ ] Screenshot delle schermate della verifica di fase e richiesta di ok all'utente. Commit `feat(client): tavolo e layout mobile`.

---

## Fase 6 — Verifica end-to-end con Playwright

**Verifica di fine fase:** `pnpm e2e` verde in locale (chromium).

### Task 6.1: Configurazione e test

**File:** `e2e/playwright.config.ts`, `e2e/helpers.ts`, `e2e/hand3players.spec.ts`, `e2e/fullGameBots.spec.ts`, `e2e/reconnect.spec.ts`, `e2e/layout.spec.ts`; script root `e2e` = `pnpm build && playwright test -c e2e`.

Config: `webServer` avvia il server compilato con `PORT=3100 BOT_MOVE_DELAY_MS=30 TRICK_PAUSE_MS=100`. Progetto chromium con viewport 360×740. Timeout per test di 5 minuti.

**Helper:** `playTurnViaUI(page): Promise<'bid'|'play'|'none'>`. Se c'è un `bid-*` visibile clicca il primo. Altrimenti, se c'è `my-turn`, fa doppio click sulla prima `card` con `aria-disabled=false`, e se compare `btn-valido` lo clicca. `runUntil(pages, predicate)` cicla `playTurnViaUI` sulle pagine finché il predicato non è vero.

- [ ] `hand3players.spec.ts`: 3 `browser.newContext()` (token separati); A crea, B e C entrano dall'`invite-link`, A avvia. Si gioca finché `hand-summary` è visibile su tutte e tre le pagine. Asserzioni: somma delle "fatte" = 24 (mano 1 con 3 giocatori); i punti mostrati corrispondono a `handScore(1, D, F)` per ogni riga.
- [ ] `fullGameBots.spec.ts`: 1 umano + 3 bot; l'umano gioca da UI e preme `btn-next-hand` dopo ogni mano. Alla fine compare `final-ranking`; il totale di ogni giocatore = somma dei punti mano annotati da ciascun `hand-summary`.
- [ ] `reconnect.spec.ts`: a partita iniziata, B fa `page.reload()`, rientra nello stesso posto (stesso nickname, stessa mano) e la partita continua fino al riepilogo.
- [ ] `layout.spec.ts`: con 2 giocatori in mano 1 (36 carte), `document.documentElement.scrollWidth ≤ 360`, l'ultima carta della mano si può raggiungere con lo scroll del contenitore e risponde al click (Review Focus 5).
- [ ] Eseguire `pnpm e2e` → tutto verde. In caso di fallimento: superpowers:systematic-debugging, senza allentare le asserzioni.
- [ ] Commit `test(e2e): mano a 3, partita con bot, riconnessione, layout`.

---

## Copertura dello spec (self-review)

| Spec | Task |
|---|---|
| §2 mazzo | 1.2 |
| §3 posti, mazziere, distribuzione, fasi | 1.2, 1.5, 3.1 (mazziere casuale) |
| §4 dichiarazioni | 1.3, 1.5, 4.2 |
| §5 prese | 1.4, 1.5, 4.2 |
| §6 punteggio e fine partita, rivincita | 1.3, 1.5, 3.2, 4.3 |
| §7.1 stanza e token | 3.1, 3.3, 4.1 |
| §7.2 disconnessioni | 3.2, 3.3, 4.2 (PauseDialog), 6.1 |
| §7.3 viste e server autoritativo | 1.6, 3.3 |
| §7.4 interfaccia | 4.x, 5.x |
| §8 bot | 2.x, 3.2 |
| §9 RuleConfig | 1.1, 1.5 |
| §10 casi di test | 1.3, 1.4, 1.6 |
| §11 stack | 1.1, 3.3, 4.1 |
| §11 deploy | fuori da questo piano (dopo il completamento, come da spec) |
