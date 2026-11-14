import { INK, MID } from './ink';

/**
 * Dei, Chipetl e retro. Disegni originali che seguono i soggetti e gli inchiostri del mazzo:
 * Dio Rosso = serpente piumato rosso-verde, Dio Nero = guerriero dallo specchio fumante
 * giallo-nero, Taotl = rosone di piume con colibrì, Chipetl = teschio verde con fiori.
 */

const { red: R, green: G, black: K, yellow: Y, paper: P } = INK;
const ST = { stroke: K, strokeWidth: 1.3, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
const flipHalf = `rotate(180 60 ${MID})`;

function Feather({ x, y, deg, len, fill, w = 3.4 }: { x: number; y: number; deg: number; len: number; fill: string; w?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${deg})`}>
      <path d={`M0 0C${-w} ${-len * 0.3} ${-w} ${-len * 0.75} 0 ${-len}C${w} ${-len * 0.75} ${w} ${-len * 0.3} 0 0Z`} fill={fill} {...ST} strokeWidth={1} />
      <path d={`M0 -2V${-len + 3}`} stroke={P} strokeWidth=".8" />
    </g>
  );
}

/* ---------- Dio Rosso: serpente piumato ---------- */
function SerpentHalf() {
  return (
    <g>
      {[-150, -125, -100, -75, -50, -25].map((d, i) => <Feather key={d} x={50} y={40} deg={d} len={20} fill={i % 2 ? R : G} />)}
      <path d={`M47 54C30 64 38 84 60 ${MID}`} fill="none" stroke={K} strokeWidth="15" />
      <path d={`M47 54C30 64 38 84 60 ${MID}`} fill="none" stroke={R} strokeWidth="12.4" />
      <path d={`M47 54C30 64 38 84 60 ${MID}`} fill="none" stroke={G} strokeWidth="6" strokeDasharray="3.2 3" />
      {/* testa */}
      <path d="M41 33Q51 24 64 28.6L79 32.2Q82.4 35.6 78 38.2L60.6 39.6 45.6 44Z" fill={R} {...ST} />
      <path d="M45.6 47.2 61.4 43.4 75.6 48.6Q74.4 52.6 69 51.4L49 54.4Z" fill={R} {...ST} />
      <path d="M43 38Q42 46 45.6 47.2 49 54.4 47 56Q38 50 39 40Z" fill={R} {...ST} />
      {[64, 68.4, 72.8].map((x) => <path key={x} d={`M${x} 39.2L${x + 1.6} 42.6L${x + 3} 38.8Z`} fill={P} stroke={K} strokeWidth=".6" />)}
      <path d="M73.4 38.4 75.4 45.6 76.6 38.2Z" fill={P} {...ST} strokeWidth={0.8} />
      <path d="M62 43.2Q72 44 80 41L85 38.6M80 41 85 43.4" fill="none" stroke={R} strokeWidth="1.6" />
      <circle cx="56.4" cy="33.8" r="3.8" fill={P} {...ST} />
      <circle cx="57.4" cy="33.8" r="1.7" fill={K} />
      <path d="M50 30Q54 25 61 27.4" fill="none" stroke={G} strokeWidth="2.6" />
      <path d="M66 29.6 71 25.4 70 31" fill={G} {...ST} strokeWidth={0.8} />
      {/* scudo rotondo */}
      <circle cx="84" cy="72" r="11" fill={G} {...ST} strokeWidth={1.5} />
      <circle cx="84" cy="72" r="7.4" fill={R} {...ST} />
      <path d="M84 64.6V79.4M76.6 72H91.4" stroke={P} strokeWidth="1.4" />
      <circle cx="84" cy="72" r="2" fill={P} {...ST} strokeWidth={0.8} />
    </g>
  );
}

/* ---------- Dio Nero: specchio fumante ---------- */
const HEAD = 'M52.5 33.5C58 31.4 66.2 33.2 67.2 39.6L67.4 42.2 70.4 46.2 67.4 47.6 68.2 49.6 66.6 50.6 67.6 52.6C66.2 55.8 63 56.6 61 56.6L58.6 57 57.6 60.6H50.4V46C50.4 39.6 50.8 35.6 52.5 33.5Z';
function MirrorHalf() {
  return (
    <g>
      {[-84, -64, -44, -24, -4, 16].map((d, i) => <Feather key={d} x={55} y={34} deg={d} len={24} fill={i % 2 ? Y : K} />)}
      <path d={`M31 ${MID}L33.6 74Q36 65 49 62.6H71Q84 65 86.4 74L89 ${MID}Z`} fill={Y} {...ST} strokeWidth={1.5} />
      {[40, 52, 64, 76].map((x, i) => <circle key={x} cx={x + (i % 2) * 2} cy={84} r="4" fill="none" stroke={K} strokeWidth="2.2" />)}
      {[38, 46, 54, 62, 70, 78].map((x) => <circle key={x} cx={x} cy={72} r="1.4" fill={K} />)}
      <path d="M47.6 61.6Q60 68.6 72.4 61.6V65.6Q60 72.6 47.6 65.6Z" fill={K} />
      <path d="M53.4 56.6H62.4L61.8 64H54Z" fill={Y} {...ST} />
      <clipPath id="tez-face">
        <path d={HEAD} />
      </clipPath>
      <path d={HEAD} fill={Y} />
      <g clipPath="url(#tez-face)">
        {[38.6, 45, 51.4].map((y) => <rect key={y} x="48" y={y} width="26" height="3.4" fill={K} />)}
      </g>
      <path d={HEAD} fill="none" {...ST} />
      <path d="M59.4 43.2Q62 41.4 64.6 43.2 62 44.6 59.4 43.2Z" fill={P} stroke={K} strokeWidth=".6" />
      {/* specchio sulla tempia e fumo */}
      <circle cx="52.4" cy="40" r="6" fill={K} stroke={Y} strokeWidth="1.8" />
      <circle cx="52.4" cy="40" r="2.2" fill={Y} />
      <path d="M50 33.6Q46 28 50 24 54 21 51 16M55 33.8Q59 29 56.4 24.6 54.6 21 58 17" fill="none" stroke={K} strokeWidth="1.8" />
      <circle cx="51" cy="15" r="1.6" fill={Y} {...ST} strokeWidth={0.8} />
      <circle cx="58.4" cy="16" r="1.6" fill={Y} {...ST} strokeWidth={0.8} />
      {/* fascio di dardi */}
      {[-8, 0, 8].map((dx) => (
        <g key={dx}>
          <path d={`M${78 + dx * 0.4} 86L${86 + dx} 24`} stroke={K} strokeWidth="1.6" />
          <path d={`M${86 + dx} 24l-2.6 5.6h5.2Z`} fill={K} />
        </g>
      ))}
      <path d="M73.6 63.6Q83.4 65.4 85.6 72.4L88 79.6 81.4 82 77 72.6Z" fill={K} {...ST} />
      <ellipse cx="84.4" cy="80.6" rx="4.1" ry="3.6" fill={Y} {...ST} />
    </g>
  );
}

/* ---------- Taotl: rosone di piume e colibrì ---------- */
function Hummingbird() {
  return (
    <g>
      <path d="M60 60 60 70" stroke={K} strokeWidth="1.6" />
      <path d="M60 30C67 30 70 37 68 44L64 58H56L52 44C50 37 53 30 60 30Z" fill={G} {...ST} />
      <path d="M55 46H65L63.4 54H56.6Z" fill={R} {...ST} strokeWidth={1} />
      <path d="M52 36 36 28 40 38 30 40 44 44Z" fill={G} {...ST} />
      <path d="M68 36 84 28 80 38 90 40 76 44Z" fill={G} {...ST} />
      <path d="M40 34 46 38M80 34 74 38" stroke={Y} strokeWidth="1.4" />
      <path d="M55 30 52 22 58 27 60 19 62 27 68 22 65 30Z" fill={R} {...ST} strokeWidth={1} />
      <circle cx="56.6" cy="39" r="2" fill={P} {...ST} strokeWidth={0.8} />
      <circle cx="63.4" cy="39" r="2" fill={P} {...ST} strokeWidth={0.8} />
      <circle cx="56.6" cy="39" r=".9" fill={K} />
      <circle cx="63.4" cy="39" r=".9" fill={K} />
    </g>
  );
}

function Tuft({ x, y, deg }: { x: number; y: number; deg: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${deg})`}>
      <Feather x={0} y={0} deg={-24} len={13} fill={R} w={3} />
      <Feather x={0} y={0} deg={0} len={15} fill={R} w={3} />
      <Feather x={0} y={0} deg={24} len={13} fill={R} w={3} />
      <rect x="-3" y="-1" width="6" height="4" fill={Y} {...ST} strokeWidth={0.9} />
    </g>
  );
}

