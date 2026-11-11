import { cardId } from '../cards';
import { godPlayStatus, trickWinner } from '../trick';
import type { Card, Intent, PlayedCard, PlayerView } from '../types';

/** Ordine di forza "da bot": Chipetl 0, colori 2..14, Totem bassi 22..30, Dei 35, Totem alti 51..54, Taotl 60. */
export function cardRank(card: Card): number {
  if (card.kind === 'chipetl') return 0;
  if (card.kind === 'god') return card.god === 'taotl' ? 60 : 35;
  if (card.suit === 'totem') return card.rank >= 11 ? 40 + card.rank : 20 + card.rank;
  return card.rank;
}

interface Option {
  card: Card;
  /** definito solo per i Dei in situazione di scelta */
  declareChipetl?: boolean;
  /** forza effettiva: 0 se la carta vale come Chipetl/nulla */
  effective: number;
  wins: boolean;
}

function isSureTotem(card: Card): boolean {
  return card.kind === 'suited' && card.suit === 'totem' && card.rank >= 11;
}

function buildOptions(view: PlayerView, cards: Card[]): Option[] {
  const options: Option[] = [];
  const leading = view.currentTrick.length === 0;
  for (const card of cards) {
    const variants: { declareChipetl?: boolean; valid: boolean; label: PlayedCard['label'] }[] = [];
    if (card.kind === 'suited') variants.push({ valid: true, label: null });
    else if (card.kind === 'chipetl') variants.push({ valid: false, label: null });
    else if (godPlayStatus(card.god, view.trickSuit) === 'null') {
      variants.push({ valid: false, label: 'Nullo' });
    } else {
      variants.push({ declareChipetl: false, valid: true, label: null });
      variants.push({ declareChipetl: true, valid: false, label: 'Chipetl' });
    }
    for (const v of variants) {
      const played: PlayedCard = { playerId: view.me, card, valid: v.valid, label: v.label };
      const wins =
        !leading && trickWinner([...view.currentTrick, played]) === view.currentTrick.length;
      const dead = card.kind === 'chipetl' || (card.kind === 'god' && !v.valid);
      options.push({
        card,
        ...(v.declareChipetl === undefined ? {} : { declareChipetl: v.declareChipetl }),
        effective: dead ? 0 : cardRank(card),
        wins,
      });
    }
  }
  return options;
}

/** Ordina per forza effettiva, poi per rango della carta, poi per id (deterministico). */
function byWeakness(a: Option, b: Option): number {
  return (
    a.effective - b.effective ||
    cardRank(a.card) - cardRank(b.card) ||
    cardId(a.card).localeCompare(cardId(b.card)) ||
    Number(a.declareChipetl ?? false) - Number(b.declareChipetl ?? false)
  );
}

/** Ordina per rango grezzo della carta; a parità un Dio in scelta come Chipetl prima. */
function byRaw(a: Option, b: Option): number {
  return (
    cardRank(a.card) - cardRank(b.card) ||
    cardId(a.card).localeCompare(cardId(b.card)) ||
    Number(b.declareChipetl ?? false) - Number(a.declareChipetl ?? false)
  );
}

function highest(options: Option[]): Option {
  return options.reduce((a, b) => (cardRank(b.card) > cardRank(a.card) ? b : a));
}

function toIntent(o: Option): Intent {
  const intent: Intent = { type: 'play', cardId: cardId(o.card) };
  if (o.declareChipetl !== undefined) intent.declareChipetl = o.declareChipetl;
  return intent;
}

/** Apertura con need > 0. Un Dio in apertura è sempre nullo (§5.3): non si apre mai con un Dio. */
function leadWanting(options: Option[], need: number): Option {
  const sure = options.filter(
    (o) => isSureTotem(o.card) || (o.card.kind === 'god' && o.card.god === 'taotl'),
  );
  if (need >= sure.length) {
    const totems = options.filter((o) => isSureTotem(o.card));
    if (totems.length > 0) return highest(totems);
  }
  const bySuit = new Map<string, Option[]>();
  for (const o of options) {
    if (o.card.kind === 'suited' && o.card.suit !== 'totem') {
      const list = bySuit.get(o.card.suit) ?? [];
      list.push(o);
      bySuit.set(o.card.suit, list);
    }
  }
  let longest: Option[] | null = null;
  for (const list of bySuit.values()) {
    if (longest === null || list.length > longest.length) longest = list;
  }
  if (longest !== null) return highest(longest);
  const suited = options.filter((o) => o.card.kind === 'suited');
  if (suited.length > 0) return highest(suited);
  return [...options].sort(byWeakness)[0]!;
}

export function choosePlay(view: PlayerView): Intent {
  const playable = new Set(view.playableCardIds);
  const cards = view.hand.filter((x) => playable.has(cardId(x)));
  if (cards.length === 0) throw new Error('Nessuna carta giocabile');
  const me = view.players.find((p) => p.id === view.me);
  if (me === undefined || me.bid === null) throw new Error('Dichiarazione del bot mancante');
  const need = me.bid - me.tricksWon;
  const leading = view.currentTrick.length === 0;
  let options = buildOptions(view, cards);

  if (need > 0) {
    if (leading) return toIntent(leadWanting(options, need));
    const winning = options.filter((o) => o.wins).sort(byWeakness);
    if (winning.length > 0) return toIntent(winning[0]!);
    return toIntent([...options].sort(byRaw)[0]!);
  }

  // need <= 0: non voglio prendere; un Dio in scelta va giocato come Chipetl.
  options = options.filter((o) => o.declareChipetl !== false);
  if (!leading) {
    const safe = options.filter((o) => !o.wins);
    if (safe.length > 0) return toIntent(safe.reduce((a, b) => (byWeakness(b, a) > 0 ? b : a)));
    return toIntent([...options].sort(byWeakness)[0]!);
  }
  return toIntent([...options].sort(byRaw)[0]!);
}
