import { useId } from 'react';
import type { Suit } from '@taotl/engine';
import { INK, MID } from './ink';

/**
 * Figure J/Q/K a doppia testa. Ogni figura è una mezza figura (busto di profilo, metà alta
 * della carta) ruotata di 180° per la metà bassa, come nelle carte da gioco classiche.
 * I personaggi seguono lo schema del mazzo originale (Aztechi, Spagnoli, divinità del Totem),
 * ma i disegni sono costruiti da zero con primitive geometriche.
 */

type Headgear = 'plumes' | 'rays' | 'crown' | 'beret' | 'helmet' | 'blades' | 'veil' | 'wrap' | 'band' | 'monster' | 'flowers' | 'none';
type Hair = 'short' | 'long' | 'none';
type Pattern = 'chevron' | 'dots' | 'scales' | 'stripes' | 'fret' | 'rings' | 'checker' | 'waves';
type Prop = 'spear' | 'scepter' | 'flower' | 'fan' | 'sword' | 'club' | 'scroll' | 'rattle' | 'none';
type Collar = 'beads' | 'ruff' | 'plain';

export interface FigureSpec {
  name: string;
  facing: 'right' | 'left';
  /** a: veste, b: maniche e motivo, c: accento (fascia, copricapo) */
  a: string;
  b: string;
  c: string;
  headgear: Headgear;
  hair: Hair;
  beard?: boolean;
  /** volto dipinto di nero (divinità) */
  darkFace?: boolean;
  pattern: Pattern;
  collar: Collar;
  prop: Prop;
  shield?: boolean;
}

const { red: R, green: G, black: K, yellow: Y } = INK;

/** Personaggi per seme e valore (11 = J, 12 = Q, 13 = K). */
export const FIGURES: Record<Exclude<Suit, never>, Record<11 | 12 | 13, FigureSpec>> = {
  quadri: {
    13: { name: 'ahuitzotl', facing: 'right', a: R, b: G, c: K, headgear: 'plumes', hair: 'short', pattern: 'scales', collar: 'beads', prop: 'spear', shield: true },
    12: { name: 'tlilalcapatl', facing: 'left', a: G, b: R, c: K, headgear: 'veil', hair: 'long', pattern: 'chevron', collar: 'beads', prop: 'fan' },
    11: { name: 'itztli', facing: 'right', a: R, b: K, c: G, headgear: 'blades', hair: 'short', pattern: 'checker', collar: 'plain', prop: 'club' },
  },
  cuori: {
    13: { name: 'moctezuma', facing: 'left', a: R, b: G, c: K, headgear: 'plumes', hair: 'short', pattern: 'dots', collar: 'beads', prop: 'scepter' },
    12: { name: 'ixtaccihuatl', facing: 'right', a: G, b: R, c: K, headgear: 'wrap', hair: 'long', pattern: 'rings', collar: 'beads', prop: 'flower' },
    11: { name: 'toxcatl', facing: 'left', a: R, b: G, c: K, headgear: 'band', hair: 'short', pattern: 'fret', collar: 'plain', prop: 'rattle' },
  },
  fiori: {
    13: { name: 'carlos', facing: 'right', a: K, b: R, c: Y, headgear: 'crown', hair: 'short', beard: true, pattern: 'waves', collar: 'ruff', prop: 'scepter' },
    12: { name: 'isabella', facing: 'left', a: R, b: K, c: Y, headgear: 'crown', hair: 'long', pattern: 'scales', collar: 'ruff', prop: 'flower' },
    11: { name: 'bernal', facing: 'right', a: K, b: R, c: Y, headgear: 'beret', hair: 'short', beard: true, pattern: 'dots', collar: 'ruff', prop: 'scroll' },
  },
  picche: {
    13: { name: 'hernan', facing: 'left', a: R, b: Y, c: K, headgear: 'helmet', hair: 'short', beard: true, pattern: 'stripes', collar: 'ruff', prop: 'sword' },
    12: { name: 'marina', facing: 'right', a: Y, b: K, c: R, headgear: 'none', hair: 'long', pattern: 'checker', collar: 'plain', prop: 'none' },
    11: { name: 'alvarado', facing: 'left', a: K, b: Y, c: R, headgear: 'beret', hair: 'short', pattern: 'waves', collar: 'ruff', prop: 'spear', shield: true },
  },
  totem: {
    13: { name: 'tlaltecuhtli', facing: 'right', a: Y, b: R, c: K, headgear: 'monster', hair: 'none', darkFace: true, pattern: 'fret', collar: 'beads', prop: 'club' },
    12: { name: 'tonantzin', facing: 'left', a: R, b: Y, c: K, headgear: 'rays', hair: 'long', darkFace: true, pattern: 'chevron', collar: 'beads', prop: 'fan' },
    11: { name: 'xochipilli', facing: 'right', a: Y, b: R, c: K, headgear: 'flowers', hair: 'short', darkFace: true, pattern: 'dots', collar: 'beads', prop: 'flower' },
  },
};

