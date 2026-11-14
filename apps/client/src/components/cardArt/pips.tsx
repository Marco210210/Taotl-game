import type { Suit } from '@taotl/engine';
import { INK } from './ink';

/**
 * Simboli dei semi su una tavoletta 24x30 (centro 12,15), disegnati da zero
 * sulle forme del mazzo originale: cuore allungato, rombo, trifoglio, punta di lancia, maschera.
 */
export type PipKind = Suit | 'chipetl' | 'rosso' | 'nero' | 'taotl';

const circle = (cx: number, cy: number, r: number) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;

const HEART = 'M12 29.4C10.2 23.6 2 17 2 9.6 2 5 4.6 2.2 8 2.2c2.1 0 3.4 1.3 4 3.2.6-1.9 1.9-3.2 4-3.2 3.4 0 6 2.8 6 7.4C22 17 13.8 23.6 12 29.4Z';
const DIAMOND = 'M12 .8 21.8 15 12 29.2 2.2 15Z';
const CLUB = `${circle(12, 7.4, 5.3)} ${circle(6, 15.2, 5.3)} ${circle(18, 15.2, 5.3)} ${circle(12, 13.6, 3)} M10.9 15.5h2.2l1.6 13.4c-1.8-.7-4.6-.7-5.4 0Z`;
const SPEAR = 'M12 .6C14.6 6 18.6 12 18.6 16.8c0 3.2-2.8 5.2-5.4 5.7l.5 3.3 1.6 3H8.7l1.6-3 .5-3.3c-2.6-.5-5.4-2.5-5.4-5.7C5.4 12 9.4 6 12 .6Z';
const SPEAR_RIB = 'M11.5 6.2h1l.45 14.4h-1.9Z';

function Mask() {
  return (
    <g>
      <path d="M4 3.2h16v17.4c0 4.4-3.6 7.6-8 7.6s-8-3.2-8-7.6Z" fill={INK.yellow} stroke={INK.line} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M6.6 10.2h4v2.2h-4Zm6.8 0h4v2.2h-4Z" fill={INK.line} />
      <path d="M12 12.6 10.2 18h3.6Z" fill={INK.line} />
      <path d="M8.2 21.4h7.6v2.2H8.2Z" fill={INK.line} />
    </g>
  );
}

function Skull() {
  return (
    <g>
      <path d="M12 2.2c5.6 0 9.6 3.8 9.6 9.2 0 3.4-1.4 5.4-3 6.6v4.4c0 2.6-1.8 4.6-6.6 4.6s-6.6-2-6.6-4.6V18c-1.6-1.2-3-3.2-3-6.6 0-5.4 4-9.2 9.6-9.2Z" fill={INK.green} stroke={INK.line} strokeWidth="1.3" />
      <path d={`${circle(8.2, 12, 2.7)} ${circle(15.8, 12, 2.7)}`} fill={INK.line} />
      <path d="M12 15.2 10.6 18h2.8Z" fill={INK.line} />
      <path d="M8.6 20.6h6.8v2.6H8.6Z" fill="#fff" stroke={INK.line} strokeWidth=".8" />
      <path d="M10.9 20.6v2.6m2.2-2.6v2.6" stroke={INK.line} strokeWidth=".7" />
    </g>
  );
}

/** Fiocco di piume dei Dei: bulbo in alto, ventaglio di piume in basso. */
function Tassel({ top, fan, band }: { top: string; fan: string; band: string }) {
  return (
    <g stroke={INK.line} strokeWidth="1.1" strokeLinejoin="round">
      <path d="M12 12.6 3.4 26.8c2.4 1.6 14.8 1.6 17.2 0Z" fill={fan} />
      <path d="M12 13.8 8 27.6M12 13.8l4 13.8M12 13.8V28" fill="none" strokeWidth=".9" />
      <path d="M7.6 11.2h8.8v2.6H7.6Z" fill={band} />
      <path d={circle(12, 6.4, 4.6)} fill={top} />
      <path d={circle(12, 6.4, 1.6)} fill={INK.paper} strokeWidth=".6" />
    </g>
  );
}

export function PipShape({ kind }: { kind: PipKind }) {
  switch (kind) {
    case 'cuori':
      return <path d={HEART} fill={INK.red} />;
    case 'quadri':
      return <path d={DIAMOND} fill={INK.red} />;
    case 'fiori':
      return <path d={CLUB} fill={INK.black} />;
    case 'picche':
      return (
        <g>
          <path d={SPEAR} fill={INK.black} />
          <path d={SPEAR_RIB} fill={INK.paper} />
        </g>
      );
    case 'totem':
      return <Mask />;
    case 'chipetl':
      return <Skull />;
    case 'rosso':
      return <Tassel top={INK.red} fan={INK.red} band={INK.green} />;
    case 'nero':
      return <Tassel top={INK.black} fan={INK.yellow} band={INK.black} />;
    case 'taotl':
      return <Tassel top={INK.green} fan={INK.red} band={INK.yellow} />;
  }
}

/** Simbolo largo `w` con il centro in (cx, cy); `flip` lo capovolge (metà bassa della carta). */
export function Pip({ kind, cx, cy, w, flip = false }: { kind: PipKind; cx: number; cy: number; w: number; flip?: boolean }) {
  const s = w / 24;
  return (
    <g transform={`translate(${cx} ${cy}) rotate(${flip ? 180 : 0}) scale(${s}) translate(-12 -15)`}>
      <PipShape kind={kind} />
    </g>
  );
}
