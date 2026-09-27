# Leaves

A calm, simple journal. Open to a blank page, write about your day, add a photo if you like, and tap Finish. Each entry is stamped with its date and time, gets a small drawing made for it and one short reflection from a philosopher, writer, poet or tradition, and grows one leaf on your tree.

It is a phone-first, installable web app (PWA) that also works well in a laptop browser, and it keeps working offline.

## Put Leaves online

This takes about 20 minutes and is free. You'll need a GitHub account (you have one) and a web browser; a phone is fine but a laptop is easier.

### 1. Make the database (Supabase)

Supabase keeps each person's account and backup, with every account's pages kept apart.

1. Sign up at [supabase.com](https://supabase.com) and click **New project**. Pick any name and a strong database password.
2. When it's ready, open **SQL Editor**, click **New query**, paste everything in [`supabase/migrations/001_leaves.sql`](supabase/migrations/001_leaves.sql), and click **Run**.
3. Open **Project Settings**, then **API** (or **API Keys**). Keep this tab open. You'll copy three values from it:
   - the **Project URL**
   - the **anon** (or **publishable**) key
   - the **service_role** (or **secret**) key. Keep this one private.

Email and password sign-in is on by default. New people get an email to confirm their address before their first sign-in.

### 2. Put the app online (Render)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/LeninSilva/LEAVES)

1. Click the button above, sign in to Render with GitHub, and allow it to see this repository.
2. If it asks for a branch, choose the one with Leaves on it (`claude/leaves-journaling-app-bb1li5`, or `main` once it's merged).
3. Fill in the values it asks for:

| Name | What to paste |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon or publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role or secret key |
| `ANTHROPIC_API_KEY` | Optional. A key from [console.anthropic.com](https://console.anthropic.com) turns on reflections, titles and opening thoughts. |
| `IMAGE_PROVIDER` and `OPENAI_API_KEY` | Optional. Set `openai` and a key from [platform.openai.com](https://platform.openai.com) for AI illustrations. |

4. Click **Apply**. The first build takes a few minutes. Your address will look like `https://leaves-xxxx.onrender.com`.

Without the AI keys, every entry still gets a hand-drawn illustration and a quote from the starter library. When accounts are on, AI features only answer signed-in people, so a stranger who finds your address can't run up your AI bill. Guests who try Leaves without an account still get the drawings and the starter quotes.

The free Render plan sleeps after a quiet spell, so the first visit after a break can take about a minute. A paid plan stays awake.

### 3. Tell Supabase your address

In Supabase, open **Authentication**, then **URL Configuration**:

- **Site URL:** your Render address, like `https://leaves-xxxx.onrender.com`
- **Redirect URLs:** add `https://leaves-xxxx.onrender.com/**`

Without this step, the links in confirmation and password reset emails won't open Leaves.

### 4. Optional: Google and Apple

The Google and Apple buttons appear on their own once you turn them on in Supabase (**Authentication**, then **Sign In / Providers**).

- **Google** is free. Follow [Supabase's Google guide](https://supabase.com/docs/guides/auth/social-login/auth-google). You'll create an OAuth client in Google Cloud and paste its client ID and secret into Supabase.
- **Apple** needs a paid Apple Developer membership. Follow [Supabase's Apple guide](https://supabase.com/docs/guides/auth/social-login/auth-apple).

### 5. Open it on your phone

Open your Render address in your phone's browser and add it to your home screen.

- **Android (Chrome):** tap the menu, then **Add to Home screen** or **Install app**.
- **iPhone (Safari):** tap Share, then **Add to Home Screen**.

It then opens like an app, works offline, and saves each person's pages to their own account.

### Optional: the daily reminder

Run `npx web-push generate-vapid-keys` on a computer and add `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` and `VAPID_SUBJECT` (`mailto:` plus your email) in Render under **Environment**.

## Accounts

- People can sign in with **email and password**, **Google**, or **Apple**. Forgotten passwords are reset by email.
- **Each account has its own notebook**, in the cloud and on every device. Two people can share a phone or laptop and never see each other's pages. Signing out removes that person's pages from the device (after checking they're backed up), and signing back in brings them back.
- **Try it first:** someone can start writing without an account. Their pages stay on that device, and when they create an account, those pages move into it.

## Run it on your own computer

For working on the code. You'll need [Node.js](https://nodejs.org) 22 or newer.

```bash
npm install
cp .env.example .env        # optional: add keys to turn on AI and accounts
npm run dev:server          # the API server on :8787
npm run dev                 # the app on :5173 (proxies /api to the server)
```

With no keys at all, Leaves still works fully on the device.

```bash
npm test          # unit tests (dates, finishing, notebooks per account, starter library, reflection checks, tree, reminders, server retry)
npm run typecheck
npm run build && npm start   # production: one server for the app and the API
```

## How it is built

- **Client:** React and TypeScript with Vite. There is no UI framework. Styles are plain CSS driven by design tokens in `src/styles/tokens.css`, one source of truth for color, type, spacing, radius and motion.
- **Local first:** IndexedDB (`src/lib/db.ts`) is the source of truth on the device. Every keystroke is also written synchronously to `localStorage`, so a killed app never loses a word. Finishing is idempotent, and a late autosave can never turn a finished entry back into a draft.
- **Sync:** `src/lib/sync.ts` pushes and pulls against Supabase: one row per entry and images in a private bucket, isolated by row-level security. Each entry is resolved last write wins.
- **After Finish:** `src/lib/pipeline.ts` runs the reflection and then the illustration in the background. It survives leaving the screen, waits while offline, and falls back to the starter library and the drawn vignette.
- **Server:** A Hono app (`server/`). It holds the AI keys, validates every model reply against a Zod schema plus rule checks (no recent or skipped voices, quotes under 40 words, no em dashes or exclamation points), retries once with the reason, and never logs entry text. Server-side fallbacks are on for Claude refusals (`fallbacks: "default"`).
- **Drawings:** `src/illustration/drawn.ts` composes hand-drawn-style SVG scenes for all 12 motifs. The mood picks the colors, and the entry id seeds the variations. The tree (`src/components/Tree.tsx`) is a pure function of the leaves, so it looks the same on every visit.
- **Dates:** Times are stored in UTC with the IANA zone and formatted with `Intl.DateTimeFormat`. An entry that runs past midnight is filed under the day it began. Tests cover midnight, travel and DST.
- **Offline:** A small service worker (`src/sw.js`, with the precache list injected at build) caches the app shell and fonts.

## Privacy

- Nothing leaves the device unless the person chooses it. Place is off in shares by default. Photos are re-encoded on the device, which removes all EXIF data, including location.
- Only the entry being reflected on is sent, from the server, to the AI service. For images, only a one-sentence nature scene is sent. **Keep from AI** entries are never sent anywhere.
- There are no ads, trackers or analytics. **Export everything** makes a ZIP with Markdown and images. **Delete everything** removes local and cloud data.

## Decisions worth knowing

- **Image model:** Claude doesn't generate images, so illustrations use a pluggable server provider (`server/illustrate.ts`, OpenAI by default). Without one, the drawn SVG vignette is used.
- **Sign-in:** Supabase Auth with email and password, Google and Apple. The buttons shown come from what's turned on in Supabase, so none lead nowhere.
- **A notebook per account:** each account's pages live in their own IndexedDB database on the device (`src/lib/db.ts`, `src/lib/session.ts`). Switching accounts reloads the app, so no screen ever holds one person's pages while someone else is signed in.
- **Reminders:** They use web push. On iPhone this works once Leaves is added to the Home Screen.
