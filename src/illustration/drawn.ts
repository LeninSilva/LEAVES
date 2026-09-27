import type { Mood, Motif, Season, TimeOfDay } from "../../shared/constants";
import { MOTIFS } from "../../shared/constants";
import { pick, range, seeded } from "../lib/rng";
import { MOOD_COLORS } from "../lib/moods";

/**
 * Hand-drawn-style SVG vignettes, composed from simple parts. The motif picks
 * the subject, the mood picks the colors, and the entry id seeds the small
 * variations so no two drawings match. Always drawn in daylight palette
 * values so files look the same outside the app.
 */

export interface DrawOptions {
  seed: string;
  motif?: Motif | null;
  mood?: Mood | null;
  season?: Season | null;
  timeOfDay?: TimeOfDay | null;
}

const S = 400; // viewBox size
const INK = "#4a3b2c"; // bark brown outline
const line = (w = 2.4) => `stroke="${INK}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;
const LINE = line();

interface Palette {
  skyTop: string;
  skyBottom: string;
  far: string;
  mid: string;
  near: string;
  leaf: string;
  accent: string;
  water: string;
  ground: string;
  light: string;
  night: boolean;
}

function seasonLeaf(season: Season | null | undefined, mood: string): string {
  switch (season) {
    case "autumn":
      return "#d9985f";
    case "winter":
      return "#9db9be";
    case "spring":
      return "#9cc97a";
    default:
      return mood;
  }
}

function palette(o: DrawOptions): Palette {
  const accent = MOOD_COLORS[o.mood ?? "none"].day;
  const t = o.timeOfDay ?? "afternoon";
  const night = t === "night";
  const skies: Record<TimeOfDay, [string, string]> = {
    dawn: ["#c5dbdf", "#f3dcc6"],
    morning: ["#c5dbdf", "#e4efe6"],
    afternoon: ["#bcd6dc", "#e7f0e4"],
    evening: ["#d8c4d0", "#f1d3ac"],
    night: ["#2f4148", "#3e545a"],
  };
  const [skyTop, skyBottom] = skies[t];
  const winter = o.season === "winter";
  return {
    skyTop,
    skyBottom,
    far: night ? "#4d6657" : winter ? "#dfe7df" : "#b7cfa4",
    mid: night ? "#3f5a48" : winter ? "#cddbd3" : "#9dbe84",
    near: night ? "#344b3a" : winter ? "#e9efe9" : "#7fa36f",
    leaf: seasonLeaf(o.season, "#7fa36f"),
    accent,
    water: night ? "#3e545a" : "#a9cbd1",
    ground: night ? "#5a4b3a" : "#b99a72",
    light: "#e8b54a",
    night,
  };
}

// ---- small helpers ---------------------------------------------------------

const f = (n: number) => Math.round(n * 10) / 10;

/** A soft rounded blob made of a closed smooth curve around (cx, cy). */
function blob(rand: () => number, cx: number, cy: number, rx: number, ry: number, points = 7): string {
  const pts: [number, number][] = [];
  for (let i = 0; i < points; i++) {
    const a = (i / points) * Math.PI * 2;
    const k = range(rand, 0.86, 1.1);
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  return smoothClosed(pts);
}

function smoothClosed(pts: [number, number][]): string {
  const n = pts.length;
  let d = "";
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    if (i === 0) d += `M${f(p1[0])},${f(p1[1])}`;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${f(c1x)},${f(c1y)} ${f(c2x)},${f(c2y)} ${f(p2[0])},${f(p2[1])}`;
  }
  return d + " Z";
}

/** A rolling hill line across the whole width, closed to the bottom. */
function hill(rand: () => number, baseY: number, amp: number, bumps = 3): string {
  const step = S / bumps;
  let d = `M-10,${f(baseY + range(rand, -amp, amp))}`;
  for (let i = 0; i < bumps; i++) {
    const x1 = i * step + step / 2;
    const y1 = baseY - range(rand, amp * 0.3, amp);
    const x2 = (i + 1) * step;
    const y2 = baseY + range(rand, -amp * 0.3, amp * 0.3);
    d += ` Q${f(x1)},${f(y1)} ${f(x2 + (i === bumps - 1 ? 10 : 0))},${f(y2)}`;
  }
  return d + ` L${S + 10},${S + 10} L-10,${S + 10} Z`;
}

