import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { readFileSync, existsSync } from "node:fs";
import { app, AUTH_REQUIRED } from "./app.js";
import { illustrationsAvailable } from "./illustrate.js";
import { reflectionsAvailable } from "./reflect.js";
import { remindersAvailable, startReminders } from "./reminders.js";
import { accountsConfigured } from "./supabaseAdmin.js";

/** The long-lived server: the API, the built app, and the daily reminder clock. */

const PROD = process.env.NODE_ENV === "production";

// ---- the built app ----------------------------------------------------------
if (PROD && existsSync("dist/index.html")) {
  const index = readFileSync("dist/index.html", "utf8");
  app.use(
    "/assets/*",
    async (c, next) => {
      await next();
      c.header("Cache-Control", "public, max-age=31536000, immutable");
    },
    serveStatic({ root: "./dist" }),
  );
  app.use(
    "/sw.js",
    async (c, next) => {
      await next();
      c.header("Cache-Control", "no-cache");
    },
    serveStatic({ root: "./dist" }),
  );
  app.use("*", serveStatic({ root: "./dist" }));
  // A missing picture or file is a plain "not found", not the app: a page of the app is never an image.
  for (const dir of ["art", "splash", "icons", "licenses", "assets"]) app.get(`/${dir}/*`, (c) => c.notFound());
  // Everything else is a page of the single-page app.
  app.get("*", (c) => c.html(index));
}

const port = Number(process.env.PORT || 8787);
serve({ fetch: app.fetch, port }, () => {
  console.log(`Leaves server on http://localhost:${port}`);
  console.log(`  reflections: ${reflectionsAvailable() ? "on" : "off (starter library)"}`);
  console.log(`  illustrations: ${illustrationsAvailable() ? "on" : "off (drawn vignettes)"}`);
  console.log(`  reminders: ${remindersAvailable() ? "on" : "off"}`);
  console.log(`  accounts: ${accountsConfigured() ? "on" : "off"}${AUTH_REQUIRED ? " (AI for signed-in people only)" : ""}`);
});
startReminders();
