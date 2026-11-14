import type { Card as CardT } from '@taotl/engine';
import { Card } from './Card';

const GODS: CardT[] = [
  { kind: 'god', god: 'rosso' },
  { kind: 'god', god: 'taotl' },
  { kind: 'god', god: 'nero' },
];

/** I tre Dei a ventaglio: l'immagine di apertura del gioco. */
export function GodFan({ cards = GODS }: { cards?: CardT[] }) {
  return (
    <div className="hero-fan" aria-hidden="true">
      {cards.map((c, i) => (
        <Card key={i} card={c} interactive={false} />
      ))}
    </div>
  );
}
