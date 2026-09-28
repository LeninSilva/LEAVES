import type { Accent, ArtSpec, Mood, Season, Subject, TimeOfDay } from "../../shared/constants";
import { MOOD_COLORS } from "../lib/moods";
import { pick, range, seeded } from "../lib/rng";

/**
 * The house style: soft storybook vector drawings with a bark-brown ink line,
 * flat color, a little shading, and paper grain. One clear subject at the
 * center, lots of breathing room. The spec says what the entry is about; the
 * seed makes each drawing its own. Colors are literal so files look the same
 * outside the app.
 */

export interface ArtOptions {
  seed: string;
  art: ArtSpec;
  mood?: Mood | null;
  season?: Season | null;
  timeOfDay?: TimeOfDay | null;
}

const S = 400;
const INK = "#4a3b2c";
const PAPER = "#f7faf2";
const WARM = "#f3c46b";
const TRUNK = "#8b6c4f";
const WOOD = "#b5835a";

const f = (n: number) => Math.round(n * 10) / 10;
const ink = (w = 2.4) => `stroke="${INK}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;
const INK_LINE = ink();

// ---- color ---------------------------------------------------------------------

function hex(c: string): [number, number, number] {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hex(a);
  const [r2, g2, b2] = hex(b);
  const m = (x: number, y: number) => Math.round(x + (y - x) * t);
  return `#${((1 << 24) | (m(r1, r2) << 16) | (m(g1, g2) << 8) | m(b1, b2)).toString(16).slice(1)}`;
}

interface Palette {
  sky: [string, string, string];
  far: string;
  mid: string;
  near: string;
  grass: string;
  leaf: string;
  accent: string;
  accent2: string;
  water: string;
  waterDeep: string;
  ground: string;
  wall: string;
  night: boolean;
  dusk: boolean;
  snow: boolean;
}

const SKIES: Record<TimeOfDay, [string, string, string]> = {
  dawn: ["#b9cfd6", "#e6d6d0", "#f6dcc0"],
  morning: ["#b8d4dc", "#d6e6e4", "#eef3e2"],
  afternoon: ["#a9cdd7", "#cde2e1", "#e9f0df"],
  evening: ["#aeaac6", "#d9b7b6", "#f1cd9c"],
  night: ["#1d2c35", "#2a3e47", "#3a5157"],
};

function palette(o: ArtOptions): Palette {
  const t = o.timeOfDay ?? "afternoon";
  const night = t === "night";
  const dusk = t === "evening" || t === "dawn";
  const mood = o.mood ?? "none";
  const w = o.art.weather;
  const snow = w === "snow" || o.season === "winter";
  let sky = [...SKIES[t]] as [string, string, string];
  const grey = night ? "#27343a" : "#c7d0cf";
  if (w === "rain" || w === "clouds" || w === "mist") sky = sky.map((c) => mix(c, grey, w === "clouds" ? 0.3 : 0.5)) as typeof sky;
  if (w === "snow") sky = sky.map((c) => mix(c, night ? "#34454c" : "#e3e9ea", 0.4)) as typeof sky;
  if (mood === "heavy" || mood === "tired") sky = sky.map((c) => mix(c, grey, 0.22)) as typeof sky;
  if (!night && (mood === "joyful" || mood === "grateful" || mood === "hopeful")) sky[2] = mix(sky[2], "#f6dcae", 0.28);

  const season = o.season ?? "summer";
  const greens: Record<Season, [string, string, string, string]> = {
    spring: ["#c1d8a8", "#a4c886", "#86b06c", "#9cc97a"],
    summer: ["#b7cfa4", "#9dbe84", "#7fa36f", "#7fa36f"],
    autumn: ["#cbc79a", "#b3b17c", "#98965f", "#d9985f"],
    winter: ["#dfe7df", "#cddbd3", "#e9efe9", "#9db9be"],
  };
  let [far, mid, near, leaf] = greens[snow ? "winter" : season];
  if (night) {
    far = "#40584b";
    mid = "#35503f";
    near = "#2c4435";
    leaf = mix(leaf, "#2c4435", 0.45);
  } else if (dusk) {
    far = mix(far, sky[1], 0.25);
    mid = mix(mid, "#b49a7a", 0.12);
  }
  // Distance: the far hills take on the color of the air.
  far = mix(far, sky[2], night ? 0.15 : 0.35);
  const accent = night ? MOOD_COLORS[mood].night : MOOD_COLORS[mood].day;
  return {
    sky,
    far,
    mid,
    near,
    grass: night ? "#233a2c" : snow ? "#b9c9c3" : "#4f7348",
    leaf,
    accent,
    accent2: mood === "tender" || mood === "joyful" ? "#e8b54a" : "#d98e8a",
    water: night ? "#34505a" : w === "rain" || w === "mist" ? "#a3bcc0" : "#a4c9d0",
    waterDeep: night ? "#2a424b" : "#86b3bc",
    ground: night ? "#5a4b3a" : "#c2a47c",
    wall: night ? "#51463d" : "#efe5d0",
    night,
    dusk,
    snow,
  };
}

// ---- shapes -------------------------------------------------------------------

function smoothClosed(pts: [number, number][]): string {
  const n = pts.length;
  let d = "";
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    if (i === 0) d += `M${f(p1[0])},${f(p1[1])}`;
    d += ` C${f(p1[0] + (p2[0] - p0[0]) / 6)},${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)},${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])},${f(p2[1])}`;
  }
  return d + " Z";
}