function TaotlArt() {
  const rosette = Array.from({ length: 16 }, (_, i) => i * 22.5);
  return (
    <g>
      <path d="M30 36 90 148M90 36 30 148" stroke={K} strokeWidth="5.4" strokeLinecap="round" />
      <path d="M30 36 90 148M90 36 30 148" stroke={G} strokeWidth="3" strokeLinecap="round" />
      <Tuft x={30} y={36} deg={-28} />
      <Tuft x={90} y={36} deg={28} />
      <Tuft x={30} y={148} deg={-152} />
      <Tuft x={90} y={148} deg={152} />
      <Hummingbird />
      <g transform={flipHalf}>
        <Hummingbird />
      </g>
      {rosette.map((d, i) => <Feather key={d} x={60} y={MID} deg={d} len={31} fill={i % 2 ? Y : R} w={4.4} />)}
      <circle cx="60" cy={MID} r="17" fill={Y} {...ST} strokeWidth={1.5} />
      <circle cx="60" cy={MID} r="12.4" fill={K} />
      <path d={`M50 ${MID - 3}H70V${MID + 1}H50Z`} fill={Y} />
      <circle cx="55.4" cy={MID - 1} r="2.2" fill={P} />
      <circle cx="64.6" cy={MID - 1} r="2.2" fill={P} />
      <path d={`M60 ${MID + 2}V${MID + 9}`} stroke={G} strokeWidth="2.6" />
      {[0, 90, 180, 270].map((d) => (
        <circle key={d} cx={60 + 14.8 * Math.cos((d * Math.PI) / 180)} cy={MID + 14.8 * Math.sin((d * Math.PI) / 180)} r="1.5" fill={R} {...ST} strokeWidth={0.6} />
      ))}
    </g>
  );
}

