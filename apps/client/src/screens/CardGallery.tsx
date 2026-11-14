import { createDeck, type Card as CardT } from '@taotl/engine';
import { Card } from '../components/Card';

const SAMPLE: CardT = { kind: 'suited', suit: 'cuori', rank: 12 };
const GROUPS: Array<[string, (c: CardT) => boolean]> = [
  ['Quadri', (c) => c.kind === 'suited' && c.suit === 'quadri'],
  ['Cuori', (c) => c.kind === 'suited' && c.suit === 'cuori'],
  ['Fiori', (c) => c.kind === 'suited' && c.suit === 'fiori'],
  ['Picche', (c) => c.kind === 'suited' && c.suit === 'picche'],
  ['Totem', (c) => c.kind === 'suited' && c.suit === 'totem'],
  ['Dei e Chipetl', (c) => c.kind !== 'suited'],
];

/** Solo sviluppo: tutte le carte, il retro e gli stati. Rotta /dev/cards. */
export function CardGallery() {
  const deck = createDeck();
  const seen = new Set<string>();
  return (
    <main className="gallery" data-testid="card-gallery">
      <h1>Il mazzo del Taotl</h1>
      <p className="gallery-note">72 carte, tutte dal componente &lt;Card&gt;. Dimensioni: mano e presa (in alto), mini (in fondo).</p>
      {GROUPS.map(([title, pick]) => (
        <section key={title}>
          <h2>{title}</h2>
          <div className="gallery-row">
            {deck.filter(pick).map((c) => {
              // i 4 Chipetl sono identici: se ne mostra uno
              const key = c.kind === 'chipetl' ? 'chipetl' : JSON.stringify(c);
              if (seen.has(key)) return null;
              seen.add(key);
              return <Card key={key} card={c} size="trick" interactive={false} />;
            })}
          </div>
        </section>
      ))}
      <section>
        <h2>Retro, etichette e stati</h2>
        <div className="gallery-row">
          <Card size="trick" />
          <Card card={{ kind: 'chipetl', n: 2 }} label="Chipetl" size="trick" interactive={false} />
          <Card card={{ kind: 'god', god: 'nero' }} label="Nullo" size="trick" interactive={false} />
          <Card card={{ kind: 'god', god: 'rosso' }} label="Chipetl" size="trick" interactive={false} />
          <Card card={SAMPLE} size="hand" disabled dimmed />
          <Card card={SAMPLE} size="hand" selected />
        </div>
      </section>
      <section>
        <h2>Mini</h2>
        <div className="gallery-row">
          {deck.map((c, i) => (
            <Card key={i} card={c} size="mini" interactive={false} />
          ))}
          <Card size="mini" />
        </div>
      </section>
    </main>
  );
}
