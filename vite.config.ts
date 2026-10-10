import type { Plugin } from "vite";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

function filesUnder(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? filesUnder(join(dir, e.name)) : [join(dir, e.name)]))
    .sort();
}

/**
 * The artwork in public/art. What every page needs (grass, drifting leaves, the Quiet pictures) is kept
 * offline from the first visit; the larger Storybook paintings are kept as they are opened. The version
 * changes only when a picture does, so a new release doesn't download the artwork again.
 */
function artwork() {
  const files = filesUnder("public/art");
  const hash = createHash("sha1");
  for (const f of files) hash.update(relative("public", f)).update(readFileSync(f));
  const urls = files.map((f) => "/" + relative("public", f).split("\\").join("/"));
  return {
    version: hash.digest("hex").slice(0, 10),
    essential: urls.filter((u) => !u.startsWith("/art/entries/") && !u.startsWith("/art/backgrounds/")),
  };
}

/**
 * Emits sw.js with the list of built assets so the whole app shell,
 * fonts included, is cached for offline writing.
 */
function serviceWorker(): Plugin {
  return {
    name: "leaves-service-worker",
    apply: "build",
    generateBundle(_options, bundle) {
      const assets = Object.keys(bundle)
        // Skip source maps, legacy .woff (browsers take .woff2) and the large HEIC
        // converter, which is fetched and cached the first time it's needed.
        .filter((name) => !name.endsWith(".map") && !name.endsWith(".woff") && !name.includes("heic2any"))
        .map((name) => "/" + name);
      const precache = ["/", "/manifest.webmanifest", "/icons/icon-192.png", ...assets];
      const version = Date.now().toString(36);
      const art = artwork();
      const source = readFileSync("src/sw.js", "utf8")
        .replace("__PRECACHE__", JSON.stringify(precache))
        .replace("__ART_VERSION__", art.version)
        .replace("__ART__", JSON.stringify(art.essential))
        .replace("__VERSION__", version);
      this.emitFile({ type: "asset", fileName: "sw.js", source });
    },
  };
}

export default defineConfig({
  plugins: [react(), serviceWorker()],
  server: {
    proxy: { "/api": "http://localhost:8787" },
  },
  build: {
    target: "es2022",
    assetsInlineLimit: 0,
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx", "shared/**/*.test.ts", "server/**/*.test.ts"],
  },
});