/** A soft rounded blob around (cx, cy). */
function blob(r: () => number, cx: number, cy: number, rx: number, ry: number, points = 8, wobble = 0.12): string {
  const pts: [number, number][] = [];
  const turn = r() * Math.PI;
  for (let i = 0; i < points; i++) {
    const a = turn + (i / points) * Math.PI * 2;
    const k = range(r, 1 - wobble, 1 + wobble * 0.8);
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  return smoothClosed(pts);
}

/** A rolling line across the width, closed to the bottom. */
function ridge(r: () => number, baseY: number, amp: number, bumps = 3, bottom = S + 10): string {
  const step = (S + 40) / bumps;
  let d = `M-20,${f(baseY + range(r, -amp * 0.4, amp * 0.4))}`;
  for (let i = 0; i < bumps; i++) {
    const x1 = -20 + i * step + step / 2;
    const y1 = baseY - range(r, amp * 0.35, amp);
    const x2 = -20 + (i + 1) * step;
    const y2 = baseY + range(r, -amp * 0.3, amp * 0.3);
    d += ` Q${f(x1)},${f(y1)} ${f(x2)},${f(y2)}`;
  }
  return d + ` L${S + 20},${bottom} L-20,${bottom} Z`;
}

function leafPath(len: number, width: number): string {
  return `M0,${f(len / 2)} C${f(width)},${f(len / 4)} ${f(width * 0.8)},${f(-len / 3)} 0,${f(-len / 2)} C${f(-width * 0.8)},${f(-len / 3)} ${f(-width)},${f(len / 4)} 0,${f(len / 2)} Z`;
}

function leaf(x: number, y: number, rot: number, len: number, fill: string, w = 1.8): string {
  return `<g transform="translate(${f(x)},${f(y)}) rotate(${f(rot)})"><path d="${leafPath(len, len * 0.42)}" fill="${fill}" ${ink(w)}/><path d="M0,${f(len / 2)} L0,${f(-len / 2.6)}" ${ink(w * 0.65)} fill="none"/></g>`;
}

/** A stroke with an ink outline around it, for branches, stems and strings. */
function limb(d: string, width: number, color: string): string {
  return `<path d="${d}" stroke="${INK}" stroke-width="${f(width + 2.4)}" stroke-linecap="round" fill="none"/><path d="${d}" stroke="${color}" stroke-width="${f(width)}" stroke-linecap="round" fill="none"/>`;
}

/** A soft pool of light. */
function glow(id: string, cx: number, cy: number, radius: number, color = WARM, strength = 0.55): string {
  return `<defs><radialGradient id="${id}"><stop offset="0" stop-color="${color}" stop-opacity="${strength}"/><stop offset="0.55" stop-color="${color}" stop-opacity="${f(strength * 0.35)}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient></defs><circle cx="${f(cx)}" cy="${f(cy)}" r="${f(radius)}" fill="url(#${id})"/>`;
}

/** The lower half of a shape, a shade darker, for a little roundness. */
function shade(d: string, id: string, color = INK, opacity = 0.12): string {
  return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0.45" stop-color="${color}" stop-opacity="0"/><stop offset="1" stop-color="${color}" stop-opacity="${opacity}"/></linearGradient></defs><path d="${d}" fill="url(#${id})"/>`;
}

// ---- the world around the subject -----------------------------------------------

interface Ctx {
  r: () => number;
  p: Palette;
  o: ArtOptions;
  spec: ArtSpec;
  uid: string;
  /** Where subjects stand. */
  baseY: number;
  horizon: number;
  /** Where the sun or moon sits, so nothing is drawn on top of it. */
  sky: { x: number; y: number; r: number } | null;
  n: number;
}

let idCount = 0;
const nextId = (c: Ctx, name: string) => `${name}-${c.uid}-${idCount++}`;

function skyLayer(c: Ctx): string {
  const [a, b, d] = c.p.sky;
  const id = nextId(c, "sky");
  return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="0.55" stop-color="${b}"/><stop offset="1" stop-color="${d}"/></linearGradient></defs><rect width="${S}" height="${S}" fill="url(#${id})"/>`;
}

function stars(c: Ctx, count: number, maxY = 190): string {
  let out = "";
  for (let i = 0; i < count; i++) {
    const x = range(c.r, 10, S - 10);
    const y = range(c.r, 10, maxY);
    const big = c.r() < 0.18;
    out += big
      ? `<path d="M${f(x)},${f(y - 4)} L${f(x + 1)},${f(y - 1)} L${f(x + 4)},${f(y)} L${f(x + 1)},${f(y + 1)} L${f(x)},${f(y + 4)} L${f(x - 1)},${f(y + 1)} L${f(x - 4)},${f(y)} L${f(x - 1)},${f(y - 1)} Z" fill="#f4ead0" opacity="0.9"/>`
      : `<circle cx="${f(x)}" cy="${f(y)}" r="${f(range(c.r, 0.7, 1.6))}" fill="#f1e7c9" opacity="${f(range(c.r, 0.45, 0.95))}"/>`;
  }
  return out;
}

function sunOrMoon(c: Ctx, focusX: number): string {
  const w = c.spec.weather;
  if (c.spec.subject === "moon") return "";
  if (w === "rain" || w === "mist" || w === "snow") {
    c.sky = null;
    return "";
  }
  // Opposite the subject, so the eye moves between them.
  const x = focusX < 200 ? range(c.r, 270, 335) : focusX > 200 ? range(c.r, 65, 130) : pick(c.r, [range(c.r, 70, 115), range(c.r, 285, 330)]);
  const t = c.o.timeOfDay ?? "afternoon";
  const y = t === "evening" || t === "dawn" ? range(c.r, c.horizon - 70, c.horizon - 40) : range(c.r, 58, 92);
  if (c.p.night || c.spec.weather === "stars") {
    const rad = range(c.r, 18, 24);
    c.sky = { x, y, r: rad };
    return glow(nextId(c, "moonglow"), x, y, rad * 3.2, "#f1e7c9", 0.3) + moonShape(c, x, y, rad);
  }
  const rad = range(c.r, 20, 27);
  c.sky = { x, y, r: rad };
  const color = t === "evening" || t === "dawn" ? "#eeb766" : "#efc05a";
  const halo = glow(nextId(c, "sunglow"), x, y, rad * 2.8, color, 0.35);
  const partly = w === "clouds" ? `<path d="${blob(c.r, x + rad * 0.5, y + rad * 0.55, rad * 1.5, rad * 0.55, 9, 0.1)}" fill="${PAPER}" ${ink(2)}/>` : "";
  return halo + `<circle cx="${f(x)}" cy="${f(y)}" r="${f(rad)}" fill="${color}" ${INK_LINE}/>` + partly;
}

function moonShape(c: Ctx, x: number, y: number, rad: number, crescent = c.r() < 0.35): string {
  if (crescent) {
    const id = nextId(c, "crescent");
    return `<defs><mask id="${id}"><rect x="${f(x - rad * 2)}" y="${f(y - rad * 2)}" width="${f(rad * 4)}" height="${f(rad * 4)}" fill="#fff"/><circle cx="${f(x + rad * 0.45)}" cy="${f(y - rad * 0.2)}" r="${f(rad * 0.9)}" fill="#000"/></mask></defs><g mask="url(#${id})"><circle cx="${f(x)}" cy="${f(y)}" r="${f(rad)}" fill="#f1e7c9" ${INK_LINE}/></g>`;
  }
  return `<circle cx="${f(x)}" cy="${f(y)}" r="${f(rad)}" fill="#f1e7c9" ${INK_LINE}/><circle cx="${f(x - rad * 0.3)}" cy="${f(y - rad * 0.2)}" r="${f(rad * 0.16)}" fill="#e2d6b2"/><circle cx="${f(x + rad * 0.28)}" cy="${f(y + rad * 0.25)}" r="${f(rad * 0.11)}" fill="#e2d6b2"/>`;
}

function clouds(c: Ctx, count: number): string {
  if (c.p.night) return "";
  let out = "";
  for (let i = 0; i < count; i++) {
    let cx = range(c.r, 50, 350);
    const cy = range(c.r, 40, Math.min(140, c.horizon - 70));
    if (c.sky && Math.abs(cx - c.sky.x) < 70 && Math.abs(cy - c.sky.y) < 40) cx = c.sky.x < 200 ? cx + 150 : cx - 150;
    const w = range(c.r, 30, 52);
    const fill = c.spec.weather === "rain" ? "#dfe5e4" : PAPER;
    const d = cloudPath(c.r, cx, cy, w);
    out += `<path d="${d}" fill="${fill}" ${ink(2)}/>` + shade(d, nextId(c, "cloud"), "#8fa6ab", 0.35);
  }
  return out;
}

/** A cloud: soft bumps on top, a nearly flat base. */
function cloudPath(r: () => number, cx: number, cy: number, w: number): string {
  const h = w * 0.42;
  const pts: [number, number][] = [];
  const bumps = pick(r, [3, 3, 4]);
  pts.push([cx - w, cy + h * 0.3]);
  for (let i = 0; i <= bumps * 2; i++) {
    const t = i / (bumps * 2);
    const x = cx - w * 0.92 + t * w * 1.84;
    const arch = Math.sin(t * Math.PI);
    const bump = i % 2 === 1 ? range(r, 0.45, 0.75) : range(r, 0.05, 0.2);
    pts.push([x, cy - h * (0.15 + arch * 0.55 + bump * 0.6)]);
  }
  pts.push([cx + w, cy + h * 0.3]);
  pts.push([cx + w * 0.4, cy + h * 0.42]);
  pts.push([cx - w * 0.4, cy + h * 0.42]);
  return smoothClosed(pts);
}

function rainbow(c: Ctx): string {
  const cx = c.sky ? (c.sky.x < 200 ? 250 : 150) : 200;
  const colors = ["#d98e8a", "#e8b54a", "#9cc97a", "#9db9be"];
  return colors
    .map((col, i) => {
      const rr = 150 - i * 9;
      return `<path d="M${f(cx - rr)},${c.horizon + 10} A${rr},${f(rr * 0.9)} 0 0 1 ${f(cx + rr)},${c.horizon + 10}" stroke="${col}" stroke-width="8" fill="none" opacity="0.55"/>`;
    })
    .join("");
}

function grassTufts(c: Ctx, y0: number, y1: number, count: number, avoid?: [number, number]): string {
  let out = "";
  for (let i = 0; i < count; i++) {
    let x = range(c.r, 8, S - 8);
    if (avoid && x > avoid[0] && x < avoid[1]) x = x < (avoid[0] + avoid[1]) / 2 ? avoid[0] - range(c.r, 5, 30) : avoid[1] + range(c.r, 5, 30);
    const y = range(c.r, y0, y1);
    const h = range(c.r, 7, 15);
    out += `<path d="M${f(x - 4)},${f(y)} q2,-${f(h * 0.6)} 1,-${f(h)} M${f(x)},${f(y)} q0,-${f(h)} 1,-${f(h * 1.2)} M${f(x + 4)},${f(y)} q-1,-${f(h * 0.6)} 2,-${f(h * 0.9)}" stroke="${c.p.grass}" stroke-width="2" stroke-linecap="round" fill="none"/>`;
  }
  return out;
}

function ditsy(c: Ctx, y0: number, y1: number, count: number): string {
  const colors = [c.p.accent, PAPER, c.p.accent2, "#e8b54a"];
  let out = "";
  for (let i = 0; i < count; i++) {
    const x = range(c.r, 12, S - 12);
    const y = range(c.r, y0, y1);
    const col = pick(c.r, colors);
    const rr = range(c.r, 1.8, 2.8);
    out += `<g transform="translate(${f(x)},${f(y)})">`;
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      out += `<circle cx="${f(Math.cos(a) * rr)}" cy="${f(Math.sin(a) * rr)}" r="${f(rr * 0.75)}" fill="${col}"/>`;
    }
    out += `<circle r="${f(rr * 0.55)}" fill="${c.p.night ? "#e9e4d3" : "#fff8e6"}"/></g>`;
  }
  return out;
}

function ripples(c: Ctx, cx: number, cy: number, rx: number, ry: number, count: number): string {
  let out = "";
  for (let i = 0; i < count; i++) {
    const x = cx + range(c.r, -rx, rx);
    const y = cy + range(c.r, -ry, ry);
    const w = range(c.r, 10, 22);
    out += `<path d="M${f(x - w)},${f(y)} q${f(w / 2)},-3 ${f(w)},0 q${f(w / 2)},3 ${f(w)},0" stroke="${c.p.night ? "#6d8a92" : PAPER}" stroke-width="1.8" stroke-linecap="round" fill="none" opacity="0.85"/>`;
  }
  return out;
}

/** The land for each setting. Sets the horizon and where subjects stand. */
function setting(c: Ctx): { back: string; front: string } {
  const { r, p } = c;
  const w = c.spec.setting;
  switch (w) {
    case "hills": {
      c.horizon = 215;
      c.baseY = 330;
      return {
        back: `<path d="${ridge(r, 215, 46, 2)}" fill="${p.far}" ${INK_LINE}/><path d="${ridge(r, 262, 34, 2)}" fill="${p.mid}" ${INK_LINE}/><path d="${ridge(r, 318, 14, 2)}" fill="${p.near}" ${INK_LINE}/>`,
        front: grassTufts(c, 336, 392, 10),
      };
    }
    case "mountains": {
      c.horizon = 250;
      c.baseY = 335;
      let peaks = "";
      const n = 4;
      for (let i = 0; i < n; i++) {
        const x = -30 + i * 130 + range(r, -20, 20);
        const h = range(r, 90, 140);
        const base = 262;
        const d = `M${f(x - 110)},${base} Q${f(x - 30)},${f(base - h * 0.7)} ${f(x)},${f(base - h)} Q${f(x + 30)},${f(base - h * 0.7)} ${f(x + 110)},${base} Z`;
        const cap = `M${f(x - 22)},${f(base - h * 0.78)} Q${f(x)},${f(base - h - 2)} ${f(x + 22)},${f(base - h * 0.78)} q-8,6 -14,1 q-5,6 -12,0 q-6,5 -10,0 Z`;
        peaks += `<path d="${d}" fill="${mix(p.far, "#9aa9b8", p.night ? 0.1 : 0.35)}" ${INK_LINE}/>` + `<path d="${cap}" fill="${p.night ? "#c9d3d0" : PAPER}" ${ink(1.8)}/>`;
      }
      return {
        back: peaks + `<path d="${ridge(r, 282, 16, 3)}" fill="${p.mid}" ${INK_LINE}/><path d="${ridge(r, 322, 10, 2)}" fill="${p.near}" ${INK_LINE}/>`,
        front: grassTufts(c, 338, 392, 8),
      };
    }
    case "water": {
      c.horizon = 250;
      c.baseY = 300;
      const shore = `<path d="${ridge(r, 238, 16, 3, 262)}" fill="${p.far}" ${INK_LINE}/>`;
      const id = nextId(c, "water");
      const water = `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.water}"/><stop offset="1" stop-color="${p.waterDeep}"/></linearGradient></defs><rect x="-10" y="254" width="${S + 20}" height="${S - 250}" fill="url(#${id})" ${INK_LINE}/>`;
      return { back: shore + water + ripples(c, 200, 340, 170, 45, 6), front: "" };
    }
    case "shore": {
      c.horizon = 232;
      c.baseY = 318;
      const landLeft = c.spec.focus !== "right";
      const id = nextId(c, "sea");
      const sea = `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.water}"/><stop offset="1" stop-color="${p.waterDeep}"/></linearGradient></defs><rect x="-10" y="232" width="${S + 20}" height="${S}" fill="url(#${id})" ${INK_LINE}/>`;
      const beach = landLeft
        ? `M-20,300 C60,290 150,300 230,330 C290,352 330,380 350,${S + 20} L-20,${S + 20} Z`
        : `M420,300 C340,290 250,300 170,330 C110,352 70,380 50,${S + 20} L420,${S + 20} Z`;
      const foam = landLeft ? `M230,334 q40,14 70,40` : `M170,334 q-40,14 -70,40`;
      return {
        back: sea + ripples(c, landLeft ? 300 : 100, 270, 80, 25, 4) + `<path d="${beach}" fill="${mix(p.ground, "#e9dcc0", p.night ? 0.2 : 0.55)}" ${INK_LINE}/><path d="${foam}" stroke="${PAPER}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
        front: "",
      };
    }
    case "garden": {
      c.horizon = 250;
      c.baseY = 332;
      let fence = "";
      for (let x = -10; x < S + 20; x += 34) {
        fence += `<path d="M${x},292 L${x},252 L${x + 7},244 L${x + 14},252 L${x + 14},292 Z" fill="${p.night ? "#6b6152" : "#efe6d2"}" ${ink(2)}/>`;
      }
      fence += `<rect x="-10" y="262" width="${S + 20}" height="7" fill="${p.night ? "#6b6152" : "#e2d4b8"}" ${ink(2)}/>`;
      return {
        back: `<path d="${ridge(r, 238, 14, 3)}" fill="${p.far}" ${INK_LINE}/>` + fence + `<path d="${ridge(r, 300, 6, 2)}" fill="${p.near}" ${INK_LINE}/>`,
        front: ditsy(c, 340, 394, 14) + grassTufts(c, 340, 394, 8),
      };
    }
    case "sky": {
      c.horizon = 340;
      c.baseY = 372;
      return {
        back: `<path d="${ridge(r, 346, 14, 3)}" fill="${p.far}" ${INK_LINE}/><path d="${ridge(r, 372, 8, 2)}" fill="${p.near}" ${INK_LINE}/>`,
        front: "",
      };
    }
    case "indoors":
      c.horizon = 175;
      c.baseY = 262;
      return { back: "", front: "" };
    default: {
      c.horizon = 250;
      c.baseY = 328;
      return {
        back: `<path d="${ridge(r, 248, 22, 2)}" fill="${p.far}" ${INK_LINE}/><path d="${ridge(r, 286, 16, 3)}" fill="${p.mid}" ${INK_LINE}/><path d="${ridge(r, 322, 8, 2)}" fill="${p.near}" ${INK_LINE}/>`,
        front: grassTufts(c, 336, 394, 12),
      };
    }
  }
}

/** A window onto the day, a wall around it, and a sill to set things on. */
function room(c: Ctx, outside: string): { back: string; front: string } {
  const { p } = c;
  const id = nextId(c, "pane");
  const clip = `<defs><clipPath id="${id}"><rect x="70" y="36" width="260" height="208" rx="12"/></clipPath></defs>`;
  const view = `${clip}<g clip-path="url(#${id})">${outside}</g>`;
  const wall = `<path d="M-10,-10 H410 V410 H-10 Z M70,36 V244 H330 V36 Z" fill="${p.wall}" fill-rule="evenodd"/>`;
  const frame = `<rect x="70" y="36" width="260" height="208" rx="12" fill="none" ${ink(3)}/><path d="M200,36 V244 M70,140 H330" ${ink(3)}/>`;
  const curtainColor = mix(p.accent, p.wall, 0.35);
  const curtains =
    `<path d="M52,24 C60,110 58,190 76,262 L44,262 C40,190 34,100 30,24 Z" fill="${curtainColor}" ${ink(2.2)}/>` +
    `<path d="M348,24 C340,110 342,190 324,262 L356,262 C360,190 366,100 370,24 Z" fill="${curtainColor}" ${ink(2.2)}/>` +
    `<path d="M20,22 H380" ${ink(3)}/>`;
  const sill = `<rect x="34" y="244" width="332" height="18" rx="6" fill="#c9b08a" ${INK_LINE}/>`;
  const below = `<rect x="-10" y="262" width="${S + 20}" height="150" fill="${p.night ? "#463c34" : "#e6d7bb"}"/><path d="M-10,262 H410" ${INK_LINE}/>`;
  const lampGlow = p.night || p.dusk ? glow(nextId(c, "room"), 200, 250, 230, WARM, 0.18) : "";
  return { back: view + wall + lampGlow + frame + curtains + sill + below, front: "" };
}

// ---- subjects --------------------------------------------------------------------

/** One subject standing at (x, y), scaled by k. i is its place in the group. */
type Draw = (c: Ctx, x: number, y: number, k: number, i: number) => string;

/** A low tree stump with flared roots, for small things set down outdoors. */
function stump(x: number, y: number, k: number): string {
  const w = 30 * k;
  const h = 20 * k;
  const d = `M${f(x - w - 9 * k)},${f(y)} C${f(x - w - 2)},${f(y - 3 * k)} ${f(x - w + 2)},${f(y - h * 0.5)} ${f(x - w + 2)},${f(y - h)} L${f(x + w - 2)},${f(y - h)} C${f(x + w - 2)},${f(y - h * 0.5)} ${f(x + w + 2)},${f(y - 3 * k)} ${f(x + w + 9 * k)},${f(y)} Z`;
  const bark = `M${f(x - w * 0.5)},${f(y - h * 0.8)} q-2,${f(h * 0.4)} 1,${f(h * 0.75)} M${f(x + w * 0.1)},${f(y - h * 0.75)} q2,${f(h * 0.4)} -1,${f(h * 0.7)} M${f(x + w * 0.6)},${f(y - h * 0.8)} q-2,${f(h * 0.4)} 2,${f(h * 0.75)}`;
  return (
    `<ellipse cx="${f(x)}" cy="${f(y + 1)}" rx="${f(w * 1.6)}" ry="${f(4 * k)}" fill="${INK}" opacity="0.1"/>` +
    `<path d="${d}" fill="${TRUNK}" ${INK_LINE}/>` +
    `<path d="${bark}" stroke="#6b5641" stroke-width="1.6" fill="none" stroke-linecap="round"/>` +
    `<ellipse cx="${f(x)}" cy="${f(y - h)}" rx="${f(w - 2)}" ry="${f(6 * k)}" fill="#dcc39c" ${ink(2)}/>` +
    `<ellipse cx="${f(x)}" cy="${f(y - h)}" rx="${f(w * 0.55)}" ry="${f(3.2 * k)}" fill="none" stroke="#b99a72" stroke-width="1.3"/>` +
    `<ellipse cx="${f(x)}" cy="${f(y - h)}" rx="${f(w * 0.22)}" ry="${f(1.4 * k)}" fill="none" stroke="#b99a72" stroke-width="1.2"/>`
  );
}

const tree: Draw = (c, x, y, k) => {
  const { r, p } = c;
  const height = 200 * k;
  let branches = "";
  const tips: [number, number][] = [];
  const bare = p.snow || (c.o.season === "winter" && c.spec.weather !== "clear");
  const grow = (x0: number, y0: number, len: number, angle: number, width: number, depth: number) => {
    const x1 = x0 + Math.cos(angle) * len;
    const y1 = y0 + Math.sin(angle) * len;
    const bend = range(r, -0.25, 0.25) * len;
    const mx = (x0 + x1) / 2 + Math.cos(angle + Math.PI / 2) * bend;
    const my = (y0 + y1) / 2 + Math.sin(angle + Math.PI / 2) * bend;
    branches += limb(`M${f(x0)},${f(y0)} Q${f(mx)},${f(my)} ${f(x1)},${f(y1)}`, width, TRUNK);
    if (depth === 0) {
      tips.push([x1, y1]);
      return;
    }
    const n = depth > 2 ? 2 : pick(r, [2, 2, 3]);
    for (let i = 0; i < n; i++) {
      const a = angle + (i - (n - 1) / 2) * range(r, 0.35, 0.6) * 1.3 + range(r, -0.12, 0.12);
      grow(x1, y1, len * range(r, 0.62, 0.78), a, Math.max(1.4, width * 0.62), depth - 1);
    }
  };
  grow(x, y, height * (bare ? 0.34 : 0.3), -Math.PI / 2 + range(r, -0.08, 0.08), height * 0.075, bare ? 4 : 3);
  if (bare) {
    let snow = "";
    for (const [tx, ty] of tips.slice(0, 8)) snow += `<circle cx="${f(tx)}" cy="${f(ty)}" r="2.2" fill="${PAPER}"/>`;
    return branches + snow;
  }
  const autumn = c.o.season === "autumn";
  const main = autumn ? "#d9985f" : p.leaf;
  const cx = x;
  const cy = y - height * 0.66;
  const layers = [
    { dx: 0, dy: 0, rx: 0.36, ry: 0.3, col: main },
    { dx: -0.2, dy: 0.07, rx: 0.2, ry: 0.17, col: autumn ? "#c47c48" : p.near },
    { dx: 0.21, dy: 0.05, rx: 0.2, ry: 0.16, col: autumn ? "#e2a869" : p.mid },
  ];
  let canopy = "";
  for (const l of layers) {
    const d = blob(r, cx + l.dx * height, cy + l.dy * height, l.rx * height, l.ry * height, 9, 0.1);
    canopy += `<path d="${d}" fill="${l.col}" ${INK_LINE}/>` + shade(d, nextId(c, "canopy"), INK, 0.14);
  }
  for (let i = 0; i < 6; i++) {
    canopy += `<circle cx="${f(cx + range(r, -0.28, 0.28) * height)}" cy="${f(cy + range(r, -0.2, 0.16) * height)}" r="${f(range(r, 2, 3.4) * Math.max(0.7, k))}" fill="${p.accent}"/>`;
  }
  return branches + canopy;
};

const sapling: Draw = (c, x, y, k) => {
  const soil = `<path d="${blob(c.r, x, y - 2, 56 * k, 14 * k, 9, 0.08)}" fill="${c.p.ground}" ${INK_LINE}/>`;
  const h = 78 * k;
  const stem = limb(`M${f(x)},${f(y - 6 * k)} C${f(x - 4 * k)},${f(y - h * 0.4)} ${f(x + 6 * k)},${f(y - h * 0.7)} ${f(x)},${f(y - h)}`, 3.6 * k, "#6f9a5f");
  return soil + stem + leaf(x - 20 * k, y - h + 2, -58, 40 * k, c.p.leaf) + leaf(x + 18 * k, y - h - 4, 60, 36 * k, c.p.leaf);
};

const flowers: Draw = (c, x, y, k, i) => {
  const { r, p } = c;
  let out = "";
  const stems = 3;
  for (let s = 0; s < stems; s++) {
    const sx = x + (s - 1) * 22 * k + range(r, -5, 5);
    const h = (range(r, 80, 130) - (s === 1 ? 0 : 20)) * k;
    const tx = sx + range(r, -12, 12) * k;
    const ty = y - h;
    out += limb(`M${f(sx)},${f(y)} Q${f(sx + range(r, -10, 10))},${f(y - h / 2)} ${f(tx)},${f(ty)}`, 2.6 * k, "#6f9a5f");
    out += leaf(sx + 8 * k, y - h * 0.35, 50, 22 * k, p.leaf, 1.5);
    const petal = s === 1 ? p.accent : (i + s) % 2 ? p.accent2 : PAPER;
    const pr = range(r, 9, 12) * k;
    out += `<g transform="translate(${f(tx)},${f(ty)}) rotate(${f(range(r, 0, 60))})">`;
    for (let q = 0; q < 6; q++) {
      const a = (q / 6) * 360;
      out += `<ellipse cx="0" cy="${f(-pr)}" rx="${f(pr * 0.55)}" ry="${f(pr * 0.95)}" transform="rotate(${a})" fill="${petal}" ${ink(1.6)}/>`;
    }
    out += `<circle r="${f(pr * 0.5)}" fill="#e8b54a" ${ink(1.6)}/></g>`;
  }
  return out;
};

function birdShape(x: number, y: number, flip: boolean, body: string, wing: string, k: number, lean = 0): string {
  const s = flip ? -1 : 1;
  return `<g transform="translate(${f(x)},${f(y)}) rotate(${f(lean * s)}) scale(${f(s * 1.75 * k)},${f(1.75 * k)})"><path d="M-13,2 L-20,-3 L-18,4 Z" fill="${wing}" ${ink(1.4)}/><path d="M-12,2 C-12,-10 6,-12 10,-2 C12,5 6,10 -4,10 C-10,10 -12,6 -12,2 Z" fill="${body}" ${ink(1.5)}/><path d="M-2,9 C3,9 7,6 8,2" stroke="${PAPER}" stroke-width="1.6" fill="none" opacity="0.7" stroke-linecap="round"/><path d="M-7,-1 C-3,5 3,4 4,0 C0,-2 -4,-3 -7,-1 Z" fill="${wing}" ${ink(1.3)}/><circle cx="4.5" cy="-3.5" r="1.5" fill="${INK}"/><path d="M10,-3 L15,-1.5 L10,0.5" fill="#e8b54a" ${ink(1.2)}/><path d="M-2,10 L-2,14 M2,10 L2,14" ${ink(1.3)}/></g>`;
}

function flyingBird(x: number, y: number, flip: boolean, body: string, k: number): string {
  const s = flip ? -1 : 1;
  return `<g transform="translate(${f(x)},${f(y)}) scale(${f(s * 1.7 * k)},${f(1.7 * k)})"><path d="M-2,-2 C-8,-14 -18,-14 -22,-8 C-14,-8 -8,-4 -4,2 Z" fill="${mix(body, PAPER, 0.3)}" ${ink(1.4)}/><path d="M-12,2 C-10,-6 6,-8 12,-2 C10,6 0,8 -8,6 Z" fill="${body}" ${ink(1.5)}/><path d="M2,-3 C6,-16 16,-18 20,-12 C12,-10 8,-6 6,0 Z" fill="${mix(body, PAPER, 0.2)}" ${ink(1.4)}/><circle cx="7" cy="-2" r="1.2" fill="${INK}"/><path d="M12,-2 L16,-1 L12,1" fill="#e8b54a" ${ink(1.1)}/></g>`;
}

function birdGroup(c: Ctx, focusX: number): string {
  const { r, p } = c;
  const n = c.n;
  const colors = [p.accent, p.accent2, "#c5dbdf"];
  const wings = colors.map((col) => mix(col, INK, 0.2));
  if (c.spec.setting === "sky") {
    let out = "";
    const spots: [number, number][] =
      c.spec.arrangement === "apart" ? [[100, 150], [300, 110]] : n === 1 ? [[focusX, 150]] : n === 2 ? [[focusX - 40, 160], [focusX + 40, 138]] : [[focusX - 60, 170], [focusX, 135], [focusX + 60, 165]];
    spots.forEach(([bx, by], i) => (out += flyingBird(bx + range(r, -8, 8), by + range(r, -8, 8), c.spec.arrangement === "reaching" && i === 1, colors[i % 3], 1.25)));
    return out;
  }
  const y = c.spec.setting === "indoors" ? 170 : Math.min(c.baseY - 90, 250);
  const branch = `M-10,${f(y + 22)} C100,${f(y + 6)} 240,${f(y)} 410,${f(y + 14)}`;
  let out = limb(branch, 8, TRUNK) + limb(`M300,${f(y + 5)} q20,-30 50,-40`, 4, TRUNK);
  out += leaf(340, y - 42, 30, 26, p.leaf) + leaf(362, y - 28, 80, 24, p.leaf) + leaf(88, y + 4, -120, 24, p.leaf);
  const onBranch = (bx: number) => y + 22 - ((bx + 10) / 420) * 14 - 36;
  const arr = c.spec.arrangement;
  if (arr === "reaching") {
    out += birdShape(focusX - 50, onBranch(focusX - 50) - 6, false, colors[0], wings[0], 1.25);
    out += flyingBird(focusX + 70, y - 70, true, colors[1], 1.1);
  } else if (arr === "apart") {
    out += birdShape(70, onBranch(70) - 6, false, colors[0], wings[0], 1.25);
    out += birdShape(320, onBranch(320) - 6, true, colors[1], wings[1], 1.25);
  } else {
    const gap = arr === "together" ? 54 : 72;
    const xs = n === 1 ? [focusX] : n === 2 ? [focusX - gap / 2, focusX + gap / 2] : [focusX - gap, focusX, focusX + gap];
    xs.forEach((bx, i) => {
      const flip = n === 2 ? i === 1 : i === n - 1 && n > 1;
      out += birdShape(bx, onBranch(bx) - 6, flip, colors[i % 3], wings[i % 3], 1.25, arr === "together" ? 8 : 0);
    });
  }
  return out;
}

const nest: Draw = (c, x, y) => {
  const { r, p } = c;
  const ny = Math.min(y - 60, 240);
  let out = limb(`M-10,${f(ny + 40)} C80,${f(ny + 20)} ${f(x - 40)},${f(ny + 16)} ${f(x + 10)},${f(ny + 14)} C${f(x + 80)},${f(ny + 10)} 330,${f(ny - 30)} 410,${f(ny - 60)}`, 9, TRUNK);
  out += leaf(x + 110, ny - 30, 40, 30, p.leaf) + leaf(x - 100, ny + 12, -70, 26, p.leaf) + leaf(x + 140, ny - 44, 100, 24, p.leaf);
  const eggs = c.n;
  for (let e = 0; e < eggs; e++) {
    const ex = x + (e - (eggs - 1) / 2) * 20;
    out += `<ellipse cx="${f(ex)}" cy="${f(ny - 8 - (e === 1 ? 3 : 0))}" rx="9" ry="12" fill="#cfe1e4" ${ink(1.8)}/><circle cx="${f(ex - 3)}" cy="${f(ny - 12)}" r="1.4" fill="#86b3bc"/>`;
  }
  const bowl = `M${f(x - 46)},${f(ny - 6)} Q${f(x)},${f(ny + 40)} ${f(x + 46)},${f(ny - 6)} Q${f(x)},${f(ny + 6)} ${f(x - 46)},${f(ny - 6)} Z`;
  out += `<path d="${bowl}" fill="#b08a5e" ${INK_LINE}/>`;
  for (let s = 0; s < 7; s++) {
    const sx = x - 40 + s * 13 + range(r, -3, 3);
    out += `<path d="M${f(sx - 8)},${f(ny + 2 + range(r, 0, 10))} q10,-4 18,2" stroke="#7d5f40" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
  }
  return out;
};

const fox: Draw = (_c, x, y, k, i) => {
  const s = i % 2 ? -1 : 1;
  const body = "#d9985f";
  const g = (d: string, fill: string, w = 2.2) => `<path d="${d}" fill="${fill}" ${ink(w)}/>`;
  return (
    `<g transform="translate(${f(x)},${f(y)}) scale(${f(s * k)},${f(k)})">` +
    `<ellipse cx="0" cy="2" rx="62" ry="8" fill="${INK}" opacity="0.08"/>` +
    g("M-50,0 C-58,-40 -10,-52 24,-42 C54,-34 60,-8 48,0 Z", body) +
    g("M40,0 C70,-4 78,-30 60,-40 C48,-46 30,-36 34,-22 C44,-26 52,-22 50,-14 C46,-4 30,-2 20,0 Z", body) +
    g("M58,-38 C66,-34 70,-28 70,-22 C62,-20 56,-26 54,-34 Z", PAPER, 1.6) +
    g("M-50,0 C-54,-16 -44,-30 -28,-30 C-12,-30 -4,-16 -8,0 Z", mix(body, INK, 0.08)) +
    g("M-40,-28 L-46,-44 L-30,-32 Z", body, 1.8) +
    g("M-22,-30 L-20,-46 L-10,-30 Z", body, 1.8) +
    g("M-50,-8 C-58,-8 -62,-12 -60,-16 C-54,-18 -50,-14 -48,-12 Z", INK, 1) +
    `<path d="M-38,-16 q4,3 8,0" ${ink(1.6)} fill="none"/>` +
    g("M-42,-2 C-38,-10 -26,-10 -20,-2 Z", PAPER, 1.4) +
    `</g>`
  );
};

const boat: Draw = (c, x, y, k) => {
  const w = 44 * k;
  const hull = `M${f(x - w)},${f(y)} L${f(x + w)},${f(y)} Q${f(x + w * 0.8)},${f(y + 20 * k)} ${f(x)},${f(y + 20 * k)} Q${f(x - w * 0.8)},${f(y + 20 * k)} ${f(x - w)},${f(y)} Z`;
  return (
    `<path d="${hull}" fill="${WOOD}" ${INK_LINE}/>` +
    shade(hull, nextId(c, "hull"), INK, 0.2) +
    `<path d="M${f(x)},${f(y)} L${f(x)},${f(y - 74 * k)}" ${INK_LINE}/>` +
    `<path d="M${f(x + 3)},${f(y - 70 * k)} Q${f(x + 40 * k)},${f(y - 34 * k)} ${f(x + 3)},${f(y - 8 * k)} Z" fill="${PAPER}" ${INK_LINE}/>` +
    `<path d="M${f(x - 3)},${f(y - 52 * k)} L${f(x - 28 * k)},${f(y - 10 * k)} L${f(x - 3)},${f(y - 10 * k)} Z" fill="${c.p.accent}" ${INK_LINE}/>` +
    `<path d="M${f(x)},${f(y - 74 * k)} l12,4 l-12,4" fill="${c.p.accent2}" ${ink(1.6)}/>` +
    `<path d="M${f(x - w * 1.2)},${f(y + 26 * k)} q${f(w * 0.4)},5 ${f(w * 0.8)},0 M${f(x + w * 0.3)},${f(y + 30 * k)} q${f(w * 0.4)},5 ${f(w * 0.8)},0" stroke="${c.p.night ? "#6d8a92" : PAPER}" stroke-width="2" stroke-linecap="round" fill="none"/>`
  );
};

const paperBoat: Draw = (c, x, y, k) => {
  const w = 40 * k;
  const h = 34 * k;
  return (
    `<path d="M${f(x - w)},${f(y - h * 0.3)} L${f(x + w)},${f(y - h * 0.3)} L${f(x + w * 0.62)},${f(y + 4 * k)} L${f(x - w * 0.62)},${f(y + 4 * k)} Z" fill="${PAPER}" ${INK_LINE}/>` +
    `<path d="M${f(x - w * 0.55)},${f(y - h * 0.3)} L${f(x)},${f(y - h)} L${f(x + w * 0.55)},${f(y - h * 0.3)} Z" fill="${mix(PAPER, c.p.accent, 0.25)}" ${INK_LINE}/>` +
    `<path d="M${f(x)},${f(y - h)} L${f(x)},${f(y - h * 0.3)}" ${ink(1.4)}/>` +
    `<path d="M${f(x - w * 1.1)},${f(y + 10 * k)} q${f(w * 0.5)},4 ${f(w)},0 q${f(w * 0.5)},-4 ${f(w)},0" stroke="${c.p.night ? "#6d8a92" : PAPER}" stroke-width="2" stroke-linecap="round" fill="none"/>`
  );
};

const lighthouse: Draw = (c, x, y, k) => {
  const h = 170 * k;
  const bw = 30 * k;
  const tw = 20 * k;
  const top = y - h;
  const tower = `M${f(x - bw)},${f(y)} L${f(x - tw)},${f(top + 26 * k)} L${f(x + tw)},${f(top + 26 * k)} L${f(x + bw)},${f(y)} Z`;
  let stripes = "";
  for (let s = 0; s < 3; s++) {
    const y1 = y - (s * 2 + 1) * (h - 26 * k) / 6;
    const y2 = y1 - (h - 26 * k) / 6;
    const w1 = bw - ((y - y1) / (h - 26 * k)) * (bw - tw);
    const w2 = bw - ((y - y2) / (h - 26 * k)) * (bw - tw);
    stripes += `<path d="M${f(x - w1)},${f(y1)} L${f(x - w2)},${f(y2)} L${f(x + w2)},${f(y2)} L${f(x + w1)},${f(y1)} Z" fill="${c.p.accent2}" ${ink(1.8)}/>`;
  }
  const lit = c.p.night || c.p.dusk || c.spec.light === "glow" || c.spec.weather === "mist";
  const beam = lit
    ? `<path d="M${f(x)},${f(top + 14 * k)} L${f(x - 190)},${f(top - 30 * k)} L${f(x - 190)},${f(top + 40 * k)} Z" fill="${WARM}" opacity="0.28"/><path d="M${f(x)},${f(top + 14 * k)} L${f(x + 170)},${f(top - 10 * k)} L${f(x + 170)},${f(top + 36 * k)} Z" fill="${WARM}" opacity="0.2"/>`
    : "";
  const rocks = `<path d="${blob(c.r, x, y + 4, bw * 2.2, 14 * k, 9, 0.12)}" fill="#8f978e" ${INK_LINE}/>`;
  return (
    beam +
    (lit ? glow(nextId(c, "lamp"), x, top + 14 * k, 60 * k, WARM, 0.6) : "") +
    rocks +
    `<path d="${tower}" fill="${PAPER}" ${INK_LINE}/>` +
    stripes +
    `<rect x="${f(x - tw - 4)}" y="${f(top + 22 * k)}" width="${f(tw * 2 + 8)}" height="${f(6 * k)}" rx="2" fill="${INK}"/>` +
    `<rect x="${f(x - tw * 0.7)}" y="${f(top + 4 * k)}" width="${f(tw * 1.4)}" height="${f(18 * k)}" rx="3" fill="${lit ? WARM : "#dfe7e8"}" ${ink(2)}/>` +
    `<path d="M${f(x - tw)},${f(top + 5 * k)} Q${f(x)},${f(top - 16 * k)} ${f(x + tw)},${f(top + 5 * k)} Z" fill="${c.p.accent}" ${INK_LINE}/>` +
    `<path d="M${f(x - 8 * k)},${f(y)} L${f(x - 8 * k)},${f(y - 22 * k)} Q${f(x)},${f(y - 30 * k)} ${f(x + 8 * k)},${f(y - 22 * k)} L${f(x + 8 * k)},${f(y)} Z" fill="${WOOD}" ${ink(1.8)}/>`
  );
};

function bridgeScene(c: Ctx): string {
  const { p } = c;
  const stream = `M186,${c.horizon + 4} C150,290 260,300 200,340 C160,370 150,390 140,410 L300,410 C300,380 320,350 300,320 C280,290 222,276 206,${c.horizon + 4} Z`;
  const by = 300;
  let rails = "";
  for (const bx of [130, 170, 210, 250, 290]) {
    const t = (bx - 90) / 240;
    rails += `<path d="M${bx},${f(by + 2 - Math.sin(t * Math.PI) * 38)} L${bx},${f(by + 10 - Math.sin(t * Math.PI) * 35)}" ${ink(2.4)}/>`;
  }
  const deck = `M90,${by + 10} Q210,${by - 60} 330,${by + 10} L330,${by + 24} Q210,${by - 40} 90,${by + 24} Z`;
  return (
    `<path d="${stream}" fill="${p.water}" ${INK_LINE}/>` +
    ripples(c, 225, 355, 40, 18, 3) +
    `<path d="${deck}" fill="${WOOD}" ${INK_LINE}/>` +
    shade(deck, nextId(c, "deck"), INK, 0.22) +
    `<path d="M100,${by + 2} Q210,${by - 74} 320,${by + 2}" fill="none" ${ink(3)}/>` +
    rails
  );
}

function pathScene(c: Ctx, focusX: number): string {
  const { r, p } = c;
  const fill = mix(p.ground, "#efe4cb", p.night ? 0.15 : 0.55);
  const h = c.horizon + 4;
  const arr = c.spec.arrangement;
  const B = S + 10;
  let d: string;
  if (arr === "apart") {
    // A fork: one wide way in, two narrowing ways on, fading into the distance.
    const top = Math.max(h, 262);
    const lt = Math.max(96, focusX - 64);
    const rt = Math.min(304, focusX + 64);
    d = `M70,${B} C120,372 170,352 182,334 C168,316 ${f(lt + 10)},${top + 16} ${f(lt - 3)},${top} L${f(lt + 5)},${top} C${f(lt + 18)},${top + 12} 186,314 200,326 C214,314 ${f(rt - 18)},${top + 12} ${f(rt - 5)},${top} L${f(rt + 3)},${top} C${f(rt - 10)},${top + 16} 232,316 218,334 C230,352 280,372 330,${B} Z`;
  } else if (arr === "together" || arr === "reaching") {
    // Two ways that meet and go on as one.
    const t = focusX;
    d = `M18,${B} C60,382 150,356 188,336 C194,302 ${f(t - 6)},${h + 20} ${f(t - 4)},${h} L${f(t + 6)},${h} C${f(t + 8)},${h + 20} 208,302 214,336 C252,356 342,382 382,${B} L318,${B} C290,392 244,372 201,354 C158,372 112,392 84,${B} Z`;
  } else {
    const sway = range(r, -30, 30);
    d = `M${f(focusX - 8 + sway)},${h} C${f(focusX - 30 + sway)},300 120,340 90,${B} L310,${B} C260,340 ${f(focusX + 15 + sway)},300 ${f(focusX + 10 + sway)},${h} Z`;
  }
  let out = `<path d="${d}" fill="${fill}" ${INK_LINE}/>` + shade(d, nextId(c, "path"), INK, 0.1);
  if (arr === "gathered") {
    for (let q = 0; q < 4; q++) out += `<ellipse cx="${f(200 + range(r, -20, 20))}" cy="${f(388 - q * 20)}" rx="${f(17 - q * 3)}" ry="${f(6 - q)}" fill="#c9c2b0" ${ink(1.6)}/>`;
  }
  let blades = "";
  for (let i = 0; i < 40; i++) {
    const left = i % 2 === 0;
    const x = left ? range(r, -5, 80) : range(r, 320, 405);
    const base = range(r, 330, 405);
    const hh = range(r, 50, 120);
    const lean = range(r, -18, 18);
    blades += `<path d="M${f(x)},${f(base)} Q${f(x + lean / 2)},${f(base - hh / 2)} ${f(x + lean)},${f(base - hh)}" stroke="${pick(r, p.night ? ["#2c4435", "#35503f", "#40584b"] : ["#5f8a5a", "#7fa36f", "#4f7348", "#9dbe84"])}" stroke-width="${f(range(r, 2.4, 4))}" stroke-linecap="round" fill="none"/>`;
  }
  return out + blades;
}

const mountain: Draw = (c, x, y, k) => {
  const h = 210 * k;
  const w = 150 * k;
  const d = `M${f(x - w)},${f(y)} Q${f(x - w * 0.35)},${f(y - h * 0.62)} ${f(x)},${f(y - h)} Q${f(x + w * 0.4)},${f(y - h * 0.6)} ${f(x + w)},${f(y)} Z`;
  const cap = `M${f(x - w * 0.2)},${f(y - h * 0.78)} Q${f(x)},${f(y - h - 3)} ${f(x + w * 0.22)},${f(y - h * 0.77)} q-10,8 -18,1 q-7,9 -15,0 q-8,7 -14,-1 Z`;
  const side = `M${f(x)},${f(y - h)} Q${f(x + w * 0.4)},${f(y - h * 0.6)} ${f(x + w)},${f(y)} L${f(x + w * 0.2)},${f(y)} Q${f(x + w * 0.1)},${f(y - h * 0.5)} ${f(x)},${f(y - h)} Z`;
  const body = mix(c.p.mid, "#8d9aa8", c.p.night ? 0.15 : 0.4);
  return `<path d="${d}" fill="${body}" ${INK_LINE}/><path d="${side}" fill="${INK}" opacity="0.1"/><path d="${cap}" fill="${c.p.night ? "#d5dcd8" : PAPER}" ${ink(2)}/>`;
};

function bigMoon(c: Ctx, x: number): string {
  const y = range(c.r, 110, 150);
  const rad = 52;
  c.sky = { x, y, r: rad };
  return glow(nextId(c, "bigmoon"), x, y, rad * 3, "#f1e7c9", c.p.night ? 0.35 : 0.2) + moonShape(c, x, y, rad, c.spec.arrangement === "apart");
}

const kite: Draw = (c, x, _y, k, i) => {
  const { r, p } = c;
  const ky = range(r, 90, 130) + i * 26;
  const s = 40 * k;
  const col = i % 2 ? p.accent2 : p.accent;
  const anchorX = 200 + (i - 0.5) * 40;
  const anchorY = c.baseY;
  const string = `M${f(x)},${f(ky + s * 1.3)} Q${f((x + anchorX) / 2 + 30)},${f((ky + anchorY) / 2)} ${f(anchorX)},${f(anchorY)}`;
  let tail = `M${f(x)},${f(ky + s * 1.3)} q-14,20 0,40 q14,20 0,40`;
  let bows = "";
  for (let b = 0; b < 3; b++) {
    const by = ky + s * 1.3 + 20 + b * 22;
    bows += `<path d="M${f(x - 7)},${f(by - 5)} L${f(x + 7)},${f(by + 5)} L${f(x + 7)},${f(by - 5)} L${f(x - 7)},${f(by + 5)} Z" fill="${b % 2 ? p.accent2 : "#e8b54a"}" ${ink(1.4)}/>`;
  }
  tail = `<path d="${tail}" fill="none" ${ink(1.6)}/>`;
  return (
    `<path d="${string}" fill="none" stroke="${INK}" stroke-width="1.3" opacity="0.8"/>` +
    `<rect x="${f(anchorX - 5)}" y="${f(anchorY - 18)}" width="10" height="20" rx="2" fill="${WOOD}" ${ink(1.8)}/>` +
    tail +
    bows +
    `<path d="M${f(x)},${f(ky - s)} L${f(x + s * 0.72)},${f(ky)} L${f(x)},${f(ky + s * 1.3)} L${f(x - s * 0.72)},${f(ky)} Z" fill="${col}" ${INK_LINE}/>` +
    `<path d="M${f(x)},${f(ky - s)} L${f(x)},${f(ky + s * 1.3)} M${f(x - s * 0.72)},${f(ky)} L${f(x + s * 0.72)},${f(ky)}" ${ink(1.6)}/>` +
    `<path d="M${f(x)},${f(ky - s)} L${f(x + s * 0.72)},${f(ky)} L${f(x)},${f(ky)} Z" fill="${PAPER}" opacity="0.35"/>`
  );
};

const stones: Draw = (c, x, y, k) => {
  const { r } = c;
  const count = 4;
  let out = "";
  let cy = y;
  const greys = ["#a3a89c", "#b9bbaf", "#8f978e", "#c9c6b6", "#9fa99f"];
  for (let s = 0; s < count; s++) {
    const w = (44 - s * 8 + range(r, -3, 3)) * k;
    const h = (15 - s * 1.5) * k;
    cy -= h;
    const cx = x + range(r, -4, 4) * k;
    const d = blob(r, cx, cy, w, h, 9, 0.08);
    out += `<path d="${d}" fill="${pick(r, greys)}" ${INK_LINE}/>` + shade(d, nextId(c, "stone"), INK, 0.18);
    cy -= h * 0.9;
  }
  out += `<path d="M${f(x - 30 * k)},${f(y - 3)} q6,-5 12,0 q6,-5 12,0" fill="#7fa36f" ${ink(1.4)}/>`;
  return out;
};

const house: Draw = (c, x, y, k) => {
  const w = 52 * k;
  const h = 58 * k;
  const roof = 44 * k;
  const lit = c.p.night || c.p.dusk || c.spec.light === "glow";
  const wall = c.p.night ? "#a58e6c" : "#e2cfa8";
  const body = `M${f(x - w)},${f(y)} L${f(x - w)},${f(y - h)} L${f(x)},${f(y - h - roof)} L${f(x + w)},${f(y - h)} L${f(x + w)},${f(y)} Z`;
  return (
    (lit ? glow(nextId(c, "home"), x, y - h * 0.55, 90 * k, WARM, 0.45) : "") +
    `<rect x="${f(x + w * 0.42)}" y="${f(y - h - roof * 0.9)}" width="${f(12 * k)}" height="${f(26 * k)}" fill="${WOOD}" ${ink(2)}/>` +
    `<path d="${body}" fill="${wall}" ${INK_LINE}/>` +
    shade(body, nextId(c, "house"), INK, 0.15) +
    `<path d="M${f(x - w - 12 * k)},${f(y - h + 6 * k)} L${f(x)},${f(y - h - roof - 8 * k)} L${f(x + w + 12 * k)},${f(y - h + 6 * k)} L${f(x + w + 4 * k)},${f(y - h + 12 * k)} L${f(x)},${f(y - h - roof + 4 * k)} L${f(x - w - 4 * k)},${f(y - h + 12 * k)} Z" fill="${mix(c.p.accent2, "#8b6c4f", c.p.night ? 0.6 : 0.45)}" ${ink(2.4)}/>` +
    `<rect x="${f(x - w * 0.62)}" y="${f(y - h * 0.72)}" width="${f(w * 0.56)}" height="${f(h * 0.4)}" rx="${f(4 * k)}" fill="${lit ? WARM : "#cfe1e4"}" ${ink(2)}/>` +
    `<path d="M${f(x - w * 0.34)},${f(y - h * 0.72)} V${f(y - h * 0.32)}" ${ink(1.6)}/>` +
    `<path d="M${f(x + w * 0.14)},${f(y)} V${f(y - h * 0.62)} Q${f(x + w * 0.36)},${f(y - h * 0.76)} ${f(x + w * 0.58)},${f(y - h * 0.62)} V${f(y)} Z" fill="${WOOD}" ${ink(2)}/>` +
    `<circle cx="${f(x + w * 0.5)}" cy="${f(y - h * 0.3)}" r="${f(1.8 * k)}" fill="${INK}"/>`
  );
};

const door: Draw = (c, x, y, k) => {
  const w = 58 * k;
  const h = 120 * k;
  const frame = `M${f(x - w / 2)},${f(y)} V${f(y - h + w / 2)} A${f(w / 2)},${f(w / 2)} 0 0 1 ${f(x + w / 2)},${f(y - h + w / 2)} V${f(y)} Z`;
  const inside = c.p.night ? "#f6d58a" : "#fbe7b5";
  const panel = `M${f(x + w / 2)},${f(y)} L${f(x + w / 2 + 26 * k)},${f(y - 8 * k)} L${f(x + w / 2 + 26 * k)},${f(y - h + 12 * k)} L${f(x + w / 2)},${f(y - h + w / 2 - 6 * k)} Z`;
  const spill = `M${f(x - w / 2)},${f(y)} L${f(x + w / 2)},${f(y)} L${f(x + w * 1.4)},${f(y + 70 * k)} L${f(x - w * 1.4)},${f(y + 70 * k)} Z`;
  return (
    glow(nextId(c, "door"), x, y - h * 0.5, 120 * k, WARM, 0.5) +
    `<path d="${spill}" fill="${WARM}" opacity="0.35"/>` +
    `<path d="${frame}" fill="${inside}" stroke="${WOOD}" stroke-width="${f(9 * k)}"/>` +
    `<path d="${frame}" fill="none" ${INK_LINE}/>` +
    `<path d="${panel}" fill="${c.p.accent}" ${INK_LINE}/>` +
    `<circle cx="${f(x + w / 2 + 20 * k)}" cy="${f(y - h * 0.45)}" r="${f(2.4 * k)}" fill="${INK}"/>` +
    `<path d="M${f(x - w / 2 - 6)},${f(y)} H${f(x + w / 2 + 30 * k)}" ${ink(3)}/>`
  );
};

const bench: Draw = (c, x, y, k, i) => {
  const w = 44 * k;
  const back = i === 0 && c.n === 1 ? tree(c, x - 90, y + 4, 1.02, 0) : "";
  return (
    back +
    `<rect x="${f(x - w)}" y="${f(y - 26 * k)}" width="${f(w * 2)}" height="${f(8 * k)}" rx="3" fill="${WOOD}" ${INK_LINE}/>` +
    `<rect x="${f(x - w)}" y="${f(y - 46 * k)}" width="${f(w * 2)}" height="${f(7 * k)}" rx="3" fill="${WOOD}" ${INK_LINE}/>` +
    `<path d="M${f(x - w + 6)},${f(y - 18 * k)} L${f(x - w + 4)},${f(y)} M${f(x + w - 6)},${f(y - 18 * k)} L${f(x + w - 4)},${f(y)} M${f(x - w + 8)},${f(y - 39 * k)} L${f(x - w + 8)},${f(y - 26 * k)} M${f(x + w - 8)},${f(y - 39 * k)} L${f(x + w - 8)},${f(y - 26 * k)}" ${ink(3)}/>`
  );
};

function smallOnPedestal(draw: Draw): Draw {
  return (c, x, y, k, i) => {
    if (c.spec.setting === "indoors") return draw(c, x, y, k, i);
    const sk = Math.max(1, k * 1.05);
    return stump(x, y, sk) + draw(c, x, y - 20 * sk - 2, k, i);
  };
}

const lantern: Draw = (c, x, y, k, i) => {
  const lit = WARM;
  const hanging = c.spec.setting !== "indoors";
  const ly = hanging ? y - 110 * k - (i % 2) * 12 : y;
  const w = 20 * k;
  const h = 34 * k;
  let post = "";
  if (hanging) {
    post = limb(`M${f(x - 30 * k)},${f(y)} L${f(x - 30 * k)},${f(ly - h - 26 * k)} Q${f(x - 30 * k)},${f(ly - h - 40 * k)} ${f(x - 10 * k)},${f(ly - h - 40 * k)} L${f(x)},${f(ly - h - 40 * k)}`, 5 * k, "#6b5641") + `<path d="M${f(x)},${f(ly - h - 40 * k)} V${f(ly - h - 6 * k)}" ${ink(1.6)}/>`;
  }
  const bodyD = `M${f(x - w)},${f(ly - h * 0.2)} Q${f(x - w)},${f(ly - h)} ${f(x)},${f(ly - h)} Q${f(x + w)},${f(ly - h)} ${f(x + w)},${f(ly - h * 0.2)} Q${f(x + w)},${f(ly)} ${f(x)},${f(ly)} Q${f(x - w)},${f(ly)} ${f(x - w)},${f(ly - h * 0.2)} Z`;
  return (
    post +
    glow(nextId(c, "lantern"), x, ly - h * 0.5, 80 * k, lit, 0.6) +
    `<rect x="${f(x - w * 0.55)}" y="${f(ly - h - 8 * k)}" width="${f(w * 1.1)}" height="${f(8 * k)}" rx="2" fill="${INK}"/>` +
    `<path d="${bodyD}" fill="#fbe0a0" ${INK_LINE}/>` +
    `<path d="M${f(x)},${f(ly - h)} Q${f(x - w * 0.5)},${f(ly - h * 0.5)} ${f(x)},${f(ly)} M${f(x)},${f(ly - h)} Q${f(x + w * 0.5)},${f(ly - h * 0.5)} ${f(x)},${f(ly)}" ${ink(1.3)} fill="none"/>` +
    `<ellipse cx="${f(x)}" cy="${f(ly - h * 0.45)}" rx="${f(w * 0.35)}" ry="${f(h * 0.25)}" fill="${lit}" opacity="0.8"/>` +
    `<rect x="${f(x - w * 0.5)}" y="${f(ly)}" width="${f(w)}" height="${f(6 * k)}" rx="2" fill="${INK}"/>`
  );
};

const candle: Draw = (c, x, y, k) => {
  const h = 54 * k;
  const w = 12 * k;
  return (
    glow(nextId(c, "candle"), x, y - h - 12 * k, 70 * k, WARM, 0.6) +
    `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(26 * k)}" ry="${f(7 * k)}" fill="#c9b08a" ${INK_LINE}/>` +
    `<rect x="${f(x - w)}" y="${f(y - h)}" width="${f(w * 2)}" height="${f(h)}" rx="${f(3 * k)}" fill="${PAPER}" ${INK_LINE}/>` +
    `<path d="M${f(x - w)},${f(y - h + 6 * k)} q${f(w * 0.4)},${f(10 * k)} ${f(w * 0.8)},0" fill="none" stroke="#e6ddc6" stroke-width="3" stroke-linecap="round"/>` +
    `<path d="M${f(x)},${f(y - h)} v${f(-6 * k)}" ${ink(1.6)}/>` +
    `<path d="M${f(x)},${f(y - h - 26 * k)} C${f(x + 9 * k)},${f(y - h - 14 * k)} ${f(x + 7 * k)},${f(y - h - 4 * k)} ${f(x)},${f(y - h - 4 * k)} C${f(x - 7 * k)},${f(y - h - 4 * k)} ${f(x - 9 * k)},${f(y - h - 14 * k)} ${f(x)},${f(y - h - 26 * k)} Z" fill="${WARM}" ${ink(1.8)}/>` +
    `<path d="M${f(x)},${f(y - h - 16 * k)} c3,4 3,8 0,9 c-3,-1 -3,-5 0,-9 Z" fill="#fff4d6"/>`
  );
};

const teacup: Draw = (c, x, y, k) => {
  const w = 32 * k;
  const cup = `M${f(x - w)},${f(y - 28 * k)} H${f(x + w)} Q${f(x + w - 2)},${f(y - 2 * k)} ${f(x)},${f(y - 2 * k)} Q${f(x - w + 2)},${f(y - 2 * k)} ${f(x - w)},${f(y - 28 * k)} Z`;
  return (
    `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(w * 1.4)}" ry="${f(6 * k)}" fill="${PAPER}" ${INK_LINE}/>` +
    `<path d="M${f(x + w - 2)},${f(y - 22 * k)} q${f(15 * k)},0 ${f(13 * k)},${f(9 * k)} q${f(-2 * k)},${f(8 * k)} ${f(-17 * k)},${f(6 * k)}" fill="none" ${INK_LINE}/>` +
    `<path d="${cup}" fill="${PAPER}" ${INK_LINE}/>` +
    shade(cup, nextId(c, "cup"), INK, 0.12) +
    `<ellipse cx="${f(x)}" cy="${f(y - 28 * k)}" rx="${f(w - 2)}" ry="${f(4 * k)}" fill="#b58a5e" ${ink(1.6)}/>` +
    [-12, 1, 13].map((dx, q) => `<circle cx="${f(x + dx * k)}" cy="${f(y - 14 * k - (q % 2) * 3)}" r="${f(2.6 * k)}" fill="${c.p.accent}"/>`).join("") +
    `<path d="M${f(x - 8 * k)},${f(y - 36 * k)} q-8,-12 0,-22 q8,-10 0,-22 M${f(x + 8 * k)},${f(y - 38 * k)} q-8,-10 0,-18" fill="none" stroke="${c.p.night ? "#d8d2c0" : PAPER}" stroke-width="2.4" stroke-linecap="round" opacity="0.9"/>`
  );
};

const openBook: Draw = (c, x, y, k) => {
  const w = 58 * k;
  const h = 34 * k;
  const left = `M${f(x)},${f(y - h * 0.15)} C${f(x - w * 0.4)},${f(y - h * 0.5)} ${f(x - w * 0.8)},${f(y - h * 0.35)} ${f(x - w)},${f(y - h * 0.2)} L${f(x - w)},${f(y + h * 0.5)} C${f(x - w * 0.8)},${f(y + h * 0.35)} ${f(x - w * 0.4)},${f(y + h * 0.2)} ${f(x)},${f(y + h * 0.55)} Z`;
  const right = `M${f(x)},${f(y - h * 0.15)} C${f(x + w * 0.4)},${f(y - h * 0.5)} ${f(x + w * 0.8)},${f(y - h * 0.35)} ${f(x + w)},${f(y - h * 0.2)} L${f(x + w)},${f(y + h * 0.5)} C${f(x + w * 0.8)},${f(y + h * 0.35)} ${f(x + w * 0.4)},${f(y + h * 0.2)} ${f(x)},${f(y + h * 0.55)} Z`;
  let lines = "";
  for (let l = 0; l < 4; l++) {
    const ly = y - h * 0.12 + l * 7 * k;
    lines += `<path d="M${f(x - w * 0.82)},${f(ly)} q${f(w * 0.35)},-4 ${f(w * 0.68)},2 M${f(x + w * 0.14)},${f(ly + 2)} q${f(w * 0.35)},-6 ${f(w * 0.68)},-2" stroke="#b9b2a0" stroke-width="1.5" fill="none" stroke-linecap="round"/>`;
  }
  return (
    `<path d="M${f(x - w - 4)},${f(y + h * 0.58)} L${f(x + w + 4)},${f(y + h * 0.58)} L${f(x + w + 4)},${f(y + h * 0.3)} L${f(x - w - 4)},${f(y + h * 0.3)} Z" fill="${c.p.accent}" ${INK_LINE}/>` +
    `<path d="${left}" fill="${PAPER}" ${INK_LINE}/><path d="${right}" fill="${PAPER}" ${INK_LINE}/>` +
    lines +
    leaf(x + w * 0.5, y + h * 0.05, 70, 18 * k, c.p.leaf, 1.4) +
    `<path d="M${f(x)},${f(y - h * 0.15)} L${f(x + 4)},${f(y + h * 0.9)}" stroke="${c.p.accent2}" stroke-width="3" stroke-linecap="round"/>`
  );
};

const letter: Draw = (c, x, y, k, i) => {
  const w = 46 * k;
  const h = 32 * k;
  const tilt = (i % 2 ? 1 : -1) * 6;
  return (
    `<g transform="rotate(${tilt} ${f(x)} ${f(y - h / 2)})">` +
    `<rect x="${f(x - w)}" y="${f(y - h * 1.6)}" width="${f(w * 2)}" height="${f(h * 1.6)}" rx="4" fill="${PAPER}" ${INK_LINE}/>` +
    `<path d="M${f(x - w)},${f(y - h * 1.6)} L${f(x)},${f(y - h * 0.6)} L${f(x + w)},${f(y - h * 1.6)}" fill="${mix(PAPER, "#d8cfb8", 0.5)}" ${INK_LINE}/>` +
    `<circle cx="${f(x)}" cy="${f(y - h * 0.62)}" r="${f(8 * k)}" fill="${c.p.accent2}" ${ink(1.8)}/>` +
    leaf(x - w * 0.55, y - h * 0.4, -30, 16 * k, c.p.leaf, 1.3) +
    `</g>`
  );
};

const umbrella: Draw = (c, x, y, k, i) => {
  const w = 62 * k;
  const top = y - 110 * k;
  const col = i % 2 ? c.p.accent2 : c.p.accent;
  let canopy = `M${f(x - w)},${f(top + 34 * k)} Q${f(x - w)},${f(top - 10 * k)} ${f(x)},${f(top - 12 * k)} Q${f(x + w)},${f(top - 10 * k)} ${f(x + w)},${f(top + 34 * k)}`;
  const scallops = 4;
  for (let s = scallops; s > 0; s--) {
    const x0 = x - w + (s * 2 * w) / scallops;
    const x1 = x - w + ((s - 1) * 2 * w) / scallops;
    canopy += ` Q${f((x0 + x1) / 2)},${f(top + 22 * k)} ${f(x1)},${f(top + 34 * k)}`;
  }
  canopy += " Z";
  return (
    `<path d="M${f(x)},${f(top - 12 * k)} V${f(y - 12 * k)} q0,${f(14 * k)} ${f(-12 * k)},${f(12 * k)}" fill="none" ${ink(3)}/>` +
    `<path d="${canopy}" fill="${col}" ${INK_LINE}/>` +
    `<path d="M${f(x)},${f(top - 12 * k)} Q${f(x - w * 0.35)},${f(top + 6 * k)} ${f(x - w * 0.5)},${f(top + 34 * k)} M${f(x)},${f(top - 12 * k)} Q${f(x + w * 0.35)},${f(top + 6 * k)} ${f(x + w * 0.5)},${f(top + 34 * k)}" fill="none" ${ink(1.6)}/>` +
    `<path d="M${f(x)},${f(top - 12 * k)} v${f(-8 * k)}" ${ink(2.4)}/>`
  );
};

const SUBJECT: Partial<Record<Subject, Draw>> = {
  tree,
  sapling,
  flowers,
  nest,
  fox,
  boat,
  "paper boat": paperBoat,
  lighthouse,
  mountain,
  kite,
  stones,
  house,
  door,
  bench,
  lantern,
  candle: smallOnPedestal(candle),
  teacup: smallOnPedestal(teacup),
  "open book": smallOnPedestal(openBook),
  letter: smallOnPedestal(letter),
  umbrella,
};

/** How big each subject is drawn when alone. */
const SIZE: Partial<Record<Subject, number>> = {
  tree: 1,
  mountain: 1,
  lighthouse: 1,
  house: 1.25,
  door: 1.1,
  sapling: 1.1,
  flowers: 1.2,
  boat: 1.1,
  "paper boat": 1.2,
  fox: 1.45,
  stones: 1.3,
  lantern: 1.25,
  candle: 1.4,
  teacup: 1.6,
  "open book": 1.7,
  letter: 1.35,
  umbrella: 1.1,
  bench: 1.1,
  kite: 1,
};

const COUNT: Record<ArtSpec["arrangement"], number> = { alone: 1, together: 2, reaching: 2, apart: 2, gathered: 3 };

/** Where each member of the group stands, and how big. */
function places(c: Ctx, focusX: number): [number, number, number][] {
  const { r } = c;
  const base = SIZE[c.spec.subject] ?? 1;
  const y = c.baseY;
  const big = base >= 1 && ["tree", "mountain", "lighthouse", "house", "door"].includes(c.spec.subject);
  switch (c.spec.arrangement) {
    case "together": {
      const gap = c.spec.subject === "fox" ? 64 : big ? 70 : 46 * base;
      return [
        [focusX - gap / 2, y + 2, base * 0.82],
        [focusX + gap / 2, y, base * 0.74],
      ];
    }
    case "reaching": {
      const gap = big ? 150 : 120;
      return [
        [200 - gap / 2 + range(r, -8, 8), y + 2, base * 0.8],
        [200 + gap / 2 + range(r, -8, 8), y, base * 0.8],
      ];
    }
    case "apart":
      return [
        [focusX < 200 ? 100 : 300, y + 4, base * 0.85],
        [focusX < 200 ? 318 : 82, y - 22, base * 0.5],
      ];
    case "gathered": {
      const gap = big ? 92 : 64 * base;
      return [
        [focusX - gap, y + 4, base * 0.7],
        [focusX, y, base * 0.82],
        [focusX + gap, y + 6, base * 0.66],
      ];
    }
    default:
      return [[focusX, y, base]];
  }
}

/** A thread of light or a line of small dots between two that reach for each other. */
function reachingLine(c: Ctx, pts: [number, number, number][]): string {
  if (c.spec.arrangement !== "reaching" || pts.length < 2) return "";
  const [a, b] = pts;
  const lift = ["lantern", "candle", "house", "door"].includes(c.spec.subject) ? 70 : 50;
  const ya = a[1] - lift;
  const yb = b[1] - lift;
  const mid = Math.min(ya, yb) - 46;
  let dots = "";
  for (let t = 0.15; t < 0.9; t += 0.1) {
    const x = (1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * ((a[0] + b[0]) / 2) + t * t * b[0];
    const y = (1 - t) * (1 - t) * ya + 2 * (1 - t) * t * mid + t * t * yb;
    const rr = 2.2 + Math.sin(t * Math.PI) * 1.8;
    dots += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(rr * 2.6)}" fill="${WARM}" opacity="0.18"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(rr)}" fill="#fbe3a4" ${ink(1)}/>`;
  }
  return dots;
}

function subjectLayer(c: Ctx, focusX: number): string {
  const s = c.spec.subject;
  if (s === "birds") return birdGroup(c, focusX);
  if (s === "nest") return nest(c, focusX, c.baseY, 1, 0);
  if (s === "bridge") return bridgeScene(c);
  if (s === "path") return pathScene(c, focusX);
  if (s === "moon") {
    if (!c.sky || (c.spec.setting !== "water" && c.spec.setting !== "shore")) return "";
    const x = c.sky.x;
    const y = c.horizon + 14;
    return [0, 1, 2, 3].map((i) => `<path d="M${f(x - 34 + i * 8)},${f(y + i * 16)} h${f(68 - i * 16)}" stroke="#f1e7c9" stroke-width="3" stroke-linecap="round" opacity="${f(0.8 - i * 0.15)}"/>`).join("");
  }
  const draw = SUBJECT[s] ?? tree;
  const pts = places(c, focusX);
  // Far ones first, so near ones overlap them.
  const order = pts.map((pt, i) => ({ pt, i })).sort((a, b) => a.pt[1] - b.pt[1]);
  let out = "";
  if (c.spec.light === "glow" && !["lantern", "candle", "door", "house"].includes(s)) {
    const cx = pts.reduce((sum, p) => sum + p[0], 0) / pts.length;
    out += glow(nextId(c, "subjectglow"), cx, c.baseY - 60, 150, WARM, 0.32);
  }
  out += order.map(({ pt: [x, y, k], i }) => draw(c, x, y, k, i)).join("");
  return out + reachingLine(c, pts);
}

// ---- accents and weather ----------------------------------------------------------

function accents(c: Ctx, list: Accent[]): string {
  const { r, p } = c;
  let out = "";
  // Inside, only drifting petals or leaves belong; the rest live outdoors.
  const here = c.spec.setting === "indoors" ? list.filter((a) => a === "petals" || a === "falling leaves") : list;
  for (const a of here) {
    switch (a) {
      case "falling leaves":
        for (let i = 0; i < 8; i++) out += leaf(range(r, 30, 370), range(r, 60, c.baseY), range(r, -70, 70), range(r, 14, 22), pick(r, [p.accent, "#d9985f", "#e8b54a", p.leaf]));
        break;
      case "petals":
        for (let i = 0; i < 12; i++) {
          const x = range(r, 20, 380);
          const y = range(r, 40, c.baseY);
          out += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="4" ry="2.4" transform="rotate(${f(range(r, 0, 180))} ${f(x)} ${f(y)})" fill="${pick(r, ["#f2c4c0", "#d98e8a", PAPER])}" ${ink(0.9)}/>`;
        }
        break;
      case "fireflies":
        for (let i = 0; i < 10; i++) {
          const x = range(r, 30, 370);
          const y = range(r, c.horizon - 40, c.baseY + 30);
          out += `<circle cx="${f(x)}" cy="${f(y)}" r="7" fill="${WARM}" opacity="0.25"/><circle cx="${f(x)}" cy="${f(y)}" r="2.2" fill="#fff2c4"/>`;
        }
        break;
      case "birds in flight":
        if (c.spec.subject === "birds") break;
        for (let i = 0; i < 3; i++) {
          const x = range(r, 60, 340);
          const y = range(r, 50, Math.max(70, c.horizon - 90));
          const w = range(r, 6, 10);
          out += `<path d="M${f(x - w)},${f(y)} q${f(w / 2)},-${f(w / 2)} ${f(w)},0 q${f(w / 2)},-${f(w / 2)} ${f(w)},0" fill="none" ${ink(1.8)}/>`;
        }
        break;
      case "butterflies":
        for (let i = 0; i < 2; i++) {
          const x = range(r, 70, 330);
          const y = range(r, c.horizon - 30, c.baseY - 40);
          const col = i ? p.accent2 : "#e8b54a";
          out += `<g transform="translate(${f(x)},${f(y)}) rotate(${f(range(r, -20, 20))})"><ellipse cx="-6" cy="-3" rx="6" ry="8" fill="${col}" ${ink(1.3)}/><ellipse cx="6" cy="-3" rx="6" ry="8" fill="${col}" ${ink(1.3)}/><ellipse cx="-4" cy="6" rx="4" ry="5" fill="${col}" ${ink(1.3)}/><ellipse cx="4" cy="6" rx="4" ry="5" fill="${col}" ${ink(1.3)}/><path d="M0,-8 V10" ${ink(1.8)}/></g>`;
        }
        break;
      case "tall grass":
        for (let i = 0; i < 18; i++) {
          const left = i % 2 === 0;
          const x = left ? range(r, -5, 70) : range(r, 330, 405);
          const base = S + 6;
          const hh = range(r, 60, 130);
          const lean = range(r, -14, 14);
          out += `<path d="M${f(x)},${base} Q${f(x + lean / 2)},${f(base - hh / 2)} ${f(x + lean)},${f(base - hh)}" stroke="${pick(r, p.night ? ["#2c4435", "#35503f"] : ["#5f8a5a", "#7fa36f", "#4f7348"])}" stroke-width="${f(range(r, 2.4, 3.6))}" stroke-linecap="round" fill="none"/>`;
        }
        break;
      case "flowers":
        if (c.spec.setting !== "indoors" && c.spec.setting !== "water") out += ditsy(c, c.baseY + 8, 394, 12);
        break;
      default:
        break;
    }
  }
  return out;
}