/** Leaf shape pointing up, centered on 0,0. */
function leafPath(len: number, width: number): string {
  return `M0,${f(len / 2)} C${f(width)},${f(len / 4)} ${f(width * 0.8)},${f(-len / 3)} 0,${f(-len / 2)} C${f(-width * 0.8)},${f(-len / 3)} ${f(-width)},${f(len / 4)} 0,${f(len / 2)} Z`;
}

function leaf(x: number, y: number, rot: number, len: number, fill: string): string {
  return `<g transform="translate(${f(x)},${f(y)}) rotate(${f(rot)})"><path d="${leafPath(len, len * 0.42)}" fill="${fill}" ${line(1.8)}/><path d="M0,${f(len / 2)} L0,${f(-len / 2.6)}" ${line(1.2)} fill="none"/></g>`;
}

function grassTufts(rand: () => number, y0: number, y1: number, count: number, color: string): string {
  let out = "";
  for (let i = 0; i < count; i++) {
    const x = range(rand, 8, S - 8);
    const y = range(rand, y0, y1);
    const h = range(rand, 8, 16);
    out += `<path d="M${f(x - 4)},${f(y)} q2,-${f(h * 0.6)} 1,-${f(h)} M${f(x)},${f(y)} q0,-${f(h)} 1,-${f(h * 1.2)} M${f(x + 4)},${f(y)} q-1,-${f(h * 0.6)} 2,-${f(h * 0.9)}" stroke="${color}" stroke-width="2" stroke-linecap="round" fill="none"/>`;
  }
  return out;
}

/** Tiny ditsy flowers, like old cotton print. */
function flowers(rand: () => number, y0: number, y1: number, count: number, colors: string[]): string {
  let out = "";
  for (let i = 0; i < count; i++) {
    const x = range(rand, 12, S - 12);
    const y = range(rand, y0, y1);
    const c = pick(rand, colors);
    const r = range(rand, 1.8, 2.8);
    out += `<g transform="translate(${f(x)},${f(y)})">`;
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      out += `<circle cx="${f(Math.cos(a) * r)}" cy="${f(Math.sin(a) * r)}" r="${f(r * 0.75)}" fill="${c}"/>`;
    }
    out += `<circle r="${f(r * 0.55)}" fill="#f7faf2"/></g>`;
  }
  return out;
}

function sky(p: Palette): string {
  return `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.skyTop}"/><stop offset="1" stop-color="${p.skyBottom}"/></linearGradient></defs><rect width="${S}" height="${S}" fill="url(#sky)"/>`;
}

function celestial(rand: () => number, p: Palette, o: DrawOptions, big = false): string {
  const t = o.timeOfDay ?? "afternoon";
  const x = range(rand, 70, 330);
  const y = big ? range(rand, 90, 120) : range(rand, 55, 95);
  const r = big ? range(rand, 38, 48) : range(rand, 20, 28);
  if (t === "night" || (big && t === "evening")) {
    let stars = "";
    if (p.night) {
      for (let i = 0; i < 14; i++) {
        stars += `<circle cx="${f(range(rand, 10, 390))}" cy="${f(range(rand, 10, 170))}" r="${f(range(rand, 0.8, 1.8))}" fill="#f1e7c9" opacity="${f(range(rand, 0.5, 0.95))}"/>`;
      }
    }
    return `${stars}<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="#f1e7c9" ${LINE}/><circle cx="${f(x - r * 0.3)}" cy="${f(y - r * 0.2)}" r="${f(r * 0.16)}" fill="#e2d6b2"/><circle cx="${f(x + r * 0.28)}" cy="${f(y + r * 0.25)}" r="${f(r * 0.11)}" fill="#e2d6b2"/>`;
  }
  const sunColor = t === "evening" || t === "dawn" ? "#eeb766" : p.light;
  return `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${sunColor}" ${LINE}/>`;
}

function clouds(rand: () => number, p: Palette, count: number): string {
  if (p.night) return "";
  let out = "";
  for (let i = 0; i < count; i++) {
    const cx = range(rand, 40, 360);
    const cy = range(rand, 40, 130);
    const w = range(rand, 34, 60);
    out += `<path d="${blob(rand, cx, cy, w, w * 0.34, 8)}" fill="#f7faf2" ${line(2)}/>`;
  }
  return out;
}

