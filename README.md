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

### 2. Put the app online

Leaves runs on **Vercel** (what leaves-pied.vercel.app uses) or on **Render**. Both are free to start.

The settings are the same on both:

| Name | What to paste |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon or publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role or secret key |
| `ANTHROPIC_API_KEY` | Optional. A key from [console.anthropic.com](https://console.anthropic.com) turns on AI reflections, titles, opening thoughts and AI-chosen pictures. |
| `IMAGE_PROVIDER` and `OPENAI_API_KEY` | Optional. Set `openai` and a key from [platform.openai.com](https://platform.openai.com) to use painted AI images instead of the drawn ones. |

**On Vercel:** open your project, then **Settings**, then **Environment Variables**, add the values above, and **Redeploy** (from **Deployments**, open the latest one and choose **Redeploy**). `vercel.json` already tells Vercel how to build Leaves, sends every page address to the app (so reloading never shows "not found"), and runs the server part as a Vercel function in `api/`. The daily reminder needs an always-on server, so it only works on Render.

**On Render:** click the button, sign in with GitHub, choose the `main` branch, paste the values, and click **Apply**. The free plan sleeps after a quiet spell, so the first visit after a break can take about a minute.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/LeninSilva/LEAVES)

Without any AI keys, Leaves reads each entry on the device to choose its mood and its picture, and gives it a quote from the library of voices (285 thoughts from 137 voices, browsable under Voices). When accounts are on, AI features only answer signed-in people, so a stranger who finds your address can't run up your AI bill.

### 3. Tell Supabase your address

In Supabase, open **Authentication**, then **URL Configuration**:

- **Site URL:** your address, like `https://leaves-pied.vercel.app`
- **Redirect URLs:** add the same address followed by `/**`, like `https://leaves-pied.vercel.app/**`

Without this step, the links in confirmation and password reset emails won't open Leaves.

### 4. Optional: Google and Apple

The Google and Apple buttons appear on their own once you turn them on in Supabase (**Authentication**, then **Sign In / Providers**).

- **Google** is free. Follow [Supabase's Google guide](https://supabase.com/docs/guides/auth/social-login/auth-google). You'll create an OAuth client in Google Cloud and paste its client ID and secret into Supabase.
- **Apple** needs a paid Apple Developer membership. Follow [Supabase's Apple guide](https://supabase.com/docs/guides/auth/social-login/auth-apple).

### 5. Open it on your phone

Open your address in your phone's browser and add it to your home screen. Settings also has an **Install** card: one tap on Android, and the two taps shown for iPhone.

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
- **Keeping pages safe:**
  - *Photos* are resized, stripped of location and camera data, and saved as files (not text) in IndexedDB, any number per entry, each with a caption. Changes to a page are always applied to its latest version, so words typed while a photo is processing can't be overwritten.
  - *Deleting* moves an entry to **Recently deleted** for 30 days (`src/lib/db.ts`, `src/screens/TrashScreen.tsx`); its share link is turned off at once, or when back online. A photo removed from an entry keeps its file for a week and is only removed if nothing uses it.
  - *Backups:* **Back up everything** (`src/lib/backup.ts`) writes one ZIP, a file at a time so large libraries fit, with readable Markdown, photos and captions, drawings, drafts and deleted entries. **Restore from a backup** reads it back without loading it whole and never overwrites newer changes.
  - Settings shows what is stored and asks the browser to protect it (`navigator.storage.persist()`).
  - Tests: `src/lib/safety.test.ts`.
- **Voices:** `shared/voices.ts` (who they were) and `shared/quotes/` (the lines, each with its source, translator and themes). The thought on a blank page is new each time the app is opened (`src/lib/thoughts.ts`), drawn without repeats; reflections prefer lines on what was written (`src/lib/themes.ts`). Add a line at the end of a module in `shared/quotes/`; never reorder, since "already seen" marks refer to positions. Exact quotations use a named public-domain translation, or the author's own words; anything else must be marked `after`. The tests check every line has a real voice, source, themes and a sensible length.
- **Sync:** `src/lib/sync.ts` pushes and pulls against Supabase: one row per entry and images in a private bucket, isolated by row-level security. Each entry is resolved last write wins.
- **After Finish:** `src/lib/pipeline.ts` runs the reflection and then the illustration in the background. It survives leaving the screen, waits while offline, and falls back to the starter library and the drawn vignette.
- **Server:** A Hono app (`server/`). It holds the AI keys, validates every model reply against a Zod schema plus rule checks (no recent or skipped voices, quotes under 40 words, no em dashes or exclamation points), retries once with the reason, and never logs entry text. Server-side fallbacks are on for Claude refusals (`fallbacks: "default"`).
- **Drawings:** each entry gets a scene: a central image chosen as a metaphor for what the entry is about (two birds together, a forked path, a cairn of stones), how many there are and how they relate, a setting, weather, light and small accents (`shared/constants.ts`). Claude chooses it when AI is on; otherwise `src/illustration/understand.ts` reads the entry on the device. `src/illustration/art.ts` draws it as a vector picture in the house style, with the mood choosing the colors and the entry id seeding the details. Preview with `npx tsx scripts/preview-art.mts out.png`. The tree (`src/components/Tree.tsx`) is a pure function of the leaves, so it looks the same on every visit.
- **Artwork pack:** the app icons (`public/icons/`), the launch screens iPhones show while Leaves opens (`public/art/backgrounds/`), the grass strip at the foot of the Write screen (`public/art/grass/`) and the ten drifting leaves in daylight and lamplight versions (`public/art/leaves/`) come from the supplied pack and are cached for offline use by `src/sw.js`. `src/lib/art.ts` picks the leaf set that matches the current theme. The pack's tree stages, per-mood entry illustrations and share-card backgrounds are not shipped; the app draws those itself, so each entry keeps its own picture. The `/art/` folder is deliberately not `/assets/`, which the service worker reserves for the build's hashed files.
- **Updates:** when a new release arrives while Leaves is open, a quiet message offers **Reload** instead of interrupting what is being written. An installed app checks for a new release when it comes back into view.
- **Dates:** Times are stored in UTC with the IANA zone and formatted with `Intl.DateTimeFormat`. An entry that runs past midnight is filed under the day it began. Tests cover midnight, travel and DST.
- **Offline and updates:** a small service worker (`src/sw.js`, with the precache list injected at build) caches the app and fonts, keeps the previous release's files so an open page never breaks mid-update, and opens the app for any address. A page that still asks for a file from an old release reloads once into the new one.

## Privacy

- Nothing leaves the device unless the person chooses it. Place is off in shares by default. Photos are re-encoded on the device, which removes all EXIF data, including location.
- Only the entry being reflected on is sent, from the server, to the AI service. For images, only a one-sentence nature scene is sent. **Keep from AI** entries are never sent anywhere.
- There are no ads, trackers or analytics. **Back up everything** makes a ZIP with Markdown, photos with captions, and a copy Leaves can restore from. Deleted entries wait 30 days in **Recently deleted**. **Delete everything** removes local and cloud data.

## Decisions worth knowing

- **Image model:** Claude doesn't generate images, so illustrations use a pluggable server provider (`server/illustrate.ts`, OpenAI by default). Without one, the drawn SVG vignette is used.
- **Sign-in:** Supabase Auth with email and password, Google and Apple. The buttons shown come from what's turned on in Supabase, so none lead nowhere.
- **A notebook per account:** each account's pages live in their own IndexedDB database on the device (`src/lib/db.ts`, `src/lib/session.ts`). Switching accounts reloads the app, so no screen ever holds one person's pages while someone else is signed in.
- **Reminders:** They use web push. On iPhone this works once Leaves is added to the Home Screen.
