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