function weather(c: Ctx): string {
  const { r } = c;
  switch (c.spec.weather) {
    case "rain": {
      let out = "";
      for (let i = 0; i < 46; i++) {
        const x = range(r, -10, S);
        const y = range(r, -10, S - 20);
        out += `<path d="M${f(x)},${f(y)} l-3,11" stroke="${c.p.night ? "#8aa3aa" : "#6e8f98"}" stroke-width="1.6" stroke-linecap="round" opacity="0.75"/>`;
      }
      return out;
    }
    case "snow": {
      let out = "";
      for (let i = 0; i < 50; i++) out += `<circle cx="${f(range(r, 0, S))}" cy="${f(range(r, 0, S))}" r="${f(range(r, 1.2, 3))}" fill="${PAPER}" opacity="0.95"/>`;
      return out;
    }
    case "mist":
      return [0, 1, 2]
        .map((i) => `<path d="M-20,${f(c.horizon - 10 + i * 34)} q100,-14 220,0 t240,0" stroke="${c.p.night ? "#8e9ea0" : PAPER}" stroke-width="${f(18 - i * 3)}" stroke-linecap="round" fill="none" opacity="${f(0.45 - i * 0.08)}"/>`)
        .join("");
    case "wind":
      return [0, 1, 2]
        .map((i) => {
          const y = 70 + i * 44 + range(r, -10, 10);
          const x = range(r, 40, 180);
          return `<path d="M${f(x)},${f(y)} q60,-14 120,0 q30,8 24,-12 q-6,-14 -20,-4" stroke="${c.p.night ? "#8e9ea0" : PAPER}" stroke-width="3" stroke-linecap="round" fill="none" opacity="0.85"/>`;
        })
        .join("");
    default:
      return "";
  }
}