export function GodArt({ god }: { god: 'rosso' | 'nero' | 'taotl' }) {
  if (god === 'taotl') return <TaotlArt />;
  const Half = god === 'rosso' ? SerpentHalf : MirrorHalf;
  return (
    <g>
      <Half />
      <g transform={flipHalf}>
        <Half />
      </g>
    </g>
  );
}

/* ---------- Chipetl: teschio verde con corona di fiori ---------- */
function Flower({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {[0, 60, 120, 180, 240, 300].map((a) => (
        <path key={a} d="M0 0C-3.6-2.6-3.4-7.4 0-8.6 3.4-7.4 3.6-2.6 0 0Z" fill={R} transform={`rotate(${a})`} {...ST} strokeWidth={0.9} />
      ))}
      <circle r="2.8" fill={Y} {...ST} strokeWidth={0.9} />
    </g>
  );
}
function Leaves({ x, y, deg }: { x: number; y: number; deg: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${deg})`} fill={Y} {...ST} strokeWidth={0.8}>
      <path d="M0 0C-2-3-6-4-8-2-6 1-2 1 0 0Z" />
      <path d="M0 0C2-3 6-4 8-2 6 1 2 1 0 0Z" />
      <path d="M0 0C-1-3 0-7 0-9 1-7 1-3 0 0Z" />
    </g>
  );
}

export function ChipetlArt() {
  return (
    <g>
      <path d="M60 56C80.6 56 93 70.4 93 88.4 93 100 88.4 107.4 82.6 110.4V121.6C82.6 128.4 75.6 133 60 133S37.4 128.4 37.4 121.6V110.4C31.6 107.4 27 100 27 88.4 27 70.4 39.4 56 60 56Z" fill={G} {...ST} strokeWidth={1.8} />
      <path d="M38.4 92.2C38.4 84 44 81 49 81.6 55 82.4 56.6 88 55.4 93.4 54 99.6 49.4 102.4 45 101.6 40.6 100.8 38.4 97 38.4 92.2Z" fill={K} />
      <path d="M81.6 92.2C81.6 84 76 81 71 81.6 65 82.4 63.4 88 64.6 93.4 66 99.6 70.6 102.4 75 101.6 79.4 100.8 81.6 97 81.6 92.2Z" fill={K} />
      <path d="M60 99.4 54.6 109.2Q60 112 65.4 109.2Z" fill={K} />
      <path d="M44 116.4Q60 113.4 76 116.4V125Q60 128.4 44 125Z" fill={P} {...ST} strokeWidth={1.4} />
      <path d="M48.4 115.4V126M52.8 114.8V126.8M57.2 114.4V127.2M61.6 114.4V127.2M66 114.6V127M70.4 115V126.4M74.4 115.8V125.4" stroke={K} strokeWidth="1.1" />
      <path d="M44 120.6Q60 118.8 76 120.6" fill="none" stroke={K} strokeWidth="1" />
      <path d="M33 104Q37 108.4 37.4 110.4M87 104Q83 108.4 82.6 110.4" fill="none" stroke={K} strokeWidth="1.2" />
      {/* corona */}
      <Leaves x={36} y={77} deg={-48} />
      <Leaves x={84} y={77} deg={48} />
      <Flower x={30.6} y={84} s={0.85} />
      <Flower x={43.6} y={70} />
      <Leaves x={52} y={66} deg={-12} />
      <Flower x={60} y={66.6} s={1.1} />
      <Leaves x={68} y={66} deg={12} />
      <Flower x={76.4} y={70} />
      <Flower x={89.4} y={84} s={0.85} />
    </g>
  );
}

/* ---------- Retro: serpenti a linea bianca su verde chiaro ---------- */
function BackQuarter() {
  return (
    <g fill="none" stroke={P} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M55 15C40 13 30 18 24 26 18 34 22 44 16 50 12 56 14 66 22 70 30 74 26 84 18 88" />
      <path d="M50 21C41 20 34 24 30 30 26 36 30 46 24 52 20 58 22 64 28 66" strokeWidth="1.4" />
      {/* testa del serpente rivolta al centro */}
      <path d="M33 32C38 26 48 27 52 34 55 40 51 47 45 48 39 49 33 44 33 38Z" />
      <path d="M52 34 57 38M50 44 55.6 50" />
      <path d="M44 48 45.4 58" strokeWidth="1.8" />
      <circle cx="42.6" cy="36" r="2.4" />
      <circle cx="42.6" cy="36" r=".6" fill={P} />
      <path d="M36 42Q40 44 44 42.4" strokeWidth="1.4" />
      {/* piccolo fiocco verso il centro */}
      <path d="M40 80H52L54 72H38Z" strokeWidth="1.6" />
      <path d="M42 80V72M46 80V72M50 80V72" strokeWidth="1.1" />
      <circle cx="46" cy="84.6" r="3" strokeWidth="1.6" />
      <circle cx="10" cy="40" r="1.5" fill={P} />
      <circle cx="10" cy="62" r="1.5" fill={P} />
      <circle cx="10" cy="84" r="1.5" fill={P} />
    </g>
  );
}

export function BackArt() {
  return (
    <g>
      <rect x="0.8" y="0.8" width="118.4" height="182.4" rx="8" fill={INK.back} stroke="#7fa64c" strokeWidth="1.2" />
      <rect x="5" y="5" width="110" height="174" rx="5" fill="none" stroke={P} strokeWidth="1.2" opacity=".85" />
      <BackQuarter />
      <g transform="matrix(-1 0 0 1 120 0)">
        <BackQuarter />
      </g>
      <g transform={`matrix(1 0 0 -1 0 ${2 * MID})`}>
        <BackQuarter />
      </g>
      <g transform={`matrix(-1 0 0 -1 120 ${2 * MID})`}>
        <BackQuarter />
      </g>
    </g>
  );
}