function hills(rand: () => number, p: Palette, top = 230): string {
  return `<path d="${hill(rand, top, 26, 2)}" fill="${p.far}" ${LINE}/><path d="${hill(rand, top + 40, 22, 3)}" fill="${p.mid}" ${LINE}/>`;
}

/** Fractal tree: trunk and branches as tapered strokes, canopy as soft blobs. */
function tree(rand: () => number, x: number, baseY: number, height: number, p: Palette, o: DrawOptions): string {
  const trunk = "#8b6c4f";
  let branches = "";
  const tips: [number, number][] = [];
  const grow = (x0: number, y0: number, len: number, angle: number, width: number, depth: number) => {
    const x1 = x0 + Math.cos(angle) * len;
    const y1 = y0 + Math.sin(angle) * len;
    const bend = range(rand, -0.25, 0.25) * len;
    const mx = (x0 + x1) / 2 + Math.cos(angle + Math.PI / 2) * bend;
    const my = (y0 + y1) / 2 + Math.sin(angle + Math.PI / 2) * bend;
    branches += `<path d="M${f(x0)},${f(y0)} Q${f(mx)},${f(my)} ${f(x1)},${f(y1)}" stroke="${INK}" stroke-width="${f(width + 2.4)}" stroke-linecap="round" fill="none"/><path d="M${f(x0)},${f(y0)} Q${f(mx)},${f(my)} ${f(x1)},${f(y1)}" stroke="${trunk}" stroke-width="${f(width)}" stroke-linecap="round" fill="none"/>`;
    if (depth === 0) {
      tips.push([x1, y1]);
      return;
    }
    const n = depth > 2 ? 2 : pick(rand, [2, 2, 3]);
    for (let i = 0; i < n; i++) {
      const spread = range(rand, 0.35, 0.6);
      const a = angle + (i - (n - 1) / 2) * spread * 1.3 + range(rand, -0.12, 0.12);
      grow(x1, y1, len * range(rand, 0.62, 0.78), a, Math.max(1.4, width * 0.62), depth - 1);
    }
  };
  const bare = o.season === "winter";
  // Leafy trees keep their branches inside the canopy; bare ones show the whole fractal.
  grow(x, baseY, height * (bare ? 0.34 : 0.3), -Math.PI / 2 + range(rand, -0.08, 0.08), height * 0.075, bare ? 4 : 3);
  let canopy = "";
  if (!bare) {
    const leafColor = o.season === "autumn" ? "#d9985f" : p.leaf;
    const cx = x;
    const cy = baseY - height * 0.66;
    const layers = [
      { dx: 0, dy: 0, rx: height * 0.36, ry: height * 0.3, c: leafColor },
      { dx: -height * 0.2, dy: height * 0.06, rx: height * 0.2, ry: height * 0.17, c: p.near },
      { dx: height * 0.2, dy: height * 0.04, rx: height * 0.2, ry: height * 0.16, c: p.mid },
    ];
    for (const l of layers) canopy += `<path d="${blob(rand, cx + l.dx, cy + l.dy, l.rx, l.ry, 9)}" fill="${l.c}" ${LINE}/>`;
    // a few mood-colored leaves and ditsy dots in the canopy
    for (let i = 0; i < 5; i++) {
      canopy += `<circle cx="${f(cx + range(rand, -height * 0.28, height * 0.28))}" cy="${f(cy + range(rand, -height * 0.2, height * 0.16))}" r="${f(range(rand, 2, 3.4))}" fill="${p.accent}"/>`;
    }
  } else {
    for (const [tx, ty] of tips.slice(0, 5)) canopy += `<circle cx="${f(tx)}" cy="${f(ty)}" r="2" fill="#f7faf2"/>`;
  }
  return branches + canopy;
}