function rays(c: Ctx): string {
  if (!c.sky || c.p.night) return "";
  const { x, y } = c.sky;
  let out = "";
  for (let i = 0; i < 5; i++) {
    const a = Math.PI * (0.25 + i * 0.13) * (x < 200 ? 1 : -1) + (x < 200 ? 0 : Math.PI);
    const len = 420;
    const spread = 0.05;
    out += `<path d="M${f(x)},${f(y)} L${f(x + Math.cos(a - spread) * len)},${f(y + Math.sin(a - spread) * len)} L${f(x + Math.cos(a + spread) * len)},${f(y + Math.sin(a + spread) * len)} Z" fill="#fff4d0" opacity="0.16"/>`;
  }
  return out;
}

// ---- putting it together ----------------------------------------------------------

const FILTERS = (uid: string, seed: number) => `
<filter id="wobble-${uid}" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="${seed}"/><feDisplacementMap in="SourceGraphic" scale="2.4"/></filter>
<filter id="grain-${uid}"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="${seed + 3}" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0.29  0 0 0 0 0.23  0 0 0 0 0.17  0 0 0 0.55 0"/></filter>
<radialGradient id="vignette-${uid}" cx="0.5" cy="0.45" r="0.75"><stop offset="0.6" stop-color="#2b3326" stop-opacity="0"/><stop offset="1" stop-color="#2b3326" stop-opacity="0.14"/></radialGradient>`;

