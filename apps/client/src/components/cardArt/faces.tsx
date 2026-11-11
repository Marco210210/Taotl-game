import { useId } from 'react';

/** Volti stilizzati dei Dei e dei Chipetl, su una tavola 60x88 (stessa della carta). */

const FEATHERS = [-62, -38, -14, 14, 38, 62];

function Fan({ cx, cy, r, len, colors, spread = FEATHERS }: { cx: number; cy: number; r: number; len: number; colors: string[]; spread?: number[] }) {
  return (
    <g>
      {spread.map((deg, i) => {
        const a = (deg * Math.PI) / 180;
        const x1 = cx + r * Math.sin(a);
        const y1 = cy - r * Math.cos(a);
        const x2 = cx + (r + len) * Math.sin(a);
        const y2 = cy - (r + len) * Math.cos(a);
        const px = Math.cos(a) * 3.2;
        const py = Math.sin(a) * 3.2;
        return <polygon key={deg} points={`${x1 - px},${y1 - py} ${x2},${y2} ${x1 + px},${y1 + py}`} fill={colors[i % colors.length]} />;
      })}
    </g>
  );
}

/** Greca a gradoni, usata come collare. */
export function Fret({ x, y, w, color }: { x: number; y: number; w: number; color: string }) {
  const steps = Math.floor(w / 6);
  const d: string[] = [];
  for (let i = 0; i < steps; i += 1) d.push(`M${x + i * 6} ${y + 6} v-3 h3 v-3 h3 v6 z`);
  return <path d={d.join(' ')} fill={color} />;
}

function RedGod() {
  return (
    <g>
      <rect x="2" y="2" width="56" height="84" rx="5" fill="#8f1a1c" />
      <circle cx="30" cy="34" r="26" fill="#d9381e" />
      <circle cx="30" cy="34" r="19" fill="#f2a032" opacity="0.55" />
      <Fan cx={30} cy={36} r={17} len={14} colors={['#ffd166', '#ff7a2f', '#e63a1e']} />
      <path d="M16 30 H44 V50 L38 62 H22 L16 50 Z" fill="#c4251d" stroke="#5a0d10" strokeWidth="1.4" />
      <path d="M16 33 H44 V39 H16 Z" fill="#ffd166" />
      <path d="M19 36 L27 33.5 L27 38.5 Z M41 36 L33 33.5 L33 38.5 Z" fill="#3a0a0c" />
      <path d="M30 38 L27 49 H33 Z" fill="#7a1216" />
      <path d="M23 54 H37 L33 59 H27 Z" fill="#3a0a0c" />
      <path d="M30 55 Q27 62 30 66 Q33 62 30 55Z" fill="#ffb347" />
      <circle cx="13.5" cy="46" r="3.4" fill="#ffd166" />
      <circle cx="46.5" cy="46" r="3.4" fill="#ffd166" />
      <Fret x={9} y={70} w={42} color="#ffd166" />
      <rect x="9" y="77" width="42" height="2.4" fill="#ffd166" />
    </g>
  );
}

function BlackGod() {
  return (
    <g>
      <rect x="2" y="2" width="56" height="84" rx="5" fill="#120f1d" />
      <circle cx="30" cy="34" r="26" fill="#2a2440" />
      <Fan cx={30} cy={36} r={17} len={14} colors={['#0b0914', '#2fb5ae', '#0b0914']} spread={[-66, -44, -22, 0, 22, 44, 66]} />
      <path d="M16 30 H44 V50 L38 62 H22 L16 50 Z" fill="#1b1730" stroke="#d9d0bb" strokeWidth="1.4" />
      <circle cx="30" cy="26" r="5.2" fill="#d9d0bb" />
      <circle cx="30" cy="26" r="3.2" fill="#0b0914" />
      <path d="M16 34 H44 V40 H16 Z" fill="#d9d0bb" />
      <path d="M20 37 H27 M33 37 H40" stroke="#0b0914" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M30 40 L27 50 H33 Z" fill="#0b0914" />
      <path d="M22 54 H38 V59 H22 Z" fill="#0b0914" />
      <path d="M24 54 v5 M27 54 v5 M30 54 v5 M33 54 v5 M36 54 v5" stroke="#d9d0bb" strokeWidth="1.3" />
      <circle cx="13.5" cy="46" r="3.4" fill="#2fb5ae" />
      <circle cx="46.5" cy="46" r="3.4" fill="#2fb5ae" />
      <Fret x={9} y={70} w={42} color="#d9d0bb" />
      <rect x="9" y="77" width="42" height="2.4" fill="#d9d0bb" />
    </g>
  );
}

