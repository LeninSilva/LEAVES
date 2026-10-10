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

Without any AI keys, Leaves reads each entry on the device to choose its mood and its picture, and gives it a quote from the library of voices (285 thoughts from 137 voices at the time of writing, browsable under Voices; the Voices screen always shows the live counts). When accounts are on, AI features only answer signed-in people, so a stranger who finds your address can't run up your AI bill.

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
npm test          # unit tests: dates, finishing, notebooks per account, quotations, reflection checks, the tree, share-card layout, theme choice, launch screens and icons, reminders, server retry
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
- **Drawings:** each entry gets a scene: a central image chosen as a metaphor for what the entry is about (two birds together, a forked path, a cairn of stones), how many there are and how they relate, a setting, weather, light and small accents (`shared/constants.ts`). Claude chooses it when AI is on; otherwise `src/illustration/understand.ts` reads the entry on the device. `src/illustration/art.ts` draws it as a vector picture in the house style, with the mood choosing the colors and the entry id seeding the details. Preview with `npx tsx scripts/preview-art.mts out.png`. This is the picture under **Drawn for each entry** (see below), and the stand-in whenever a shipped picture can't be shown.
- **Dates:** Times are stored in UTC with the IANA zone and formatted with `Intl.DateTimeFormat`. An entry that runs past midnight is filed under the day it began. Tests cover midnight, travel and DST.
- **Offline and updates:** see [Offline and updates](#offline-and-updates) below.

## Artwork, pictures, tree and sharing

### Where the artwork lives

All of it is static files in `public/`, copied as they are into the build. Only what the app shows is shipped; the artwork pack's own preview pages, overview images and prompts are not.

| Folder | What | Format |
| --- | --- | --- |
| `public/icons/` | App icons: 192 and 512, separate maskable 192 and 512, and the 180 Apple touch icon | PNG |
| `public/splash/` | iPhone launch screens, one per phone size and theme (20 files) | PNG |
| `public/art/backgrounds/` | The welcome backdrop (1170 x 2532) and the 1290 x 2796 source for the launch screens, daylight and lamplight | WebP |
| `public/art/grass/` | The grass strip along the foot of the Write screen, both themes | SVG |
| `public/art/leaves/` | The ten mood leaves that drift down the page, both themes | SVG |
| `public/art/entries-simple/` | **Quiet** pictures: 24 subjects, both themes | SVG |
| `public/art/entries/` | **Storybook** pictures: 24 subjects, both themes, at 256 (lists) and 512 (the entry) | WebP |
| `public/licenses/` | The open-font licenses, linked from About | text |

`public/art/` is deliberately not `public/assets/`: the service worker reserves `/assets/` for the build's hashed files. The tree's trunk and branches are not files at all; they are drawn from outline data in `src/components/treeStages.ts`, which `scripts/extract-tree-stages.mts` makes from the supplied tree pictures.

The launch screens are made from the 1290 x 2796 backgrounds, cropped to each phone's exact pixel size, by `npx tsx scripts/make-splash.mts`. It also rewrites the `apple-touch-startup-image` tags in `index.html`. `src/launch.test.ts` checks that every tag points at a PNG of exactly the size its media query describes, that light and dark are not swapped, and that the manifest icons are the sizes they claim. iPhone chooses a launch screen by the phone's own light or dark setting, since the app isn't running yet to read its theme choice.

### Entry pictures

**Settings > Entry pictures** has three choices, kept per person (and synced with an account):

- **Quiet** (the default): a simple line drawing.
- **Storybook**: a painted scene.
- **Drawn for each entry**: the picture the app makes from what was written (the drawing described under *Drawings*, or an AI picture when that is turned on).

Each entry's **subject** (one of the 24 in `shared/constants.ts`: tree, sapling, flowers, birds, nest, fox, boat, paper boat, lighthouse, bridge, path, mountain, moon, kite, stones, house, door, bench, lantern, candle, teacup, open book, letter, umbrella) is the one chosen after Finish: by Claude when AI is on, or on the device by `src/illustration/understand.ts`, which reads the words and prefers a thing the entry names (a boat, a bridge, a lantern) over a general metaphor. Entries from before scenes existed have only a motif, and `sceneFromMotif` turns that into a subject. The same entry always gets the same picture, in each theme. Nothing about the entry is sent anywhere to choose a picture.

Fallbacks, in order: if a shipped picture can't load (offline, never opened), the entry's own drawing is shown; if an entry has no scene yet, the waiting leaf shows rather than a wrong picture. Because the drawing is always made on the device, there is always something to show, and **Draw again** (offered only under *Drawn for each entry*) still works.

Lists use the 256-pixel Storybook thumbnails and the Quiet SVG; the entry itself uses the 512-pixel painting. Quiet pictures are cached from the first visit. Choosing Storybook also fetches the paintings for the subjects your entries use, in both themes, so they work offline.

### Themes

**Settings > Theme** is Automatic, Daylight or Lamplight. Daylight and Lamplight are always obeyed, even inside the Warm evenings window; only Automatic follows the phone and the Warm evenings hours (`src/lib/theme.ts`, tested in `src/lib/theme.test.ts`). The first paint reads the saved choice from `localStorage`, so an evening never flashes bright. Pictures, grass, leaves, the welcome backdrop and share cards all follow the theme in use, and change at once when it changes.

### The tree

One leaf for every finished entry, oldest first, in that entry's mood color (`src/components/Tree.tsx`). The trunk and branches are the supplied growth pictures, drawn larger as the tree fills:

| Entries | Stage | Entries | Stage |
| --- | --- | --- | --- |
| 0 | bare | 25 to 48 | 6 |
| 1 | 2 | 49 to 80 | 7 |
| 2 to 5 | 3 | 81 to 120 | 8 |
| 6 to 12 | 4 | 121 or more | 8, filling further |
| 13 to 24 | 5 | | |

The pictures' own leaves are used only as places to hang a real leaf, so the count is always exact. A leaf never moves when a newer entry arrives, and the places are shared between stages, so growing a stage adds leaves without rearranging the old ones. Past 120, each extra leaf takes one of the full tree's places with a small, repeatable offset, drifting slightly outward, so the tree keeps filling and nothing is stacked or lost. The newest leaf unfurls once. The tests in `src/components/Tree.test.ts` cover every stage boundary and a tree of 1,500.

### Sharing a card

**More > Share** (or **Share** after Finish) shows a live preview of an image card, 1080 x 1350, in the colors of either theme. It is built from the writer's own title, the words they choose to show (editable), the date, the entry's picture in the chosen style (or their photo with its caption), and the reflection with its author and source. Place appears only if turned on. Nothing is sent anywhere to make it: the card is drawn on the device and only leaves when the person taps **Share as an image**, which opens the phone's share sheet, or saves a PNG where there isn't one (or if the sheet fails). Cancelling the sheet does nothing. Links and public pages are separate buttons that need an account; they show the same picture the entry shows.

Layout is planned in `src/lib/cardLayout.ts`, which shortens the writer's own words first, then a caption, and never a quotation: a long quotation is set a little smaller instead. The tests check every quotation in the library fits whole.

### Offline and updates

A small service worker (`src/sw.js`, with its lists injected at build by `vite.config.ts`) keeps the app working offline:

- The app, its fonts and the previous release's files are kept, so a page that's open during an update never breaks, and the app opens for any address.
- Grass, the 20 drifting leaves and all 48 Quiet pictures are cached from the first visit in an art cache named by a hash of `public/art`, so a release that doesn't change a picture doesn't download it again, and old art and shell caches are removed. Storybook paintings are cached as they're opened or chosen. Anything that is a page of the app rather than the file asked for is never cached as a picture, and the servers answer a missing file under `/art/`, `/splash/`, `/icons/`, `/licenses/` or `/assets/` with a plain not found.
- When a new release takes over an open page, a quiet message offers **Reload** instead of interrupting what is being written; drafts are saved as they are typed and survive the reload. An installed app looks for a new release when it comes back into view. A page that still asks for a file from an old release reloads once into the new one.

## Privacy

- Nothing leaves the device unless the person chooses it. Place is off in shares by default. Photos are re-encoded on the device, which removes all EXIF data, including location.
- Only the entry being reflected on is sent, from the server, to the AI service. For images, only a one-sentence nature scene is sent. **Keep from AI** entries are never sent anywhere.
- There are no ads, trackers or analytics. **Back up everything** makes a ZIP with Markdown, photos with captions, and a copy Leaves can restore from. Deleted entries wait 30 days in **Recently deleted**. **Delete everything** removes local and cloud data.

## Decisions worth knowing

- **Image model:** Claude doesn't generate images, so illustrations use a pluggable server provider (`server/illustrate.ts`, OpenAI by default). Without one, the drawn SVG vignette is used.
- **Sign-in:** Supabase Auth with email and password, Google and Apple. The buttons shown come from what's turned on in Supabase, so none lead nowhere.
- **A notebook per account:** each account's pages live in their own IndexedDB database on the device (`src/lib/db.ts`, `src/lib/session.ts`). Switching accounts reloads the app, so no screen ever holds one person's pages while someone else is signed in.
- **Reminders:** They use web push. On iPhone this works once Leaves is added to the Home Screen.

## How this was checked

On the final build, in Chromium with a phone's screen size and touch (browser emulation, not a physical phone):

- `npx tsc -b`: no errors. `npm test`: 103 tests in 14 files, all passing.
- Browser runs against `npm run build && npm start`: photos, captions, deleting, restoring, backup and restore, 22 of 22; every visible button and link, 51 of 51; entry pictures in both styles and themes, the welcome backdrop, fallbacks and the tree at 0, 1, 2, 5, 6, 12, 13, 24, 25, 48, 49, 80, 81, 120, 121 and 150 entries, 41 of 41; sharing (download, native share, cancel, share-sheet failure, offline), 15 of 15; offline use, art caching and release updates, 16 of 16; the update message with half a sentence typed, which survived the reload.
- Accessibility: axe-core (WCAG 2.0 to 2.2 A and AA plus best practice) on 90 screens and dialogs across light and dark and all three picture styles, 0 violations and no duplicate ids. No horizontal scrolling at 320 and 360 pixels wide with the largest text.

Not tested: a physical phone, Safari on iOS (so the launch screens, the share sheet, installing to the Home Screen and push reminders are unverified), signing in and the cloud features (no Supabase project was available), and AI replies.

## Limits

- The supplied Quiet pictures are fixed per subject and theme, so two entries about the same subject show the same picture; **Drawn for each entry** is the one that is unique to each entry. In Lamplight, a few Quiet pictures (the letter, the open book and the path, for example) are dark on dark and faint; they are the supplied artwork, unchanged.
- The launch screen follows the phone's light or dark setting, not Leaves's own theme choice.
- The tree has no leaf-by-leaf interaction; tapping a leaf does nothing.
- The browser checks are not part of this repository.

## Credits

- Icons, launch screens, grass, leaves, tree growth pictures, and the Quiet and Storybook pictures: artwork supplied for Leaves.
- Type: Literata (The Literata Project Authors), Nunito (The Nunito Project Authors) and Atkinson Hyperlegible (Braille Institute of America), under the SIL Open Font License 1.1, served from the `@fontsource` packages. The licenses are in `public/licenses/fonts.txt` and linked from About.