const STROKE = { stroke: K, strokeWidth: 1.3, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };

const BODY = `M33 ${MID} L35 72 Q37 63.5 49 61 L71 61 Q83 63.5 85 72 L87 ${MID}Z`;
const HEAD = 'M52.5 31.5C58 29.4 66.2 31.2 67.2 37.6L67.4 40.2 70.4 44.2 67.4 45.6 68.2 47.6 66.6 48.6 67.6 50.6C66.2 53.8 63 54.6 61 54.6L58.6 55 57.6 58.6H50.4V44C50.4 37.6 50.8 33.6 52.5 31.5Z';

function PatternFill({ kind, color }: { kind: Pattern; color: string }) {
  const out: JSX.Element[] = [];
  switch (kind) {
    case 'chevron':
      for (const y of [70, 79, 88]) {
        const pts: string[] = [];
        for (let x = 30, i = 0; x <= 92; x += 5, i += 1) pts.push(`${x},${y + (i % 2 ? -3.5 : 0)}`);
        out.push(<polyline key={y} points={pts.join(' ')} fill="none" stroke={color} strokeWidth="2.6" strokeLinejoin="miter" />);
      }
      break;
    case 'dots':
      for (let r = 0; r < 4; r += 1)
        for (let c = 0; c < 9; c += 1) out.push(<circle key={`${r}-${c}`} cx={34 + c * 7 + (r % 2) * 3.5} cy={68 + r * 7} r="1.7" fill={color} />);
      break;
    case 'scales':
      for (let r = 0; r < 5; r += 1)
        for (let c = 0; c < 10; c += 1) out.push(<path key={`${r}-${c}`} d={`M${30 + c * 6.4 + (r % 2) * 3.2} ${66 + r * 6}a3.2 3.2 0 0 0 6.4 0`} fill="none" stroke={color} strokeWidth="1.5" />);
      break;
    case 'stripes':
      for (const y of [66, 75, 84]) out.push(<rect key={y} x="28" y={y} width="64" height="4" fill={color} />);
      break;
    case 'fret': {
      out.push(<rect key="band" x="28" y="71" width="64" height="11" fill={color} />);
      let d = '';
      for (let x = 28; x < 92; x += 8) d += `M${x} 80h2.5v-4h3v4h2.5`;
      out.push(<path key="steps" d={d} fill="none" stroke={INK.paper} strokeWidth="1.6" />);
      break;
    }
    case 'rings':
      for (let r = 0; r < 3; r += 1)
        for (let c = 0; c < 6; c += 1) out.push(<circle key={`${r}-${c}`} cx={36 + c * 10 + (r % 2) * 5} cy={69 + r * 9} r="3.2" fill="none" stroke={color} strokeWidth="1.7" />);
      break;
    case 'checker':
      for (let r = 0; r < 6; r += 1)
        for (let c = 0; c < 13; c += 1) if ((r + c) % 2 === 0) out.push(<rect key={`${r}-${c}`} x={28 + c * 5} y={63 + r * 5} width="5" height="5" fill={color} />);
      break;
    case 'waves':
      for (const y of [69, 81]) out.push(<path key={y} d={`M28 ${y}q4-5 8 0t8 0 8 0 8 0 8 0 8 0 8 0 8 0`} fill="none" stroke={color} strokeWidth="3.4" />);
      break;
  }
  return <g>{out}</g>;
}

