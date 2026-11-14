# Il Taotl — Specifica MVP (web multiplayer)

> Fonte delle regole: `docs/Istruzioni_Il_Taotl.pdf`.
> Questo documento **prevale sul PDF**: dove differiscono, vale la SPEC (vedi §9 per l'elenco delle differenze).
> Decisioni prese in sessione di analisi del 2026-11-11 (D1–D20).

---

## 1. Obiettivo e perimetro

Versione web multiplayer del gioco di carte "Il Taotl", per giocare online tra amici: si crea una stanza, si condivide il link, ognuno gioca dal proprio browser/telefono.

**MVP** = "partita normale" a **6 mani**, **2–12 giocatori**, **individuale**, con le regole della §3–§5.

Vincoli architetturali:
- **Server autoritativo**: la mano di un giocatore non arriva mai al client di un altro (vedi §7.3).
- **TypeScript ovunque**.
- Il **motore delle regole è un modulo puro** (nessun I/O, nessuna dipendenza dal trasporto), testato con i casi della §10.

---

## 2. Il mazzo

72 carte, **sempre tutte** (niente "Piccolo Gioco").

| Gruppo | Carte | Numero |
|---|---|---|
| Colori normali | Picche, Cuori, Quadri, Fiori — ciascuno 2,3,4,5,6,7,8,9,10,J,Q,K,A | 52 |
| Totem (atout) | 2,3,4,5,6,7,8,9,10,J,Q,K,A | 13 |
| Dei | Dio Rosso, Dio Nero, Taotl | 3 |
| Chipetl | 4 Chipetl (identici ai fini del gioco) | 4 |

- **Colore rosso**: Cuori, Quadri → Dio Rosso.
- **Colore nero**: Picche, Fiori → Dio Nero.
- Ordine dei valori nei colori (crescente): 2 < 3 < … < 10 < J < Q < K < A.
- **Carte magiche** = 3 Dei + 4 Chipetl.
- I 4 Chipetl hanno id distinti (`chipetl-1..4`) solo per identificare le carte; nel gioco sono equivalenti.

Modello suggerito:
```ts
type Suit = 'picche' | 'cuori' | 'quadri' | 'fiori' | 'totem';
type Rank = 2|3|4|5|6|7|8|9|10|11|12|13|14; // 11=J 12=Q 13=K 14=A
type Card =
  | { kind: 'suited'; suit: Suit; rank: Rank }
  | { kind: 'god'; god: 'rosso' | 'nero' | 'taotl' }
  | { kind: 'chipetl'; n: 1|2|3|4 };
```

---

## 3. Struttura della partita

### 3.1 Posti e mazziere
- I posti sono in ordine circolare (ordine di ingresso nella stanza, riordinabile dall'host prima dell'inizio).
- **Mazziere della 1ª mano**: estratto a caso dal server.
- Il mazziere **ruota** al posto successivo a ogni mano.
- "Successivo" = posto seguente nell'ordine circolare. Tutti i giri (dichiarazioni, giocate) seguono questo ordine.

### 3.2 Distribuzione
Mescolata casuale lato server (generatore crittografico). Carte per giocatore nelle 6 mani:

| Giocatori | 1ª | 2ª | 3ª | 4ª | 5ª | 6ª |
|---|---|---|---|---|---|---|
| 2  | 36 | 25 | 14 | 3 | 2 | 1 |
| 3  | 24 | 17 | 10 | 3 | 2 | 1 |
| 4  | 18 | 13 | 8  | 3 | 2 | 1 |
| 5  | 14 | 10 | 6  | 3 | 2 | 1 |
| 6  | 12 | 9  | 6  | 3 | 2 | 1 |
| 7  | 10 | 7  | 5  | 3 | 2 | 1 |
| 8  | 9  | 7  | 5  | 3 | 2 | 1 |
| 9  | 8  | 6  | 4  | 3 | 2 | 1 |
| 10 | 7  | 5  | 4  | 3 | 2 | 1 |
| 11 | 6  | 5  | 4  | 3 | 2 | 1 |
| 12 | 6  | 5  | 4  | 3 | 2 | 1 |

- Ogni mano usa un mazzo completo rimescolato.
- Le **carte avanzate** vanno messe da parte e **non vengono mai rivelate** a nessuno, nemmeno a fine mano.

### 3.3 Fasi di una mano
1. **Distribuzione** (N carte a testa, N dalla tabella).
2. **Dichiarazioni** (§4). Ognuno vede la propria mano prima di dichiarare.
3. **N prese** (§5).
4. **Punteggio della mano** (§6) e riepilogo.

Dopo la 6ª mano: classifica finale (§6.3).

---

## 4. Dichiarazioni

- **Ordine**: comincia il giocatore **dopo il mazziere**; il **mazziere dichiara per ultimo**.
- Valori ammessi: interi **da 0 a N** (N = carte in mano).
- **Vincolo del mazziere**: la somma di tutte le dichiarazioni deve essere **≠ N**.
  - Sia `S` la somma delle dichiarazioni precedenti. Il valore vietato al mazziere è `N − S`, ma solo se `0 ≤ N − S ≤ N`. Altrimenti il mazziere è libero.
  - Esiste sempre almeno un valore lecito (N ≥ 1 ⇒ l'intervallo 0..N ha almeno 2 valori).
- Le dichiarazioni sono **pubbliche** man mano che vengono fatte.
- Durante la mano, l'interfaccia mostra per ogni giocatore `dichiarate / fatte`, più il totale dichiarato confrontato con N.

---

## 5. Le prese

### 5.1 Apertura
- La **1ª presa** di ogni mano la apre il giocatore **dopo il mazziere** (chi ha dichiarato per primo).
- Ogni presa successiva la apre **chi ha vinto la presa precedente**.
- Ognuno gioca una carta, nell'ordine circolare, a partire da chi apre.

### 5.2 Colore della presa
- Il **colore della presa** è il colore della **prima carta di colore** (uno dei 5 semi, Totem compreso) giocata nella presa.
- Chipetl e Dei **non determinano mai** il colore.
- Finché non viene giocata una carta di colore, il colore è "non stabilito".
- Se nessuno gioca una carta di colore, la presa resta senza colore (§5.5, caso B).

### 5.3 Stato di un Dio giocato
Ogni Dio giocato è **valido** o **nullo**, e la cosa si decide **nel momento in cui viene giocato**:

| Situazione al momento della giocata | Dio Rosso | Dio Nero | Taotl |
|---|---|---|---|
| Colore non stabilito (prima carta della presa, o solo carte nulle prima) | nullo d'ufficio | nullo d'ufficio | nullo d'ufficio |
| Colore = Cuori o Quadri | **scelta** | nullo d'ufficio | **scelta** |
| Colore = Picche o Fiori | nullo d'ufficio | **scelta** | **scelta** |
| Colore = Totem | nullo d'ufficio | nullo d'ufficio | **scelta** |

- **scelta** = il giocatore sceglie **"Valido"** oppure **"Chipetl"**, senza valore predefinito.
- Un Dio nullo (d'ufficio o dichiarato Chipetl) è a tutti gli effetti una **carta nulla**, equivalente a un Chipetl.

### 5.4 Carte giocabili (obblighi)
- **Colore non stabilito**: **nessun obbligo**, qualsiasi carta.
- **Colore = Picche/Cuori/Quadri/Fiori** (regola della casa, vedi §9 riga 10):
  - se il giocatore **ha almeno una carta di quel colore**, può giocare **quel colore**, **un Totem qualsiasi** (taglio) oppure **una carta magica qualsiasi**. Non può giocare carte degli altri 3 colori normali.
  - se **non ha quel colore**, gioca **qualsiasi carta**.
- **Colore = Totem**:
  - se il giocatore **ha almeno un Totem** in mano, può giocare **un Totem qualsiasi** oppure **una carta magica qualsiasi** (Chipetl, Dio Rosso, Dio Nero, Taotl). Non può giocare carte degli altri 4 colori.
  - se **non ha Totem**, gioca **qualsiasi carta**.
- Non c'è **mai** obbligo di vincere la presa, né di superare la carta più alta.
- L'obbligo vale solo per chi gioca **dopo** la carta di colore che ha stabilito il colore della presa.

```ts
function legalCards(hand: Card[], trickSuit: Suit | null): Card[] {
  if (trickSuit === null) return hand;
  const hasSuit = hand.some(c => c.kind === 'suited' && c.suit === trickSuit);
  if (!hasSuit) return hand;
  return hand.filter(c => c.kind !== 'suited' || c.suit === trickSuit || c.suit === 'totem');
}
```

### 5.5 Chi vince la presa

**Caso A — la presa ha un colore `C`.** Si calcola la forza di ogni carta; vince la più forte.

Classifica (dalla più forte), con `C` = colore della presa:
1. **Taotl valido**
2. **Totem J, Q, K, A** (A > K > Q > J)
3. **Dio valido** del colore di `C`: Dio Rosso se `C` ∈ {Cuori, Quadri}, Dio Nero se `C` ∈ {Picche, Fiori}. Mai valido se `C` = Totem (§5.3).
4. **Totem 2…10** (per valore)
5. **Carte del colore `C`** (per valore), solo se `C` ≠ Totem
6. **Non vincenti**: carte degli altri colori normali e tutte le carte nulle (Chipetl, Dei nulli)

Conseguenze esplicite:
- Una carta di un colore normale diverso da `C` **non vince mai**: in una presa di Picche l'Asso di Cuori non conta nulla.
- Il Dio Rosso o Nero valido batte i Totem fino al 10 compreso **solo nella presa del suo colore**, e perde con J, Q, K, A di Totem.
- In una presa di Totem vince il Taotl valido se c'è, altrimenti il Totem più alto.
- Due carte non possono avere la stessa forza nelle fasce 1–5: le carte sono uniche, e il Dio Rosso e il Dio Nero non sono mai validi nella stessa presa.

Funzione di forza suggerita:
```ts
// valore più alto = più forte; 0 = non vincente
function strength(p: PlayedCard, C: Suit): number {
  const c = p.card;
  if (c.kind === 'god') {
    if (!p.valid) return 0;
    if (c.god === 'taotl') return 1000;
    return 500; // Dio valido del colore della presa (la validità è già controllata in §5.3)
  }
  if (c.kind === 'chipetl') return 0;
  if (c.suit === 'totem') return c.rank >= 11 ? 600 + c.rank : 300 + c.rank;
  if (c.suit === C) return 100 + c.rank;
  return 0;
}
```

**Caso B — nessuna carta di colore giocata** (tutte carte nulle). Vince **la prima carta giocata** della presa: tutte le carte nulle hanno lo stesso valore (§9, diff. 1).

> Nota: nel caso A c'è sempre almeno una carta di forza > 0, cioè quella che ha stabilito il colore, quindi la fascia 6 non decide mai la presa.

---

## 6. Punteggio

### 6.1 Per mano
Sia `m` il numero della mano (1…6), `D` le prese dichiarate e `F` le prese fatte.
- **Valore di una presa** = 5 × m → 5, 10, 15, 20, 25, 30
- **Premio per il rispetto** = 10 × m → 10, 20, 30, 40, 50, 60

| Esito | Punti |
|---|---|
| F = D (rispettata) | **10·m + 5·m·D** |
| F ≠ D (sbagliata) | **−5·m · \|F − D\|** |

Quando si sbaglia, il premio per il rispetto non si conta.

### 6.2 Niente bonus
- Nessun bonus +50 a fine partita.
- Nessuna "Grazia del Dio Taotl".

### 6.3 Fine partita
- Dopo la 6ª mano, classifica per punteggio totale.
- **Pareggio**: sono vincitori **tutti** i giocatori col punteggio più alto, senza spareggi.
- Pulsante **"Rivincita"**: stessa stanza, stessi posti, nuovo mazziere estratto a caso, punteggi azzerati.

---

## 7. Online: stanza, rete, sicurezza

### 7.1 Stanza e identità
- **Nessun account** nell'MVP.
- Chi crea la stanza diventa **host** e ottiene un link con un codice breve (es. `/r/K7QX`).
- Chi apre il link inserisce un **nickname** ed entra.
- L'identità è un **token anonimo** salvato in `localStorage`: ricaricando la pagina si rientra nello stesso posto.
- L'host può: riordinare i posti, espellere giocatori, **aggiungere bot**, premere **"Inizia"** (da 2 a 12 posti occupati, bot compresi).
- **Nessun ingresso a partita iniziata**, niente spettatori.
- Una stanza vuota/inattiva viene eliminata dopo ~30 minuti.

### 7.2 Disconnessioni
- **Niente timer di turno.**
- Se un giocatore si disconnette, il suo posto risulta "disconnesso", ma **la partita continua** finché non tocca a lui.
- La partita va **in pausa** solo quando è il **turno** di un giocatore disconnesso, che sia per dichiarare o per giocare. Quando rientra col suo token si riprende da dove si era rimasti.
- Se la pausa dura e sono passati almeno **2 minuti** dalla disconnessione, l'host sceglie tra:
  1. **Aspetta ancora**
  2. **Gioca al suo posto**: il posto passa al **bot** (§8), che gioca subito il turno in sospeso. Se il giocatore rientra, riprende il suo posto.
  3. **Termina partita**, con la classifica attuale.
- **Disconnessione dell'host**: il ruolo di host (e le scelte sopra) passa **subito e automaticamente** al **primo giocatore umano connesso** nell'ordine dei posti, a partire dal posto successivo a quello del vecchio host. Se il vecchio host rientra, **non torna host**.
- Se non resta nessun umano connesso, la partita resta in pausa e la stanza si elimina dopo il tempo di inattività (§7.1).
- Lo stato delle partite resta **in memoria** sul server: se il server si riavvia, le partite in corso si perdono (rischio accettato nell'MVP).

### 7.3 Server autoritativo e informazioni visibili
- Il client invia solo **intenzioni** (`bid(n)`, `play(cardId, declareChipetl?)`). Il server le valida con il motore e rifiuta quelle illegali.
- Il server invia a ciascun giocatore una **vista personalizzata** dello stato, calcolata da una funzione pura `viewFor(state, playerId)`:
  - la **propria mano** (e solo la propria);
  - degli altri giocatori: nickname, posto, **numero** di carte in mano, dichiarazione, prese fatte, punteggio totale, stato di connessione;
  - la **presa in corso** (carte giocate con autore);
  - **`tricksThisHand`**: tutte le prese **completate** della mano corrente, in ordine. Per ognuna: le carte giocate (con autore, ordine di gioco ed eventuale etichetta "Chipetl"/"Nullo" dei Dei) e il vincitore. È informazione **pubblica**: ce l'hanno tutte le viste, umani e bot. Si azzera a ogni nuova mano;
  - mazziere, mano corrente, turno, punteggi, host.
- Nell'interfaccia umana `tricksThisHand` non si mostra (niente "ultima presa", §7.4): serve al bot. Chi ispeziona il traffico di rete può vederlo: è accettato, perché è informazione pubblica.
- **Mai** nelle viste: mani altrui, carte avanzate, ordine del mazzo, seme del generatore casuale.
- Un **Dio giocato** si mostra sempre col suo vero volto, con l'etichetta **"Chipetl"** (se dichiarato) o **"Nullo"** (se nullo d'ufficio).
- Test obbligatorio: per ogni stato di esempio, la vista di un giocatore non contiene nessuna carta delle mani altrui né delle carte avanzate.

### 7.4 Interfaccia (punti decisi)
Restyling del 2026-11-14: carte nello stile del mazzo originale, tavolo orizzontale stile poker.

**Generale**
- Lingua **italiana**. Il gioco è pensato **in orizzontale**: tutte le schermate (home, ingresso, lobby, tavolo, riepilogo, classifica) hanno un layout orizzontale. Riferimenti: **844×390** (telefono in orizzontale) e **1440×900** (desktop).
- **In verticale** (orientamento verticale e larghezza ≤ 900px) qualsiasi schermata è coperta da un avviso **"Ruota il telefono"**; lo stato della partita resta intatto sotto. Fa eccezione solo la pagina di sviluppo `/dev/cards`.
- **Etichette delle figure**: J, Q, K, A (nel codice `Rank` 11, 12, 13, 14). I numeri da 2 a 10 si mostrano così come sono.
- **Niente chat** nell'MVP.

**Carte** (riferimento di stile: foto in `docs/carte-originali/`)
- Disegni **originali** in SVG che richiamano chiaramente lo stile del mazzo originale, senza ricalcarne le illustrazioni: carta bianca a spigoli arrotondati, asterisco rosso in alto al centro, indici negli angoli (seme sopra, valore sotto), metà inferiore capovolta.
- **Semi e inchiostri come nell'originale**: Cuori (cuore allungato) e Quadri (rombo) in **rosso**; Fiori (trifoglio) e Picche (punta di lancia) in **nero**; Totem (maschera) in **giallo con contorno nero**. Le carte numerate hanno i simboli disposti come nelle carte classiche, quelli della metà bassa capovolti; l'Asso ha un unico simbolo grande.
- **Figure J/Q/K a doppia testa**, con il **nome scritto in verticale** lungo il bordo come nell'originale:
  - Cuori/Quadri: personaggi aztechi, rosso-verde-nero. Quadri: K ahuitzotl, Q tlilalcapatl, J itztli. Cuori: K moctezuma, Q ixtaccihuatl, J toxcatl.
  - Fiori/Picche: personaggi spagnoli, nero-giallo-rosso. Fiori: K carlos, Q isabella, J bernal. Picche: K hernan, Q marina, J alvarado.
  - Totem: divinità, giallo-nero-rosso. K tlaltecuhtli, Q tonantzin, J xochipilli.
- **Dei**: Dio Rosso = quetzalcoatl (rosso-verde), Dio Nero = tezcatlipoca (giallo-nero), Taotl = huitzilopochtli (rosso-giallo-verde); in alto e in basso la scritta "dio rosso" / "dio nero" / "taotl"; negli angoli un fiocco di piume nei colori del Dio.
- **Chipetl**: teschio verde con corona di fiori rossi e gialli, scritta "chipetl", teschietti negli angoli. I 4 Chipetl sono identici.
- **Retro**: fondo verde chiaro con serpenti stilizzati a linea bianca, simmetrico nei quattro quarti.
- Tutte le carte (fronte e retro) passano da un **unico componente `<Card>`**; restano leggibili su schermi piccoli (indice grande nell'angolo in alto a sinistra, l'unico visibile nel ventaglio della mano). Pagina di sviluppo `/dev/cards` con tutte le carte, il retro e gli stati.

**Tavolo**
- **Tavolo ovale** visto dall'alto, giocatori seduti intorno **nell'ordine dei posti**, in senso orario. **Io sono sempre in basso al centro**, con la mia mano sotto il tavolo, a ventaglio sovrapposto, **ordinata per colore** (scorribile solo se non entra).
- La disposizione dei posti si adatta al numero di giocatori, **da 2 a 12**, senza sovrapposizioni.
- Ogni posto mostra: **nickname**, **dichiarate/fatte**, **punteggio totale**, **numero di carte in mano**, **stato di connessione** e **badge bot** (anche "bot al suo posto").
- Indicatori: **segnalino del mazziere** sul posto del mazziere; **evidenziazione animata** di chi deve giocare o dichiarare; **asterisco rosso** su chi ha aperto la presa in corso.
- In alto a sinistra: numero della mano e "Dichiarate X / N".
- Le carte della **presa in corso** compaiono al centro del tavolo, **davanti a chi le ha giocate**. A presa completata restano visibili ~2 secondi con il vincitore evidenziato, poi **scivolano verso il vincitore** con un'animazione breve. Chi preferisce meno movimento (`prefers-reduced-motion`) non vede animazioni.
- **Giocare una carta**: un tocco la seleziona (si alza), un secondo tocco o il pulsante **"Gioca"** la gioca.
- Le carte **non giocabili** (obbligo di colore, §5.4) sono oscurate e non toccabili.
- **Dichiarazione**: un pannello al centro del tavolo con i soli valori leciti (al mazziere manca quello vietato).
- **Dio in situazione di scelta** (§5.3): pannello con **"Valido"** / **"Chipetl"**, senza valore predefinito; si può annullare prima di scegliere. Se il Dio è nullo d'ufficio, nessuna domanda: parte con l'etichetta "Nullo".
- **Niente "ultima presa"** nell'interfaccia: non c'è né pulsante né vista. `tricksThisHand` resta nella vista del server perché serve al bot.
- **Riepilogo a fine mano** sopra il tavolo: dichiarate, fatte, punti della mano, totale.

**Estetica**
- Un tavolo da gioco curato e coerente con le carte: sala in legno scuro, panno verde, bordo nero con fascia bianca a greca rossa, targhette dei posti in cartoncino bianco con inchiostro nero.
- Palette degli inchiostri delle carte: rosso, verde, nero, giallo su bianco; il giallo segnala il turno.
- Caratteri: **Grenze Gotisch** (titoli, nomi sulle carte, valori) e **Grenze** (testo), da Google Fonts con ripiego serif di sistema.

---

## 8. Bot

Bot **euristico** (a regole, niente intelligenza artificiale né simulazioni pesanti), parte del pacchetto `engine` e quindi puro e testabile. Una sola difficoltà nell'MVP.

- **Usi**: aggiunto dall'host in lobby per riempire i posti, oppure come sostituto di un giocatore disconnesso (§7.2).
- **Informazioni**: il bot è una funzione pura `botMove(view: PlayerView, config): Intent`. Riceve **solo** la stessa `viewFor` di un giocatore umano, **nessun altro stato**: non vede le mani altrui e non ha memoria propria tra una mossa e l'altra. Ricava le carte uscite nella mano corrente da `tricksThisHand` e dalla presa in corso.
- **Ritmo**: il server esegue ogni mossa di bot (dichiarazione o giocata) con un **ritardo di ~800 ms**, configurabile (`BOT_MOVE_DELAY_MS`), così le giocate si vedono una alla volta. Il ritardo si somma alla pausa di ~2 s di fine presa (§7.4) quando il bot apre la presa successiva.
- **Dichiarazione**: stima le prese contando:
  - le carte quasi sicure (Taotl, Totem A/K/Q/J);
  - i tagli possibili coi Totem bassi, che pesano di più se ha pochi colori corti;
  - Dei e Assi, che valgono di più nelle mani con molte carte e meno in quelle piccole.

  Tiene conto delle dichiarazioni già fatte e del vincolo del mazziere.
- **Gioco**, guidato dall'obiettivo:
  - *deve ancora prendere* → prova a vincere la presa con la carta **più bassa sufficiente**;
  - *ha già raggiunto la dichiarazione* → evita di prendere: carte basse, si libera delle carte forti quando la presa è già vinta da altri, usa Chipetl e Dei come "Chipetl";
  - quando può farlo senza danneggiarsi, prova a **far sballare** chi ha già raggiunto la sua dichiarazione.
- Il bot gioca sempre e solo mosse lecite (usa `legalCards`).

---

## 9. Differenze rispetto al PDF

Regole fisse dell'MVP. A MVP completato si valuterà quali rendere **opzioni attivabili in lobby**. Il motore accetta un `RuleConfig`, che per ora contiene solo i valori predefiniti qui sotto.

| # | Regola SPEC | PDF |
|---|---|---|
| 1 | Presa senza carte di colore: vince la **prima** carta nulla giocata; Dei svalutati = Chipetl | Gerarchia: Chipetl > Dio Nero nullo > Dio Rosso nullo > Taotl nullo |
| 2 | Taotl giocato per primo: **sempre nullo** | Non specificato (si dedurrebbe valido) |
| 3 | Dio giocato con colore non ancora stabilito: **nullo** | Non specificato (interpretazione) |
| 4 | Presa di Totem **senza Totem in mano**: gioco libero (sparisce la regola del "Chipetl di riserva") | Obbligo di rispondere con una carta magica, salvo l'ultimo Chipetl tenuto di riserva |
| 5 | Il **mazziere dichiara per ultimo**; apre la 1ª presa il giocatore dopo il mazziere | Il mazziere dichiara per primo; chi apre non è specificato |
| 6 | **Niente Grazia del Dio Taotl** | Bonus nella 6ª mano |
| 7 | Punteggio crescente stile **Partita Fiume** (§6.1) | +10 rispetto, +3 per presa, −5 per presa sbagliata |
| 8 | **Niente bonus +50** a fine partita | +50 a chi rispetta tutte e 6 le mani |
| 9 | **Sempre 72 carte** | "Piccolo Gioco" consigliato per 2–5 giocatori |
| 10 | Picche/Cuori/Quadri/Fiori: **obbligo di rispondere a colore** se lo si ha; ammessi anche Totem (taglio) e carte magiche | Nessun obbligo di rispondere a colore nei 4 colori normali |

`RuleConfig` previsto:
```ts
interface RuleConfig {
  scoring: 'progressive' | 'classic';      // MVP: 'progressive'
  perfectGameBonus: number;                 // MVP: 0  (PDF: 50)
  taotlGrace: boolean;                      // MVP: false
}
```

Formalizzazione della **Grazia del Dio Taotl**, pronta per il futuro (`taotlGrace: true`). Solo nella 6ª mano, conta la carta ricevuta indipendentemente da come viene giocata, e si somma al risultato della mano:
- giocatori diversi dal mazziere: **+10** se hanno Dio Rosso, Dio Nero o Taotl;
- mazziere (l'ultimo a dichiarare): **+20** se ha una qualsiasi carta magica (Chipetl compresi), altrimenti **+10** se ha un Totem. I bonus non si sommano tra loro.

---

## 10. Casi di test del motore (da tradurre in Vitest)

### 10.1 Vincolo del mazziere (dagli esempi del PDF, con il mazziere come ultimo)
| Giocatori | Mano | N | Somma precedenti | Valori leciti per il mazziere |
|---|---|---|---|---|
| 6 | 3ª | 6 | 7 | 0..6 (tutti) |
| 8 | 2ª | 7 | 7 | 1..7 (non 0) |
| 10 | 1ª | 7 | 4 | 0,1,2,4,5,6,7 (non 3) |
| 7 | 6ª | 1 | 3 | 0,1 |
| 9 | 6ª | 1 | 0 | 0 (non 1) |

### 10.2 Punteggio
| Mano | D | F | Punti |
|---|---|---|---|
| 1 | 0 | 0 | +10 |
| 1 | 3 | 3 | +25 |
| 1 | 0 | 3 | −15 |
| 2 | 2 | 2 | +40 |
| 2 | 1 | 3 | −20 |
| 3 | 2 | 2 | +60 |
| 3 | 4 | 1 | −45 |
| 4 | 1 | 3 | −40 |
| 6 | 1 | 1 | +90 |

### 10.3 Vincitore della presa (ordine = ordine di gioco)
1. `5♥, A♠, 2♥` → vince `5♥` (colore Cuori; A♠ fuori colore).
2. `5♥, 3♦ (Quadri), K♥` → vince `K♥`.
3. `5♥, 2 Totem, A♥` → vince `2 Totem`.
4. `5♥, 10 Totem, Dio Rosso valido` → vince `Dio Rosso`.
5. `5♥, J Totem, Dio Rosso valido` → vince `J Totem`.
6. `5♠, Dio Rosso` → il Dio Rosso è nullo d'ufficio (presa nera); vince `5♠`.
7. `5♠, A♠, Dio Nero valido` → vince `Dio Nero`.
8. `3 Totem, Dio Nero, Dio Rosso` → entrambi nulli d'ufficio; vince `3 Totem`.
9. `3 Totem, A Totem, Taotl valido` → vince `Taotl`.
10. `Taotl` (aperto) `, 2♣, 3♣` → Taotl nullo d'ufficio; colore Fiori; vince `3♣`.
11. `Chipetl, Dio Rosso, 5♥, 2♥` → Dio Rosso nullo d'ufficio (colore non stabilito quando è stato giocato); colore Cuori; vince `5♥`.
12. `Chipetl, 4 Totem, …` → colore Totem; l'obbligo di Totem vale per chi gioca dopo il `4 Totem`.
13. `Taotl, Chipetl, Dio Nero` → il Taotl aperto è nullo d'ufficio, il Dio Nero è nullo (colore non stabilito); nessuna carta di colore; vince **il primo giocatore**.
14. `Chipetl, Chipetl, Taotl` → il Taotl è nullo (colore non stabilito); vince il primo giocatore.
15. `5♥, Taotl dichiarato Chipetl, 6♥` → vince `6♥`.

### 10.4 Carte giocabili
- Colore Totem, mano `{7 Totem, A♥, Chipetl}` → giocabili `{7 Totem, Chipetl}`.
- Colore Totem, mano `{7 Totem, Dio Rosso, K♠}` → giocabili `{7 Totem, Dio Rosso}` (il Dio Rosso sarà nullo d'ufficio).
- Colore Totem, mano `{A♥, Chipetl, Dio Nero}` → giocabili: **tutte** (niente Totem in mano).
- Colore Cuori, mano `{A♠, 3 Totem, 2♥}` → giocabili: tutte.
- Colore non stabilito → giocabili: tutte.

### 10.5 Viste
- Per ogni stato di partita in ogni fase, `viewFor(state, p)` non contiene id di carte presenti nelle mani di `q ≠ p` né nelle carte avanzate.
- `tricksThisHand` è identico nelle viste di tutti i giocatori, contiene tutte e sole le prese completate della mano corrente e si svuota a ogni nuova mano.

---

## 11. Stack e deploy

- **Monorepo pnpm**:
  - `packages/engine`: tipi, mazzo, regole (§2–§6), `viewFor`, bot (§8). TypeScript puro, test **Vitest**.
  - `apps/server`: **Node + Socket.IO**, gestione stanze/token/riconnessione, stato in memoria; serve anche il client compilato.
  - `apps/client`: **React + Vite + TypeScript**, pensato prima per il telefono.
- **Perché Socket.IO e non Colyseus**: le viste per giocatore calcolate esplicitamente rendono il vincolo "mani nascoste" semplice e testabile. La sincronizzazione automatica dello stato di Colyseus andrebbe invece filtrata.
- **Deploy**: sul **server Oracle** dell'utente, **dopo** che il progetto è completo. Un solo processo Node (client compilato + websocket) con **Caddy** davanti per l'HTTPS automatico. Dettagli (Docker o systemd, dominio) da definire al momento del deploy.

---

## 12. Fuori dall'MVP (dopo)

- Partite **a coppie**.
- **Partita Fiume** (con la formula di §6.1 la scala dei punti si estende da sola oltre la 10ª mano).
- **Partita Lampo**.
- **Opzioni di regola in lobby** (§9: Grazia, bonus +50, punteggio classico, eventualmente le altre differenze).
- **Account** utente.
- Spettatori, ingresso a partita iniziata, chat.
- Timer di turno.
- Persistenza delle partite (sopravvivenza ai riavvii del server).
- Più livelli di difficoltà del bot.
- Grafica delle carte con immagini reali.
- (Escluso del tutto: Piccolo Gioco — si usano sempre 72 carte.)