const FOCUS_X = { left: 128, center: 200, right: 272 } as const;

/** Keeps a spec to what the renderer can draw well (a boat needs water, a lighthouse a shore). */
export function settle(spec: ArtSpec): ArtSpec {
  const s = { ...spec, accents: spec.accents.slice(0, 3) };
  const onWater = ["boat", "paper boat"].includes(s.subject);
  if (onWater && s.setting !== "water" && s.setting !== "shore") s.setting = "water";
  if (!onWater && s.subject !== "lighthouse" && s.subject !== "moon" && s.subject !== "birds" && s.setting === "water") s.setting = "shore";
  if (s.subject === "lighthouse") s.setting = "shore";
  if (s.subject === "kite") s.setting = s.setting === "shore" ? "shore" : "sky";
  if (s.setting === "sky" && !["kite", "birds", "moon"].includes(s.subject)) s.setting = "hills";
  const small = ["teacup", "candle", "open book", "letter"].includes(s.subject);
  if (s.setting === "indoors" && !small && !["lantern", "flowers", "birds", "fox"].includes(s.subject)) s.setting = "meadow";
  if (["bridge", "path", "mountain", "house", "door", "bench", "tree"].includes(s.subject) && s.setting === "shore") s.setting = "meadow";
  if (["bridge", "path", "moon", "nest", "mountain"].includes(s.subject)) s.arrangement = s.subject === "path" || s.subject === "nest" ? s.arrangement : s.subject === "moon" ? (s.arrangement === "apart" ? "apart" : "alone") : "alone";
  if (s.weather === "stars" && s.setting === "indoors") s.weather = "clear";
  return s;
}