function bird(x: number, y: number, flip: boolean, color: string): string {
  const s = flip ? -1 : 1;
  return `<g transform="translate(${f(x)},${f(y)}) scale(${s * 1.7},1.7)"><path d="M-12,2 C-12,-10 6,-12 10,-2 C12,4 6,10 -4,10 C-10,10 -12,6 -12,2 Z" fill="${color}" ${LINE}/><circle cx="4" cy="-3" r="1.6" fill="${INK}"/><path d="M10,-2 L15,-1 L10,1" fill="#e8b54a" ${line(1.5)}/><path d="M-6,0 C-3,4 2,4 3,1" fill="none" ${line(1.6)}/><path d="M-2,10 L-2,14 M2,10 L2,14" ${line(1.5)}/></g>`;
}

function flyingBirds(rand: () => number, count: number): string {
  let out = "";
  for (let i = 0; i < count; i++) {
    const x = range(rand, 60, 340);
    const y = range(rand, 60, 150);
    const w = range(rand, 6, 10);
    out += `<path d="M${f(x - w)},${f(y)} q${f(w / 2)},-${f(w / 2)} ${f(w)},0 q${f(w / 2)},-${f(w / 2)} ${f(w)},0" fill="none" ${line(1.8)}/>`;
  }
  return out;
}

function rain(rand: () => number, count: number, y1 = 300): string {
  let out = "";
  for (let i = 0; i < count; i++) {
    const x = range(rand, 0, S);
    const y = range(rand, 0, y1);
    out += `<path d="M${f(x)},${f(y)} l-3,10" stroke="#6e8f98" stroke-width="1.6" stroke-linecap="round" opacity="0.8"/>`;
  }
  return out;
}

function fallingLeaves(rand: () => number, count: number, colors: string[], y0 = 60, y1 = 320): string {
  let out = "";
  for (let i = 0; i < count; i++) {
    out += leaf(range(rand, 30, 370), range(rand, y0, y1), range(rand, -70, 70), range(rand, 16, 26), pick(rand, colors));
  }
  return out;
}

function ripples(rand: () => number, cx: number, cy: number, rx: number, ry: number, count: number): string {
  let out = "";
  for (let i = 0; i < count; i++) {
    const x = cx + range(rand, -rx * 0.7, rx * 0.7);
    const y = cy + range(rand, -ry * 0.5, ry * 0.5);
    const r = range(rand, 6, 14);
    out += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(r)}" ry="${f(r * 0.35)}" fill="none" stroke="#f7faf2" stroke-width="1.6" opacity="0.9"/><ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(r * 0.5)}" ry="${f(r * 0.18)}" fill="none" stroke="#f7faf2" stroke-width="1.2"/>`;
  }
  return out;
}

// ---- motifs ----------------------------------------------------------------

type Composer = (rand: () => number, p: Palette, o: DrawOptions) => string;

