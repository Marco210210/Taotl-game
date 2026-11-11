import type { Suit } from '@taotl/engine';

/** Colore di ogni seme (token definiti in theme.css). */
export const SUIT_COLOR: Record<Suit, string> = {
  picche: 'var(--suit-picche)',
  cuori: 'var(--suit-cuori)',
  quadri: 'var(--suit-quadri)',
  fiori: 'var(--suit-fiori)',
  totem: 'var(--suit-totem)',
};

/** Sole a 8 punte per il Totem (calcolato, nessun asset esterno). */
const SUN = (() => {
  const pts: string[] = [];
  for (let i = 0; i < 16; i += 1) {
    const r = i % 2 === 0 ? 11.6 : 5.6;
    const a = (Math.PI * i) / 8 - Math.PI / 2;
    pts.push(`${(12 + r * Math.cos(a)).toFixed(2)} ${(12 + r * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pts.join('L')}Z M12 8.4a3.6 3.6 0 1 0 0.01 0Z`;
})();

/** Forme su griglia 24x24: ogni seme ha una silhouette diversa (leggibile anche in grigio). */
const PATHS: Record<Suit, string> = {
  // scheggia di ossidiana, spigolosa
  picche: 'M12 1 L20 12 L19 17 L14 16 L15.2 23 H8.8 L10 16 L5 17 L4 12 Z',
  // piramide a gradoni con tempio
  fiori: 'M2 22 V18.5 H5 V15 H8 V11.5 H10 V8 H11 V4 H13 V8 H14 V11.5 H16 V15 H19 V18.5 H22 V22 Z',
  // cuore sacrificale arrotondato
  cuori: 'M12 22.5 C4 16.5 2 11.5 2 7.6 C2 4.2 4.5 2 7.6 2 C9.6 2 11.1 3 12 4.9 C12.9 3 14.4 2 16.4 2 C19.5 2 22 4.2 22 7.6 C22 11.5 20 16.5 12 22.5 Z',
  // rombo-sole con foro quadrato
  quadri: 'M12 1 L23 12 L12 23 L1 12 Z M12 8.6 L15.4 12 L12 15.4 L8.6 12 Z',
  totem: SUN,
};

export function SuitGlyph({ suit, x = 0, y = 0, size = 24 }: { suit: Suit; x?: number; y?: number; size?: number }) {
  return (
    <svg x={x} y={y} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ fill: SUIT_COLOR[suit] }}>
      <path d={PATHS[suit]} fillRule="evenodd" />
    </svg>
  );
}