/** Returns a complete SVG document. */
export function drawArt(o: ArtOptions): string {
  const r = seeded(o.seed);
  const spec = settle(o.art);
  const uid = (Math.floor(r() * 1e9) >>> 0).toString(36);
  const p = palette({ ...o, art: spec });
  const c: Ctx = { r, p, o, spec, uid, baseY: 328, horizon: 250, sky: null, n: COUNT[spec.arrangement] };
  const focusX = FOCUS_X[spec.focus] + range(r, -10, 10);

  const land = setting(c);
  let outside = skyLayer(c);
  const overcast = spec.weather === "rain" || spec.weather === "snow" || spec.weather === "mist" || spec.weather === "clouds";
  if ((p.night && !overcast) || spec.weather === "stars") outside += stars(c, p.night ? 22 : 10, c.horizon - 40);
  if (spec.accents.includes("rainbow") && !p.night) outside += rainbow(c);
  if (spec.subject === "moon") outside += bigMoon(c, focusX);
  else outside += sunOrMoon(c, focusX);
  if (spec.light === "rays") outside += rays(c);
  const cloudCount = spec.weather === "clouds" ? 3 : spec.weather === "rain" ? 4 : spec.weather === "clear" ? pick(r, [0, 1, 1]) : 1;
  outside += clouds(c, cloudCount);

  let body: string;
  if (spec.setting === "indoors") {
    // The world outside, seen through the window, then the room.
    const view = outside + `<path d="${ridge(r, 190, 18, 3)}" fill="${p.far}" ${INK_LINE}/><path d="${ridge(r, 222, 10, 2)}" fill="${p.mid}" ${INK_LINE}/>` + weather(c);
    const rm = room(c, view);
    body = rm.back + subjectLayer(c, focusX) + accents(c, spec.accents);
  } else {
    body = outside + land.back + subjectLayer(c, focusX) + land.front + accents(c, spec.accents) + weather(c);
  }
  if (spec.light === "dim") body += `<rect width="${S}" height="${S}" fill="${p.sky[0]}" opacity="0.14"/>`;

  const seed = Math.floor(r() * 1000);
  const title = describeArt(spec, o.timeOfDay);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="1024" height="1024" role="img"><title>${escapeXml(title)}</title><defs>${FILTERS(uid, seed)}</defs><g filter="url(#wobble-${uid})">${body}</g><rect width="${S}" height="${S}" fill="url(#vignette-${uid})"/><rect width="${S}" height="${S}" filter="url(#grain-${uid})" opacity="0.2"/></svg>`;
}

// ---- words for the picture --------------------------------------------------------

const NOUN: Record<Subject, [string, string]> = {
  tree: ["a tree", "trees"],
  sapling: ["a seedling", "seedlings"],
  flowers: ["flowers", "clusters of flowers"],
  birds: ["a small bird", "birds"],
  nest: ["a nest", "a nest"],
  fox: ["a sleeping fox", "foxes curled up"],
  boat: ["a small sailboat", "small sailboats"],
  "paper boat": ["a paper boat", "paper boats"],
  lighthouse: ["a lighthouse", "lighthouses"],
  bridge: ["a bridge over a stream", "a bridge over a stream"],
  path: ["a path", "paths"],
  mountain: ["a mountain", "mountains"],
  moon: ["a large moon", "a large moon"],
  kite: ["a kite", "kites"],
  stones: ["a cairn of balanced stones", "cairns of balanced stones"],
  house: ["a small house", "small houses"],
  door: ["an open door", "open doors"],
  bench: ["a bench under a tree", "benches"],
  lantern: ["a glowing lantern", "glowing lanterns"],
  candle: ["a lit candle", "lit candles"],
  teacup: ["a cup of tea", "cups of tea"],
  "open book": ["an open book", "open books"],
  letter: ["a sealed letter", "letters"],
  umbrella: ["an open umbrella", "open umbrellas"],
};

const COUNT_WORD = ["", "", "two", "three"];

const PLACE: Record<ArtSpec["setting"], string> = {
  meadow: "in a meadow",
  hills: "among rolling hills",
  water: "on still water",
  shore: "by the sea",
  mountains: "below the mountains",
  garden: "in a garden",
  indoors: "on a windowsill",
  sky: "in an open sky",
};

/** A plain sentence describing the drawing, for alt text. */
export function describeArt(spec: ArtSpec, timeOfDay?: TimeOfDay | null): string {
  const s = settle(spec);
  const n = COUNT[s.arrangement];
  const [one, many] = NOUN[s.subject];
  let subject: string;
  if (s.subject === "nest") subject = n === 1 ? "a nest with one egg" : `a nest with ${COUNT_WORD[n]} eggs`;
  else if (s.subject === "path") subject = s.arrangement === "apart" ? "a path that forks in two" : s.arrangement === "together" ? "two paths that meet" : "a winding path";
  else if (s.subject === "birds" && s.arrangement === "reaching") subject = "a small bird on a branch as another flies toward it";
  else subject = n === 1 ? one : `${COUNT_WORD[n]} ${many}`;
  const how = s.arrangement === "together" ? " side by side" : s.arrangement === "apart" ? " far apart" : s.arrangement === "reaching" && s.subject !== "birds" ? " with a thread of light between them" : "";
  const when = timeOfDay === "night" ? " at night" : timeOfDay === "evening" ? " at dusk" : timeOfDay === "dawn" ? " at dawn" : "";
  const wx = { rain: " in the rain", snow: " in falling snow", mist: " in soft mist", wind: " in the wind", stars: " under the stars", clouds: "", clear: "" }[s.weather];
  const extras = s.accents.filter((a) => a !== "tall grass").map((a) => (a === "flowers" ? "small flowers" : a));
  const tail = extras.length ? `, with ${extras.join(" and ")}` : "";
  const text = `A hand-drawn picture of ${subject}${how} ${PLACE[s.setting]}${when}${wx}${tail}.`;
  return text.replace(/\s+/g, " ");
}

function escapeXml(s: string): string {
  return s.replace(/[<>&"']/g, (ch) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[ch]!);
}
