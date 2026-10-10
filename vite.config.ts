import type { Plugin } from "vite";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";

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
      const source = readFileSync("src/sw.js", "utf8")
        .replace("__PRECACHE__", JSON.stringify(precache))
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
