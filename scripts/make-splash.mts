// Makes the iPhone launch screens in public/splash from the welcome backgrounds in
// public/art/backgrounds, one PNG per device size and theme, and rewrites the matching
// <link> tags in index.html. Run it again after changing the backgrounds:
//   npx tsx scripts/make-splash.mts
import { mkdir, readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

/** Portrait phones: width and height in CSS pixels, and the pixel ratio. */
export const DEVICES = [
  { name: "iPhone SE, 8", w: 375, h: 667, ratio: 2 },
  { name: "iPhone X, XS, 11 Pro, 12 mini, 13 mini", w: 375, h: 812, ratio: 3 },
  { name: "iPhone XR, 11", w: 414, h: 896, ratio: 2 },
  { name: "iPhone XS Max, 11 Pro Max", w: 414, h: 896, ratio: 3 },
  { name: "iPhone 12, 13, 14", w: 390, h: 844, ratio: 3 },
  { name: "iPhone 12 Pro Max, 13 Pro Max, 14 Plus", w: 428, h: 926, ratio: 3 },
  { name: "iPhone 14 Pro, 15, 15 Pro, 16", w: 393, h: 852, ratio: 3 },
  { name: "iPhone 14 Pro Max, 15 Plus, 15 Pro Max, 16 Plus", w: 430, h: 932, ratio: 3 },
  { name: "iPhone 16 Pro", w: 402, h: 874, ratio: 3 },
  { name: "iPhone 16 Pro Max", w: 440, h: 956, ratio: 3 },
] as const;

const THEMES = [
  { name: "daylight", scheme: "light" },
  { name: "lamplight", scheme: "dark" },
] as const;

if (process.argv[1]?.endsWith("make-splash.mts")) {
  await mkdir("public/splash", { recursive: true });
  const links: string[] = [];
  for (const d of DEVICES) {
    for (const t of THEMES) {
      const width = d.w * d.ratio;
      const height = d.h * d.ratio;
      const file = `${t.name}-${width}x${height}.png`;
      // Anchored at the bottom so the grass always shows; a wider phone loses a little sky.
      await sharp(`public/art/backgrounds/${t.name}-1290x2796.webp`)
        .resize(width, height, { fit: "cover", position: "bottom" })
        .png({ compressionLevel: 9, palette: false })
        .toFile(`public/splash/${file}`);
      links.push(
        `    <link rel="apple-touch-startup-image" href="/splash/${file}" media="(device-width: ${d.w}px) and (device-height: ${d.h}px) and (-webkit-device-pixel-ratio: ${d.ratio}) and (orientation: portrait) and (prefers-color-scheme: ${t.scheme})" />`,
      );
    }
  }
  const html = await readFile("index.html", "utf8");
  const block = `    <!-- splash:start (made by scripts/make-splash.mts) -->\n${links.join("\n")}\n    <!-- splash:end -->`;
  const next = /<!-- splash:start[\s\S]*?<!-- splash:end -->/.test(html)
    ? html.replace(/ *<!-- splash:start[\s\S]*?<!-- splash:end -->/, block)
    : html.replace(/( *<link rel="apple-touch-startup-image"[^\n]*\n)+/, block + "\n");
  await writeFile("index.html", next);
  console.log(`${links.length} launch screens written`);
}