const compose: Record<Motif, Composer> = {
  "a single tree": (r, p, o) =>
    sky(p) + celestial(r, p, o) + clouds(r, p, 2) + hills(r, p, 250) +
    `<path d="${hill(r, 318, 12, 2)}" fill="${p.near}" ${LINE}/>` +
    tree(r, range(r, 170, 230), 322, range(r, 190, 220), p, o) +
    grassTufts(r, 330, 390, 14, "#4f7348") + flowers(r, 330, 392, 10, [p.accent, "#f7faf2", p.light]),

  "falling leaves": (r, p, o) =>
    sky(p) + celestial(r, p, o) + hills(r, p, 250) +
    `<path d="${hill(r, 320, 10, 2)}" fill="${p.near}" ${LINE}/>` +
    fallingLeaves(r, 11, [p.accent, "#d9985f", "#e8b54a", p.leaf]) +
    Array.from({ length: 6 }, () => leaf(range(r, 30, 370), range(r, 340, 385), range(r, 60, 120), range(r, 16, 22), pick(r, [p.accent, "#d9985f", "#c2a24c"]))).join(""),

  "a path through tall grass": (r, p, o) => {
    const sway = range(r, -30, 30);
    const path = `M${f(170 + sway)},255 C${f(150 + sway)},300 ${f(120)},340 ${f(90)},${S + 5} L${f(310)},${S + 5} C${f(260)},340 ${f(215 + sway)},300 ${f(195 + sway)},255 Z`;
    let blades = "";
    for (let i = 0; i < 46; i++) {
      const left = i % 2 === 0;
      const x = left ? range(r, -5, 120) : range(r, 280, 405);
      const base = range(r, 300, 405);
      const h = range(r, 60, 140);
      const lean = range(r, -18, 18);
      blades += `<path d="M${f(x)},${f(base)} Q${f(x + lean / 2)},${f(base - h / 2)} ${f(x + lean)},${f(base - h)}" stroke="${pick(r, ["#5f8a5a", "#7fa36f", "#4f7348", "#9dbe84"])}" stroke-width="${f(range(r, 2.4, 4))}" stroke-linecap="round" fill="none"/>`;
    }
    return sky(p) + celestial(r, p, o) + clouds(r, p, 2) + hills(r, p, 230) +
      `<path d="${hill(r, 270, 10, 2)}" fill="${p.near}" ${LINE}/>` +
      `<path d="${path}" fill="#e6d7b8" ${LINE}/>` + blades + flowers(r, 300, 395, 8, [p.accent, "#f7faf2"]);
  },

  "a small boat on still water": (r, p, o) => {
    const x = range(r, 150, 250);
    const y = range(r, 285, 305);
    const boat = `<path d="M${f(x - 42)},${f(y)} L${f(x + 42)},${f(y)} Q${f(x + 34)},${f(y + 20)} ${f(x)},${f(y + 20)} Q${f(x - 34)},${f(y + 20)} ${f(x - 42)},${f(y)} Z" fill="#b5835a" ${LINE}/>` +
      `<path d="M${f(x)},${f(y)} L${f(x)},${f(y - 70)}" ${LINE} fill="none"/>` +
      `<path d="M${f(x + 3)},${f(y - 66)} Q${f(x + 38)},${f(y - 32)} ${f(x + 3)},${f(y - 8)} Z" fill="#f7faf2" ${LINE}/>` +
      `<path d="M${f(x - 3)},${f(y - 50)} L${f(x - 26)},${f(y - 10)} L${f(x - 3)},${f(y - 10)} Z" fill="${p.accent}" ${LINE}/>`;
    return sky(p) + celestial(r, p, o) + clouds(r, p, 2) +
      `<path d="${hill(r, 240, 18, 3)}" fill="${p.far}" ${LINE}/>` +
      `<rect x="-5" y="258" width="${S + 10}" height="${S}" fill="${p.water}" ${LINE}/>` +
      `<path d="M${f(x - 60)},${f(y + 28)} q20,5 40,0 M${f(x + 10)},${f(y + 34)} q20,5 40,0 M60,340 q20,4 36,0 M290,360 q20,4 36,0" stroke="#f7faf2" stroke-width="2" stroke-linecap="round" fill="none"/>` +
      boat;
  },

  "a lit window at dusk": (r, _p, o) => {
    const dusk: DrawOptions = { ...o, timeOfDay: o.timeOfDay === "night" ? "night" : "evening" };
    const pp = palette(dusk);
    const hx = range(r, 150, 230);
    const hy = 270;
    const house =
      `<path d="M${f(hx - 50)},${f(hy)} L${f(hx - 50)},${f(hy - 60)} L${f(hx)},${f(hy - 100)} L${f(hx + 50)},${f(hy - 60)} L${f(hx + 50)},${f(hy)} Z" fill="#c9b08a" ${LINE}/>` +
      `<path d="M${f(hx - 60)},${f(hy - 56)} L${f(hx)},${f(hy - 106)} L${f(hx + 60)},${f(hy - 56)}" fill="none" ${line(3)}/>` +
      `<rect x="${f(hx - 18)}" y="${f(hy - 58)}" width="36" height="32" rx="6" fill="${pp.light}" ${LINE}/>` +
      `<path d="M${f(hx)},${f(hy - 58)} L${f(hx)},${f(hy - 26)} M${f(hx - 18)},${f(hy - 42)} L${f(hx + 18)},${f(hy - 42)}" ${LINE}/>` +
      `<rect x="${f(hx + 22)}" y="${f(hy - 90)}" width="12" height="22" fill="#b5835a" ${LINE}/>` +
      `<ellipse cx="${f(hx)}" cy="${f(hy + 14)}" rx="70" ry="10" fill="${pp.light}" opacity="0.35"/>`;
    return sky(pp) + celestial(r, pp, dusk) + hills(r, pp, 250) + house +
      `<path d="${hill(r, 300, 10, 2)}" fill="${pp.near}" ${LINE}/>` +
      tree(r, hx + range(r, 90, 130), 310, 120, pp, dusk) + grassTufts(r, 320, 390, 10, "#3f5a45");
  },

  "a seedling": (r, p, o) => {
    const x = range(r, 180, 220);
    const soil = `<path d="${blob(r, x, 330, 120, 40, 9)}" fill="${p.ground}" ${LINE}/>`;
    const stem = `<path d="M${f(x)},${f(318)} C${f(x - 4)},290 ${f(x + 6)},260 ${f(x)},236" stroke="#5f8a5a" stroke-width="5" stroke-linecap="round" fill="none"/>`;
    return sky(p) + celestial(r, p, o) + clouds(r, p, 2) + hills(r, p, 240) + soil + stem +
      leaf(x - 24, 238, -58, 50, p.leaf) + leaf(x + 22, 232, 60, 46, p.leaf) +
      `<circle cx="${f(x - 60)}" cy="330" r="4" fill="#8b6c4f"/><circle cx="${f(x + 70)}" cy="338" r="3" fill="#8b6c4f"/>` +
      flowers(r, 360, 395, 6, [p.accent, "#f7faf2"]);
  },

  "a moon over a field": (r, _p, o) => {
    const night: DrawOptions = { ...o, timeOfDay: o.timeOfDay === "dawn" || o.timeOfDay === "morning" ? "dawn" : "night" };
    const pp = palette(night);
    let rows = "";
    for (let i = 0; i < 6; i++) {
      const y = 290 + i * 20;
      rows += `<path d="M-10,${y} Q200,${y - 14 + i * 2} 410,${y}" stroke="${pp.mid}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    }
    return sky(pp) + celestial(r, pp, night, true) +
      `<path d="${hill(r, 260, 18, 3)}" fill="${pp.far}" ${LINE}/>` +
      `<path d="${hill(r, 280, 6, 2)}" fill="${pp.near}" ${LINE}/>` + rows +
      grassTufts(r, 300, 395, 12, pp.mid);
  },

  "rain on a pond": (r, p) => {
    const grey: Palette = { ...p, skyTop: p.night ? p.skyTop : "#b9c9cc", skyBottom: p.night ? p.skyBottom : "#dde6e1" };
    return sky(grey) + clouds(r, grey, 3) + hills(r, grey, 220) +
      `<path d="${blob(r, 200, 320, 170, 58, 10)}" fill="${p.water}" ${LINE}/>` +
      ripples(r, 200, 320, 170, 58, 7) +
      `<path d="${blob(r, 120, 332, 22, 8, 7)}" fill="#7fa36f" ${LINE}/><path d="${blob(r, 280, 305, 18, 6, 7)}" fill="#7fa36f" ${LINE}/>` +
      `<circle cx="${f(range(r, 260, 300))}" cy="304" r="4" fill="${p.accent}"/>` +
      rain(r, 40, 360) + grassTufts(r, 370, 398, 10, "#4f7348");
  },

  "two birds on a branch": (r, p, o) => {
    const y = range(r, 210, 240);
    const branch = `<path d="M-10,${f(y + 20)} C100,${f(y + 4)} 240,${f(y - 2)} 410,${f(y + 12)}" stroke="${INK}" stroke-width="12" stroke-linecap="round" fill="none"/><path d="M-10,${f(y + 20)} C100,${f(y + 4)} 240,${f(y - 2)} 410,${f(y + 12)}" stroke="#8b6c4f" stroke-width="8" stroke-linecap="round" fill="none"/><path d="M300,${f(y + 4)} q20,-30 50,-40" stroke="${INK}" stroke-width="7" stroke-linecap="round" fill="none"/><path d="M300,${f(y + 4)} q20,-30 50,-40" stroke="#8b6c4f" stroke-width="4" stroke-linecap="round" fill="none"/>`;
    const bx = range(r, 150, 190);
    return sky(p) + celestial(r, p, o) + clouds(r, p, 2) +
      `<path d="${hill(r, 320, 16, 3)}" fill="${p.mid}" ${LINE}/>` + branch +
      leaf(340, y - 44, 30, 26, p.leaf) + leaf(360, y - 30, 80, 24, p.leaf) + leaf(90, y + 2, -120, 24, p.leaf) +
      bird(bx, y - 14, false, p.accent) + bird(bx + 62, y - 16, true, pick(r, ["#c5dbdf", "#e8b54a", "#d98e8a"]));
  },

  "a bench under a tree": (r, p, o) => {
    const bx = range(r, 210, 250);
    const bench =
      `<rect x="${f(bx - 40)}" y="300" width="80" height="8" rx="3" fill="#b5835a" ${LINE}/>` +
      `<rect x="${f(bx - 40)}" y="282" width="80" height="7" rx="3" fill="#b5835a" ${LINE}/>` +
      `<path d="M${f(bx - 34)},308 L${f(bx - 36)},326 M${f(bx + 34)},308 L${f(bx + 36)},326 M${f(bx - 32)},289 L${f(bx - 32)},300 M${f(bx + 32)},289 L${f(bx + 32)},300" ${line(3)}/>`;
    return sky(p) + celestial(r, p, o) + clouds(r, p, 1) + hills(r, p, 240) +
      `<path d="${hill(r, 318, 8, 2)}" fill="${p.near}" ${LINE}/>` +
      tree(r, bx - 90, 326, 210, p, o) + bench +
      grassTufts(r, 330, 392, 12, "#4f7348") + flowers(r, 334, 394, 9, [p.accent, "#f7faf2", p.light]);
  },

  "a teacup by a window": (r, p, o) => {
    const outside = sky(p) + celestial(r, p, o) + clouds(r, p, 1) + hills(r, p, 200);
    const wall = p.night ? "#5a4f45" : "#efe6d2";
    const frame =
      `<path d="M0,0 H400 V400 H0 Z M60,40 V250 H340 V40 Z" fill="${wall}" fill-rule="evenodd"/>` +
      `<rect x="60" y="40" width="280" height="210" rx="10" fill="none" ${line(3)}/>` +
      `<path d="M200,40 V250 M60,145 H340" ${line(3)}/>` +
      `<rect x="30" y="250" width="340" height="18" rx="6" fill="#c9b08a" ${LINE}/>`;
    const cx = range(r, 150, 250);
    const cup =
      `<path d="M${f(cx - 30)},226 H${f(cx + 30)} Q${f(cx + 28)},252 ${f(cx)},252 Q${f(cx - 28)},252 ${f(cx - 30)},226 Z" fill="#f7faf2" ${LINE}/>` +
      `<path d="M${f(cx + 28)},232 q14,0 12,9 q-2,8 -16,6" fill="none" ${LINE}/>` +
      `<ellipse cx="${f(cx)}" cy="254" rx="42" ry="6" fill="#f7faf2" ${LINE}/>` +
      `<circle cx="${f(cx - 12)}" cy="238" r="2.6" fill="${p.accent}"/><circle cx="${f(cx + 2)}" cy="242" r="2.6" fill="${p.accent}"/><circle cx="${f(cx + 14)}" cy="236" r="2.6" fill="${p.accent}"/>` +
      `<path d="M${f(cx - 8)},218 q-8,-12 0,-22 q8,-10 0,-22 M${f(cx + 8)},216 q-8,-10 0,-18" fill="none" stroke="#f7faf2" stroke-width="2.4" stroke-linecap="round" opacity="0.9"/>`;
    const below = `<rect x="0" y="268" width="400" height="132" fill="${p.night ? "#4a4038" : "#e2d4b8"}"/>` +
      `<path d="M0,268 H400" ${LINE}/>` + flowers(r, 290, 390, 14, [p.accent, "#c5dbdf", "#f7faf2"]);
    const plant = leaf(84, 222, -30, 30, p.leaf) + leaf(100, 218, 20, 30, p.leaf) +
      `<path d="M78,232 H108 L104,250 H82 Z" fill="#d98e8a" ${LINE}/>`;
    return outside + frame + below + plant + cup;
  },

  "a bridge over a stream": (r, p, o) => {
    const stream = `<path d="M186,256 C150,290 260,300 200,340 C160,370 150,390 140,410 L300,410 C300,380 320,350 300,320 C280,290 222,276 206,256 Z" fill="${p.water}" ${LINE}/>`;
    const by = 300;
    const bridge =
      `<path d="M90,${by + 10} Q210,${by - 60} 330,${by + 10} L330,${by + 24} Q210,${by - 40} 90,${by + 24} Z" fill="#b5835a" ${LINE}/>` +
      `<path d="M100,${by + 2} Q210,${by - 74} 320,${by + 2}" fill="none" ${line(3)}/>` +
      [130, 170, 210, 250, 290].map((x) => {
        const t = (x - 90) / 240;
        const top = by + 2 - Math.sin(t * Math.PI) * 38;
        const deck = by + 10 - Math.sin(t * Math.PI) * 35;
        return `<path d="M${x},${f(top)} L${x},${f(deck)}" ${line(2.4)}/>`;
      }).join("");
    return sky(p) + celestial(r, p, o) + clouds(r, p, 2) + hills(r, p, 215) +
      `<path d="${hill(r, 250, 8, 2)}" fill="${p.near}" ${LINE}/>` + stream +
      ripples(r, 230, 350, 50, 20, 3) + bridge +
      tree(r, 60, 280, 110, p, o) + grassTufts(r, 340, 395, 10, "#4f7348") + flowers(r, 350, 396, 6, [p.accent, "#f7faf2"]);
  },
};

const FILTERS = (seed: number) => `
<filter id="wobble" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="${seed}"/><feDisplacementMap in="SourceGraphic" scale="2.6"/></filter>
<filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="${seed + 3}" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0.29  0 0 0 0 0.23  0 0 0 0 0.17  0 0 0 0.55 0"/></filter>`;

/** Returns a complete SVG document. */
export function drawIllustration(o: DrawOptions): string {
  const rand = seeded(o.seed);
  const motif = o.motif ?? pick(rand, MOTIFS);
  const p = palette(o);
  const body = compose[motif](rand, p, o);
  const seed = Math.floor(rand() * 1000);
  // Occasional small woodland creature: a bird in flight on open skies.
  const extra = motif !== "a teacup by a window" && motif !== "rain on a pond" && !p.night && rand() < 0.45 ? flyingBirds(rand, 2) : "";
  const title = motif.charAt(0).toUpperCase() + motif.slice(1);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="1024" height="1024" role="img"><title>${escapeXml(title)}</title><defs>${FILTERS(seed)}</defs><g filter="url(#wobble)">${body}${extra}</g><rect width="${S}" height="${S}" filter="url(#grain)" opacity="0.22"/></svg>`;
}

export function drawnAlt(motif: Motif | null | undefined): string {
  const m = motif ?? "a single tree";
  return `A hand-drawn picture of ${m}.`;
}

function escapeXml(s: string): string {
  return s.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]!);
}

/** Picks a motif for entries without one, seeded by the entry id. */
export function motifFor(seed: string): Motif {
  return pick(seeded(seed + ":motif"), MOTIFS);
}

/**
 * For entries kept from AI: a subject found on the device from a few plain
 * words, so a rainy day gets rain. Nothing leaves the phone.
 */
const MOTIF_WORDS: [RegExp, Motif][] = [
  [/\b(rain|rained|raining|rainy|drizzle|storm|puddle)/i, "rain on a pond"],
  [/\b(tea|coffee|cup|mug|kitchen)\b/i, "a teacup by a window"],
  [/\b(moon|stars?|midnight|night)\b/i, "a moon over a field"],
  [/\b(boat|lake|sea|ocean|sail|beach|harbou?r)\b/i, "a small boat on still water"],
  [/\b(bridge|stream|creek|brook|river)\b/i, "a bridge over a stream"],
  [/\b(birds?|sparrow|robin|crow)\b/i, "two birds on a branch"],
  [/\b(walk|walked|hike|hiked|path|trail|run|ran)\b/i, "a path through tall grass"],
  [/\b(seeds?|garden|plant|planted|begin|began|new start|first day)\b/i, "a seedling"],
  [/\b(home|house|window|evening|dusk)\b/i, "a lit window at dusk"],
  [/\b(park|bench|rest|rested|sat)\b/i, "a bench under a tree"],
  [/\b(autumn|fall|leaves|wind)\b/i, "falling leaves"],
  [/\b(tree|forest|woods)\b/i, "a single tree"],
];

export function motifFromText(text: string): Motif | null {
  for (const [re, motif] of MOTIF_WORDS) if (re.test(text)) return motif;
  return null;
}