const SUN_RAYS = (() => {
  const rays: string[] = [];
  for (let i = 0; i < 24; i += 1) {
    const a = (Math.PI * 2 * i) / 24;
    const a2 = a + Math.PI / 24;
    rays.push(`M30 32 L${(30 + 40 * Math.cos(a)).toFixed(1)} ${(32 + 40 * Math.sin(a)).toFixed(1)} L${(30 + 40 * Math.cos(a2)).toFixed(1)} ${(32 + 40 * Math.sin(a2)).toFixed(1)}Z`);
  }
  return rays.join(' ');
})();

function TaotlGod() {
  const clip = `taotl-clip-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <g>
      <rect x="2" y="2" width="56" height="84" rx="5" fill="#0d3e45" />
      <clipPath id={clip}>
        <rect x="2" y="2" width="56" height="84" rx="5" />
      </clipPath>
      <g clipPath={`url(#${clip})`}>
        <path d={SUN_RAYS} fill="#e8b73a" opacity="0.35" />
      </g>
      <circle cx="30" cy="32" r="23" fill="#e8b73a" />
      <circle cx="30" cy="32" r="19" fill="#0d3e45" />
      <Fan cx={30} cy={33} r={15} len={14} colors={['#2fc9be', '#ffd166', '#1a8f95', '#ffd166']} spread={[-72, -52, -32, -12, 12, 32, 52, 72]} />
      <path d="M16 28 H44 V50 L38 63 H22 L16 50 Z" fill="#f3c94a" stroke="#7a4f0a" strokeWidth="1.4" />
      <path d="M16 28 H44 V32 H16Z" fill="#2fc9be" />
      <path d="M30 22 L33 26 L30 30 L27 26Z" fill="#c62e2e" stroke="#7a4f0a" strokeWidth="0.8" />
      <path d="M19 38 Q23.5 33 28 38 Q23.5 41 19 38Z M32 38 Q36.5 33 41 38 Q36.5 41 32 38Z" fill="#fff6d8" stroke="#7a4f0a" strokeWidth="0.9" />
      <circle cx="23.5" cy="37.6" r="1.7" fill="#0d3e45" />
      <circle cx="36.5" cy="37.6" r="1.7" fill="#0d3e45" />
      <path d="M30 39 L27.5 49 H32.5 Z" fill="#c99a1d" />
      <path d="M23 54 Q30 59 37 54" fill="none" stroke="#7a4f0a" strokeWidth="2" strokeLinecap="round" />
      <circle cx="13" cy="46" r="3.8" fill="#2fc9be" stroke="#e8b73a" strokeWidth="1.2" />
      <circle cx="47" cy="46" r="3.8" fill="#2fc9be" stroke="#e8b73a" strokeWidth="1.2" />
      <path d="M8 80 V76 H14 V72 H20 V68 H40 V72 H46 V76 H52 V80 Z" fill="#e8b73a" />
      <path d="M22 72 H38" stroke="#0d3e45" strokeWidth="1.2" />
    </g>
  );
}

export function GodFace({ god }: { god: 'rosso' | 'nero' | 'taotl' }) {
  return god === 'rosso' ? <RedGod /> : god === 'nero' ? <BlackGod /> : <TaotlGod />;
}

/** Volto umile e neutro; i punti in basso indicano quale dei 4 Chipetl e'. */
export function ChipetlFace({ n }: { n: 1 | 2 | 3 | 4 }) {
  return (
    <g>
      <rect x="2" y="2" width="56" height="84" rx="5" fill="#d6c9a8" />
      <rect x="8" y="8" width="44" height="64" rx="3" fill="none" stroke="#a89873" strokeWidth="1" strokeDasharray="3 2" />
      <path d="M17 24 H43 V29 H17Z" fill="#8a7a55" />
      <path d="M30 24 Q25 14 30 8 Q35 14 30 24Z" fill="#a89873" />
      <rect x="18" y="29" width="24" height="24" rx="9" fill="#bfae86" stroke="#7a6a45" strokeWidth="1.3" />
      <circle cx="25" cy="38" r="1.8" fill="#4a3f28" />
      <circle cx="35" cy="38" r="1.8" fill="#4a3f28" />
      <path d="M30 40 V45" stroke="#7a6a45" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M26 48.5 H34" stroke="#7a6a45" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M21 56 H39 L36 66 H24 Z" fill="#a89873" />
      {Array.from({ length: n }, (_, i) => (
        <circle key={i} cx={30 + (i - (n - 1) / 2) * 7} cy="79" r="2.4" fill="#6b5c3a" />
      ))}
    </g>
  );
}
