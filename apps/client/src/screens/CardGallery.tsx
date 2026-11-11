import { createDeck, type Card as CardT } from '@taotl/engine';
import { Card } from '../components/Card';

const SIZES = ['hand', 'trick', 'mini'] as const;
const SAMPLE: CardT = { kind: 'suited', suit: 'cuori', rank: 12 };

/** Solo sviluppo: tutte le carte nelle tre dimensioni. Rotta /dev/cards. */
export function CardGallery() {
  const deck = createDeck();
  return (
    <main className="gallery">
      <h1>Carte ({deck.length})</h1>
      {SIZES.map((size) => (
        <section key={size}>
          <h2>{size}</h2>
          <div className="gallery-row">
            {deck.map((c, i) => (
              <Card key={i} card={c} size={size} interactive={false} />
            ))}
          </div>
        </section>
      ))}
      <section>
        <h2>Etichette, disabilitata, selezionata</h2>
        <div className="gallery-row">
          <Card card={{ kind: 'chipetl', n: 2 }} label="Chipetl" size="trick" interactive={false} />
          <Card card={{ kind: 'god', god: 'nero' }} label="Nullo" size="trick" interactive={false} />
          <Card card={{ kind: 'chipetl', n: 3 }} label="Chipetl" size="mini" interactive={false} />
          <Card card={{ kind: 'god', god: 'rosso' }} label="Nullo" size="mini" interactive={false} />
          <Card card={SAMPLE} size="hand" disabled dimmed />
          <Card card={SAMPLE} size="hand" selected />
        </div>
      </section>
    </main>
  );
}