/** Piuma a foglia radicata in (x, y), inclinata di `deg` gradi dalla verticale. */
function Feather({ x, y, deg, len, fill }: { x: number; y: number; deg: number; len: number; fill: string }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${deg})`}>
      <path d={`M0 0C-3.4 ${-len * 0.3} -3.2 ${-len * 0.75} 0 ${-len}C3.2 ${-len * 0.75} 3.4 ${-len * 0.3} 0 0Z`} fill={fill} {...STROKE} strokeWidth={1.1} />
      <path d={`M0 -2V${-len + 3}`} stroke={INK.paper} strokeWidth=".8" />
    </g>
  );
}

function HeadgearBack({ s }: { s: FigureSpec }) {
  if (s.headgear === 'plumes')
    return <g>{[-78, -58, -38, -18, 2].map((deg, i) => <Feather key={deg} x={56} y={31} deg={deg} len={20} fill={i % 2 ? s.b : s.a} />)}</g>;
  if (s.headgear === 'rays')
    return <g>{[-88, -68, -48, -28, -8, 12].map((deg, i) => <Feather key={deg} x={57} y={32} deg={deg} len={18} fill={i % 2 ? s.b : INK.yellow} />)}</g>;
  if (s.headgear === 'veil') return <path d="M50 30Q60 24 68 31L66 34Q56 32 53 39L48 70 39 66Z" fill={s.a} {...STROKE} />;
  if (s.headgear === 'band') return <Feather x={54} y={30} deg={-24} len={22} fill={s.b} />;
  return null;
}

function HeadgearFront({ s }: { s: FigureSpec }) {
  switch (s.headgear) {
    case 'plumes':
    case 'rays':
      return (
        <g>
          <path d="M49.6 29.6H67V35H49.6Z" fill={s.c} {...STROKE} />
          {[53, 58, 63].map((x) => <circle key={x} cx={x} cy={32.3} r="1.2" fill={INK.paper} />)}
        </g>
      );
    case 'crown':
      return (
        <g>
          <path d="M50 34V23.5L53.4 28 56.6 21 59.8 28 63 21 66.2 28 68.2 23.5V34Z" fill={INK.yellow} {...STROKE} />
          <path d="M50 30.8H68.2V34H50Z" fill={INK.red} {...STROKE} strokeWidth={1} />
          {[53.4, 59.8, 66.2].map((x) => <circle key={x} cx={x} cy={25.6} r="1" fill={K} />)}
        </g>
      );
    case 'beret':
      return (
        <g>
          <path d="M46.6 34.4Q45.4 24.6 58 24.2 70.6 24 71.4 30.6 66 31.4 60.4 33.6Z" fill={s.c === INK.yellow ? s.b : s.c} {...STROKE} />
          <path d="M49 33.6 66 30.2" stroke={INK.paper} strokeWidth="1.3" />
          <Feather x={50} y={29} deg={-62} len={14} fill={INK.paper} />
        </g>
      );
    case 'helmet':
      return (
        <g {...STROKE} fill={INK.yellow}>
          <path d="M55.6 21.6Q60.6 13.6 66.6 21.6Z" />
          <path d="M50.4 34Q50.4 22 60.4 21.2 70.4 22 70.4 34Z" />
          <path d="M44.4 35.2Q52 31.6 60.4 34 68.8 31.6 76.4 35.2 68.8 38.6 60.4 37 52 38.6 44.4 35.2Z" />
        </g>
      );
    case 'blades':
      return (
        <g {...STROKE}>
          {[50.5, 54.5, 58.5, 62.5, 66.5].map((x, i) => (
            <path key={x} d={`M${x - 2.4} 31L${x} ${21 - (i % 2) * 3}L${x + 2.4} 31Z`} fill={K} strokeWidth={0.8} />
          ))}
          <path d="M49.6 29.6H67.4V35H49.6Z" fill={s.c} />
        </g>
      );
    case 'veil':
      return (
        <g>
          <path d="M50.6 29.6H67.2V34.2H50.6Z" fill={s.b} {...STROKE} />
          {[54, 58.8, 63.6].map((x) => <circle key={x} cx={x} cy={31.9} r="1.3" fill={INK.yellow} />)}
        </g>
      );
    case 'wrap':
      return (
        <g {...STROKE}>
          <path d="M48.8 36Q46.6 24.8 58.4 23.8 70 23.6 68.6 35Z" fill={s.b} />
          <path d="M49.4 30.6Q58 26.6 68.6 29.8" fill="none" stroke={s.a} strokeWidth="2.8" />
          <path d="M48.8 36 45 46" stroke={s.b} strokeWidth="3" />
        </g>
      );
    case 'band':
      return <path d="M50.2 30H67.2V34.4H50.2Z" fill={s.c} {...STROKE} />;
    case 'monster':
      return (
        <g {...STROKE}>
          <path d="M45 37V23H48.6V19H71.4V23H75V37Z" fill={s.a} />
          <path d="M45 37H75" strokeWidth="1.6" />
          <circle cx="66" cy="27.4" r="3.6" fill={INK.paper} />
          <circle cx="66.8" cy="27.4" r="1.6" fill={K} />
          <path d="M48.6 23H58" />
          {[51, 56, 61, 66, 71].map((x) => <path key={x} d={`M${x - 1.8} 37L${x} 41.6L${x + 1.8} 37`} fill={INK.paper} strokeWidth={0.9} />)}
          <path d="M71.4 19L77 13" stroke={s.b} strokeWidth="2.4" />
        </g>
      );
    case 'flowers':
      return (
        <g>
          <path d="M50 30H67.4V34.4H50Z" fill={s.c} {...STROKE} />
          {[52.6, 58.8, 65].map((x) => (
            <g key={x}>
              {[0, 72, 144, 216, 288].map((a) => (
                <ellipse key={a} cx={x} cy={25} rx="1.8" ry="3" fill={INK.red} transform={`rotate(${a} ${x} 27.6)`} {...STROKE} strokeWidth={0.6} />
              ))}
              <circle cx={x} cy={27.6} r="1.6" fill={INK.yellow} stroke={K} strokeWidth=".5" />
            </g>
          ))}
        </g>
      );
    case 'none':
      return null;
  }
}

function PropBack({ s }: { s: FigureSpec }) {
  const staff = (top: number, color: string = K) => <path d={`M85 ${top}V${MID}`} stroke={color} strokeWidth="2" />;
  switch (s.prop) {
    case 'spear':
      return (
        <g>
          {staff(24)}
          <path d="M85 10.6Q89.6 18 85 25.4 80.4 18 85 10.6Z" fill={K} />
          <path d="M85 14.6V22.4" stroke={INK.paper} strokeWidth=".8" />
        </g>
      );
    case 'scepter':
      return (
        <g>
          {staff(30)}
          <circle cx="85" cy="26" r="4.2" fill={INK.yellow} {...STROKE} />
          <path d="M85 21.8V16.4M82.4 18.8H87.6" stroke={K} strokeWidth="1.6" />
        </g>
      );
    case 'flower':
      return (
        <g>
          {staff(30, INK.green)}
          <path d="M85 30C78 26 77.6 18 81 14.4 82.4 19 83.6 22 85 23.6 86.4 22 87.6 19 89 14.4 92.4 18 92 26 85 30Z" fill={INK.red} {...STROKE} />
          <path d="M85 23.6V13" stroke={K} strokeWidth="1.2" />
          <circle cx="85" cy="12" r="2" fill={INK.yellow} {...STROKE} strokeWidth={0.8} />
          <path d="M85 50Q90 46 92 49 89 53 85 50Z" fill={INK.green} {...STROKE} strokeWidth={0.8} />
        </g>
      );
    case 'fan':
      return (
        <g>
          {staff(50)}
          {[-60, -30, 0, 30, 60].map((deg, i) => <Feather key={deg} x={85} y={50} deg={deg} len={19} fill={i % 2 ? s.a : s.b} />)}
          <circle cx="85" cy="50" r="2.6" fill={INK.yellow} {...STROKE} />
        </g>
      );
    case 'sword':
      return (
        <g {...STROKE}>
          <path d="M83.8 74V20L85 15.6 86.2 20V74Z" fill={INK.paper} />
          <path d="M79 74.6H91" strokeWidth="2.6" />
          <path d="M85 75V86" strokeWidth="2.4" />
        </g>
      );
    case 'club':
      return (
        <g {...STROKE}>
          <path d="M85 80V60" strokeWidth="2.2" />
          <path d="M82 60V26Q85 22 88 26V60Z" fill={s.c === K ? INK.red : s.c} />
          {[30, 37, 44, 51].map((y) => (
            <g key={y} fill={K} strokeWidth={0.6}>
              <path d={`M82 ${y}L78.6 ${y + 2.4}L82 ${y + 4.8}Z`} />
              <path d={`M88 ${y}L91.4 ${y + 2.4}L88 ${y + 4.8}Z`} />
            </g>
          ))}
        </g>
      );
    case 'rattle':
      return (
        <g>
          {staff(34)}
          <ellipse cx="85" cy="27" rx="5" ry="7" fill={INK.yellow} {...STROKE} />
          {[23, 27, 31].map((y) => <circle key={y} cx="85" cy={y} r="1.1" fill={K} />)}
          <path d="M85 20V14" stroke={K} strokeWidth="1.4" />
          <Feather x={85} y={15} deg={20} len={9} fill={INK.green} />
        </g>
      );
    default:
      return null;
  }
}

function Shield({ s }: { s: FigureSpec }) {
  const ring = s.c === INK.yellow || s.b === INK.yellow ? INK.red : s.c;
  return (
    <g>
      <circle cx="39.5" cy="77" r="13.4" fill={ring} {...STROKE} strokeWidth={1.5} />
      <circle cx="39.5" cy="77" r="9" fill={INK.paper} {...STROKE} />
      {s.b === INK.yellow ? (
        <path d="M36 72.4q3.4-3 5.6 0t-3.2 4.6 3.6 4.6M43.6 72q2-2 3 0" fill="none" stroke={K} strokeWidth="1.5" />
      ) : (
        <>
          <circle cx="39.5" cy="77" r="4.6" fill={s.b} {...STROKE} strokeWidth={1} />
          <path d="M39.5 68V86M30.5 77H48.5" stroke={K} strokeWidth=".9" />
        </>
      )}
    </g>
  );
}

function Collar({ s }: { s: FigureSpec }) {
  if (s.collar === 'ruff') {
    const pts: string[] = [];
    for (let i = 0; i <= 10; i += 1) {
      const t = i / 10;
      const x = 47 + t * 26;
      const y = 60.4 + Math.sin(t * Math.PI) * 4.4;
      pts.push(`${x},${y - (i % 2 ? 2.6 : 0)}`);
    }
    for (let i = 10; i >= 0; i -= 1) {
      const t = i / 10;
      pts.push(`${47 + t * 26},${63.6 + Math.sin(t * Math.PI) * 4.4 + (i % 2 ? 2.2 : 0)}`);
    }
    return <polygon points={pts.join(' ')} fill={INK.paper} {...STROKE} strokeWidth={1.1} />;
  }
  if (s.collar === 'beads') {
    return (
      <g>
        <path d="M47.6 59.6Q60 67 72.4 59.6V63.4Q60 70.8 47.6 63.4Z" fill={K} />
        {[0.12, 0.26, 0.4, 0.54, 0.68, 0.82].map((t) => {
          const x = 47.6 + t * 24.8;
          return <circle key={t} cx={x} cy={61.6 + Math.sin(t * Math.PI) * 3.6} r="1.1" fill={INK.paper} />;
        })}
      </g>
    );
  }
  return <path d="M48 59.6Q60 66.4 72 59.6V63.6Q60 70.4 48 63.6Z" fill={s.c} {...STROKE} strokeWidth={1} />;
}

function HalfFigure({ s, clip }: { s: FigureSpec; clip: string }) {
  const skin = s.darkFace ? K : INK.paper;
  const detail = s.darkFace ? INK.paper : K;
  return (
    <g transform={s.facing === 'left' ? 'matrix(-1 0 0 1 120 0)' : undefined}>
      <HeadgearBack s={s} />
      <PropBack s={s} />
      {s.hair === 'long' && <path d="M51 34Q44 40 45 54L41 68 51 66 55 52Z" fill={K} />}
      <path d={BODY} fill={s.a} />
      <g clipPath={`url(#${clip})`}>
        <PatternFill kind={s.pattern} color={s.b} />
        <path d={`M35.6 63.4 43.2 60.2 64 ${MID} 56 ${MID}Z`} fill={s.c} />
        {[0.18, 0.4, 0.62, 0.84].map((t) => (
          <circle key={t} cx={39.4 + t * 20.6} cy={61.8 + t * 30.2} r="1.15" fill={s.c === INK.yellow ? K : INK.paper} />
        ))}
      </g>
      <path d={BODY} fill="none" {...STROKE} strokeWidth={1.5} />
      {s.shield && <Shield s={s} />}
      <path d="M73.6 61.6Q83.4 63.4 85.6 70.4L88.4 78.6 81.4 81.6 77 70.6Z" fill={s.b} {...STROKE} />
      {s.prop === 'scroll' ? (
        <g {...STROKE}>
          <rect x="76.6" y="75.6" width="16" height="7.4" rx="3.7" fill={INK.paper} />
          <path d="M80 77.8H89.2M80 80.6H87" strokeWidth=".8" />
        </g>
      ) : (
        <ellipse cx="85" cy="80.2" rx="4.1" ry="3.6" fill={INK.paper} {...STROKE} />
      )}
      {s.prop === 'none' && <path d="M49 76.6Q53.6 73 57.6 75.4L56.6 79.4Q52.6 78.6 50 80Z" fill={INK.paper} {...STROKE} />}
      <path d="M53.4 54.6H62.4L61.8 62.6H54Z" fill={skin} {...STROKE} />
      <Collar s={s} />
      <path d={HEAD} fill={skin} {...STROKE} />
      {s.hair !== 'none' && <path d="M50.4 46Q49 33.2 55.4 30.6 63.4 28.6 66.8 34L60 35.2Q55.6 36 55.4 43.2L54 50.6H50.4Z" fill={K} />}
      {s.beard && <path d="M58.2 47.8Q57.6 52.6 59 55.8 64.2 57.8 67.6 50.6L66.6 48.6 63.4 49.6Q61 50.4 60.4 47.4Z" fill={K} />}
      <path d="M59.2 41.2Q61.8 39.4 64.4 41.2 61.8 42.6 59.2 41.2Z" fill={detail} />
      <path d="M58.8 38.4Q62 37 65.4 38.2" fill="none" stroke={detail} strokeWidth="1" />
      {s.darkFace && <path d="M60 46.4 64.6 45.8" stroke={INK.red} strokeWidth="1.4" />}
      <circle cx="54.6" cy="45.2" r="1.9" fill="none" stroke={s.darkFace ? INK.paper : K} strokeWidth="1" />
      <HeadgearFront s={s} />
    </g>
  );
}

export function CourtFigure({ spec }: { spec: FigureSpec }) {
  const clip = `body-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <g>
      <clipPath id={clip}>
        <path d={BODY} />
      </clipPath>
      <HalfFigure s={spec} clip={clip} />
      <g transform={`rotate(180 60 ${MID})`}>
        <HalfFigure s={spec} clip={clip} />
      </g>
    </g>
  );
}
