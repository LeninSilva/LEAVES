import { Hono, type Context } from "hono";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { readFileSync, existsSync } from "node:fs";
import {
  IllustrateRequestSchema,
  OpeningThoughtRequestSchema,
  ReflectRequestSchema,
  type ServerConfig,
} from "../shared/schema";
import { reflect, openingThought, reflectionsAvailable } from "./reflect";
import { illustrate, illustrationsAvailable } from "./illustrate";
import { placeName } from "./place";
import { startReminders, remindersAvailable } from "./reminders";
import { accountsConfigured, supabaseAdmin, userFromToken } from "./supabaseAdmin";
import { RateLimiter } from "./rateLimit";

/**
 * The Leaves server. It holds the AI keys, calls AI services for one entry at
 * a time, and serves the built app. It never logs request bodies.
 */

const app = new Hono();
// With accounts set up, AI features are for signed-in people only, so a public
// address can't run up the AI bill. AUTH_REQUIRED=false opens them to guests.
const AUTH_REQUIRED = process.env.AUTH_REQUIRED ? process.env.AUTH_REQUIRED === "true" : accountsConfigured();
const PROD = process.env.NODE_ENV === "production";

const limits = {
  reflect: new RateLimiter(40, 60 * 60_000),
  illustrate: new RateLimiter(25, 60 * 60_000),
  opening: new RateLimiter(40, 60 * 60_000),
  place: new RateLimiter(60, 60 * 60_000),
};

function clientKey(c: Context, uid: string | null): string {
  if (uid) return `u:${uid}`;
  const fwd = c.req.header("x-forwarded-for")?.split(",")[0]?.trim();
  return `ip:${fwd || c.req.header("x-real-ip") || "local"}`;
}

async function identify(c: Context): Promise<{ uid: string | null; denied: boolean }> {
  const auth = c.req.header("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
  const uid = await userFromToken(token);
  return { uid, denied: AUTH_REQUIRED && !uid };
}

app.use("*", async (c, next) => {
  await next();
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Referrer-Policy", "no-referrer");
  c.header("Permissions-Policy", "geolocation=(self), camera=(self)");
  const path = c.req.path;
  if (path.startsWith("/api/")) c.header("Cache-Control", "no-store");
  // Shared entries are private links: keep them out of search engines.
  if (path.startsWith("/s/")) c.header("X-Robots-Tag", "noindex, nofollow, noarchive");
});

app.get("/api/config", (c) => {
  const config: ServerConfig = {
    reflections: reflectionsAvailable(),
    illustrations: illustrationsAvailable(),
    vapidPublicKey: remindersAvailable() ? process.env.VAPID_PUBLIC_KEY! : null,
    aiNeedsAccount: AUTH_REQUIRED,
  };
  return c.json(config);
});

app.post("/api/reflect", async (c) => {
  if (!reflectionsAvailable()) return c.json({ error: "unavailable" }, 503);
  const who = await identify(c);
  if (who.denied) return c.json({ error: "sign in" }, 401);
  if (!limits.reflect.take(clientKey(c, who.uid))) return c.json({ error: "slow down" }, 429);
  const parsed = ReflectRequestSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "bad request" }, 400);
  try {
    return c.json(await reflect(parsed.data));
  } catch {
    return c.json({ error: "unavailable" }, 502);
  }
});

app.post("/api/opening-thought", async (c) => {
  if (!reflectionsAvailable()) return c.json({ error: "unavailable" }, 503);
  const who = await identify(c);
  if (who.denied) return c.json({ error: "sign in" }, 401);
  if (!limits.opening.take(clientKey(c, who.uid))) return c.json({ error: "slow down" }, 429);
  const parsed = OpeningThoughtRequestSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "bad request" }, 400);
  try {
    return c.json(await openingThought(parsed.data));
  } catch {
    return c.json({ error: "unavailable" }, 502);
  }
});

app.post("/api/illustrate", async (c) => {
  if (!illustrationsAvailable()) return c.json({ error: "unavailable" }, 503);
  const who = await identify(c);
  if (who.denied) return c.json({ error: "sign in" }, 401);
  if (!limits.illustrate.take(clientKey(c, who.uid))) return c.json({ error: "slow down" }, 429);
  const parsed = IllustrateRequestSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "bad request" }, 400);
  try {
    return c.json(await illustrate(parsed.data));
  } catch {
    console.warn("illustrate failed");
    return c.json({ error: "unavailable" }, 502);
  }
});

app.get("/api/place", async (c) => {
  const who = await identify(c);
  if (who.denied) return c.json({ error: "sign in" }, 401);
  if (!limits.place.take(clientKey(c, who.uid))) return c.json({ error: "slow down" }, 429);
  const lat = Number(c.req.query("lat"));
  const lon = Number(c.req.query("lon"));
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return c.json({ name: null });
  }
  return c.json(await placeName(lat, lon));
});

/** Deletes the account itself. The app deletes the data first. */
app.post("/api/account/delete", async (c) => {
  const who = await identify(c);
  const sb = supabaseAdmin();
  if (!who.uid || !sb) return c.json({ error: "unavailable" }, 400);
  await sb.from("reminders").delete().eq("user_id", who.uid);
  const { error } = await sb.auth.admin.deleteUser(who.uid);
  if (error) return c.json({ error: "unavailable" }, 500);
  return c.json({ ok: true });
});

app.all("/api/*", (c) => c.json({ error: "not found" }, 404));

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
