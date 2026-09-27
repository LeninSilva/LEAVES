# Leaves

A calm, simple journal. Open to a blank page, write about your day, add a photo if you like, and tap Finish. Each entry is stamped with its date and time, gets a small drawing made for it and one short reflection from a philosopher, writer, poet or tradition, and grows one leaf on your tree.

It is a phone-first, installable web app (PWA) that also works well in a laptop browser, and it keeps working offline.

## Quick start

```bash
npm install
cp .env.example .env        # optional: add keys to turn on AI and the cloud
npm run dev:server          # the API server on :8787
npm run dev                 # the app on :5173 (proxies /api to the server)
```

With no keys at all, Leaves still works fully on the device. Entries get a drawing made on the phone and a quote from the starter library.

| To turn on | Set |
| --- | --- |
| Reflections, titles and opening thoughts (Claude) | `ANTHROPIC_API_KEY` (optional `REFLECTION_MODEL`, default `claude-opus-5`) |
| AI illustrations | `IMAGE_PROVIDER=openai`, `OPENAI_API_KEY` (default model `gpt-image-1`) |
| Accounts, backup and sync, share links, public page | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, then run `supabase/migrations/001_leaves.sql` |
| Daily reminder (web push) | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` (`npx web-push generate-vapid-keys`) |

In Supabase, turn on **Anonymous sign-ins** (so people can write before signing in), **Email** (magic link), and optionally **Apple** and **Google**, plus **manual identity linking** so an anonymous account can be linked on sign-in.

Production: `npm run build && npm start`. The server serves `dist/` and the API from one port.

```bash
npm test          # unit tests (dates, finishing, starter library, reflection checks, tree, reminders, server retry)
npm run typecheck
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
- **Sign-in:** Supabase has no passkeys, so sign-in offers an email link, Apple and Google. An anonymous account is created on first launch and linked when the person signs in.
- **Reminders:** They use web push. On iPhone this works once Leaves is added to the Home Screen.
