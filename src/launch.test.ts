// @vitest-environment node
import { readFileSync, existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import sharp from "sharp";

const html = readFileSync("index.html", "utf8");
const manifest = JSON.parse(readFileSync("public/manifest.webmanifest", "utf8")) as { icons: { src: string; sizes: string; type: string; purpose: string }[] };

describe("iPhone launch screens", () => {
  const links = [...html.matchAll(/<link rel="apple-touch-startup-image" href="([^"]+)" media="([^"]+)"/g)].map((m) => ({ href: m[1], media: m[2] }));

  it("has a light and a dark picture for each phone size", () => {
    expect(links.length).toBeGreaterThanOrEqual(20);
    const sizes = new Map<string, Set<string>>();
    for (const l of links) {
      const key = l.media.replace(/ and \(prefers-color-scheme: \w+\)/, "");
      const scheme = l.media.match(/prefers-color-scheme: (\w+)/)![1];
      sizes.set(key, (sizes.get(key) ?? new Set()).add(scheme));
    }
    for (const [key, schemes] of sizes) expect([...schemes].sort(), key).toEqual(["dark", "light"]);
  });

  it("uses a PNG exactly the size of the screen the media query describes", async () => {
    for (const l of links) {
      const w = Number(l.media.match(/device-width: (\d+)px/)![1]);
      const h = Number(l.media.match(/device-height: (\d+)px/)![1]);
      const ratio = Number(l.media.match(/pixel-ratio: (\d+)/)![1]);
      const file = `public${l.href}`;
      expect(existsSync(file), file).toBe(true);
      const meta = await sharp(file).metadata();
      expect(meta.format, file).toBe("png");
      expect([meta.width, meta.height], file).toEqual([w * ratio, h * ratio]);
      expect(l.href, "named for its size").toContain(`${w * ratio}x${h * ratio}`);
      const theme = l.media.includes("scheme: dark") ? "lamplight" : "daylight";
      expect(l.href, "light and dark pictures are not swapped").toContain(theme);
    }
  });
});

describe("icons", () => {
  it("lists real PNG icons of the sizes it claims, with separate maskable ones", async () => {
    const purposes = manifest.icons.map((i) => `${i.purpose}:${i.sizes}`).sort();
    expect(purposes).toEqual(["any:192x192", "any:512x512", "maskable:192x192", "maskable:512x512"]);
    for (const icon of manifest.icons) {
      const meta = await sharp(`public${icon.src}`).metadata();
      expect(icon.type).toBe("image/png");
      expect(`${meta.width}x${meta.height}`, icon.src).toBe(icon.sizes);
    }
  });

  it("has an Apple touch icon of 180 pixels", async () => {
    const href = html.match(/rel="apple-touch-icon" href="([^"]+)"/)![1];
    const meta = await sharp(`public${href}`).metadata();
    expect([meta.width, meta.height]).toEqual([180, 180]);
  });
});

describe("artwork", () => {
  it("has every subject in both themes and both styles", () => {
    const subjects = ["tree", "sapling", "flowers", "birds", "nest", "fox", "boat", "paper-boat", "lighthouse", "bridge", "path", "mountain", "moon", "kite", "stones", "house", "door", "bench", "lantern", "candle", "teacup", "open-book", "letter", "umbrella"];
    for (const theme of ["daylight", "lamplight"]) {
      for (const s of subjects) {
        expect(existsSync(`public/art/entries-simple/${theme}/${s}.svg`), `${theme} ${s} quiet`).toBe(true);
        expect(existsSync(`public/art/entries/${theme}/${s}-256.webp`), `${theme} ${s} 256`).toBe(true);
        expect(existsSync(`public/art/entries/${theme}/${s}-512.webp`), `${theme} ${s} 512`).toBe(true);
      }
    }
  });

  it("matches the subjects the app draws", async () => {
    const { SUBJECTS } = await import("../shared/constants");
    const { subjectSlug } = await import("./lib/art");
    for (const s of SUBJECTS) expect(existsSync(`public/art/entries-simple/daylight/${subjectSlug(s)}.svg`), s).toBe(true);
    expect(SUBJECTS).toHaveLength(24);
  });

  it("has the ten leaves, and the grass, for each theme", async () => {
    const { LEAF_FILES, leafUrl } = await import("./lib/art");
    expect(LEAF_FILES).toHaveLength(10);
    for (const theme of ["daylight", "lamplight"] as const) {
      expect(existsSync(`public/art/grass/${theme}.svg`), `${theme} grass`).toBe(true);
      for (let i = 0; i < 10; i++) expect(existsSync(`public${leafUrl(theme, i)}`), leafUrl(theme, i)).toBe(true);
    }
  });
});
