/** Punto in percentuale del riquadro dell'ovale (0-100 su entrambi gli assi). */
export interface Point {
  x: number;
  y: number;
}

/** Raggio (in % del riquadro) della linea su cui siedono i giocatori: il bordo del tavolo. */
const RAIL = 48.5;
/** Spazio minimo tra me e ciascun vicino, in frazione del perimetro: i posti non coprono la mia mano. */
const MIN_GAP = 0.15;
const SAMPLES = 720;

/**
 * Angolo parametrico di ogni posto, misurato da "in basso" in senso orario visto dall'alto
 * (quindi verso sinistra sullo schermo). Io sono a 0°, gli altri seguono l'ordine dei posti,
 * a distanza costante lungo il bordo di un ovale largo `aspect` volte la sua altezza.
 */
export function seatAngles(n: number, aspect = 2.5): number[] {
  if (n <= 1) return [0];
  const fractions =
    n === 2
      ? [0.5]
      : (() => {
          const gap = Math.max(1 / n, MIN_GAP);
          const step = (1 - 2 * gap) / (n - 2);
          return Array.from({ length: n - 1 }, (_, k) => gap + k * step);
        })();
  // lunghezza d'arco cumulata dell'ellisse (x = aspect·sinθ, y = cosθ)
  const cum = [0];
  for (let i = 1; i <= SAMPLES; i += 1) {
    const a0 = (2 * Math.PI * (i - 1)) / SAMPLES;
    const a1 = (2 * Math.PI * i) / SAMPLES;
    cum.push(cum[i - 1]! + Math.hypot(aspect * (Math.sin(a1) - Math.sin(a0)), Math.cos(a1) - Math.cos(a0)));
  }
  const total = cum[SAMPLES]!;
  const toAngle = (f: number) => {
    const target = f * total;
    let i = 1;
    while (i < SAMPLES && cum[i]! < target) i += 1;
    const t = (target - cum[i - 1]!) / (cum[i]! - cum[i - 1]! || 1);
    return ((i - 1 + t) * 360) / SAMPLES;
  };
  return [0, ...fractions.map(toAngle)];
}

const onEllipse = (deg: number, r: number): Point => {
  const a = (deg * Math.PI) / 180;
  return { x: 50 - r * Math.sin(a), y: 50 + r * Math.cos(a) };
};

export interface RingBox {
  /** misure del riquadro dell'ovale in px */
  w: number;
  h: number;
  /** misure di una carta della presa e di una targhetta, in px */
  cardW: number;
  cardH: number;
  plaqueH: number;
}

/**
 * Allontana le carte della presa che si sovrappongono (in px), tenendole vicine al loro posto
 * e lontane dalle targhette in alto e in basso. Serve con tanti giocatori su schermi bassi.
 */
export function separateSpots(points: Point[], box: RingBox): Point[] {
  const { w, h, cardW, cardH } = box;
  if (w <= 0 || h <= 0) return points;
  const target = points.map((p) => ({ x: (p.x / 100) * w, y: (p.y / 100) * h }));
  const pos = target.map((p) => ({ ...p }));
  const gx = cardW + 4;
  const gy = cardH + 4;
  // le targhette crescono un po' oltre la loro altezza minima: margine abbondante
  const minY = box.plaqueH * 0.68 + cardH * 0.5 + 0.015 * h;
  const maxY = h - minY;
  for (let it = 0; it < 80; it += 1) {
    for (let i = 0; i < pos.length; i += 1)
      for (let j = i + 1; j < pos.length; j += 1) {
        const a = pos[i]!;
        const b = pos[j]!;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const ox = gx - Math.abs(dx);
        const oy = gy - Math.abs(dy);
        if (ox <= 0 || oy <= 0) continue;
        // spinta lungo l'asse dove la sovrapposizione è minore
        if (ox / gx < oy / gy) {
          const m = (ox / 2) * (dx >= 0 ? 1 : -1);
          a.x -= m;
          b.x += m;
        } else {
          const m = (oy / 2) * (dy >= 0 ? 1 : -1);
          a.y -= m;
          b.y += m;
        }
      }
    pos.forEach((p, i) => {
      p.x += (target[i]!.x - p.x) * 0.04;
      p.y += (target[i]!.y - p.y) * 0.04;
      p.x = Math.min(w - cardW / 2, Math.max(cardW / 2, p.x));
      p.y = Math.min(maxY, Math.max(minY, p.y));
    });
  }
  return pos.map((p) => ({ x: (p.x / w) * 100, y: (p.y / h) * 100 }));
}

/**
 * Posizioni dei posti nell'ordine di `seatIds`, ruotate in modo che `meId` sia in basso al centro.
 * `seat`: punto sul bordo del tavolo; `spot`: punto della sua carta sul panno, davanti a lui.
 */
export function tableLayout(seatIds: string[], meId: string, aspect = 2.5, box?: RingBox): { seat: Map<string, Point>; spot: Map<string, Point> } {
  const n = seatIds.length;
  const me = Math.max(0, seatIds.indexOf(meId));
  const angles = seatAngles(n, aspect);
  // carta giocata: tra il centro e il posto; con tanti giocatori più verso il bordo, per non sovrapporle
  const f = n <= 4 ? 0.44 : n <= 8 ? 0.52 : 0.6;
  const seat = new Map<string, Point>();
  const spot = new Map<string, Point>();
  const spots = seatIds.map((_, i) => onEllipse(angles[(i - me + n) % n]!, RAIL * f));
  const placed = box ? separateSpots(spots, box) : spots;
  seatIds.forEach((id, i) => {
    seat.set(id, onEllipse(angles[(i - me + n) % n]!, RAIL));
    spot.set(id, placed[i]!);
  });
  return { seat, spot };
}
