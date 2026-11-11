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
  // coltello d'ossidiana sfaccettato, con manico (la fessura e' la sfaccettatura)
  picche: 'M12 0.5 L19 9 L16.5 16.5 L12 18.5 L7.5 16.5 L5 9 Z M11.4 4.5 L12.6 4.5 L13 15 L11 15 Z M10.2 19 H13.8 V23.5 H10.2 Z',
  // piramide a gradoni con tempio
  fiori: 'M2 22 V18.5 H5 V15 H8 V11.5 H10 V8 H11 V4 H13 V8 H14 V11.5 H16 V15 H19 V18.5 H22 V22 Z',
  // cuore a gradoni (contorno a greca)
  cuori: 'M12 23 H10 V21 H8 V19 H6 V17 H4 V15 H2 V6 H4 V4 H9 V6 H11 V8 H13 V6 H15 V4 H20 V6 H22 V15 H20 V17 H18 V19 H16 V21 H14 V23 Z',
  // disco di giada con foro quadrato
  quadri: 'M12 0.5 a11.5 11.5 0 1 0 0.01 0 Z M8 8 H16 V16 H8 Z',
  totem: SUN,
};

export function SuitGlyph({ suit, x = 0, y = 0, size = 24 }: { suit: Suit; x?: number; y?: number; size?: number }) {
  return (
    <svg x={x} y={y} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ fill: SUIT_COLOR[suit] }}>
      <path d={PATHS[suit]} fillRule="evenodd" />
    </svg>
  );
}
