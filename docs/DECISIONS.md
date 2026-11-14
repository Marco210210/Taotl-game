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
