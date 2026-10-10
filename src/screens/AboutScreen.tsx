import { InstallCard } from "../components/InstallCard";
import { LeafIcon, LockIcon, TreeIcon } from "../components/icons";
import { cloudConfigured } from "../lib/auth";
import { go, useRouteState } from "../lib/router";
import { SettingsBar } from "./SettingsScreen";

/** Opened from the first screen, Back returns there; otherwise to Settings. */
function useBack(): { back: string; label: string; from?: string } {
  const from = useRouteState<{ from?: string }>()?.from;
  return from === "/welcome" ? { back: "/welcome", label: "Back", from } : { back: "/settings", label: "Settings" };
}

/** Who made Leaves, why, and how to use it. */
export function AboutScreen() {
  const nav = useBack();
  return (
    <>
      <SettingsBar back={nav.back} label={nav.label} />
      <main className="page page--prose" id="main">
        <h1 className="page-title">About Leaves</h1>
        <p className="lead">
          Leaves is a quiet place to write about your day. There is no feed, no followers, no likes and no streaks. It's a notebook,
          not a stage.
        </p>

        <h2 className="section-title">Why we made it</h2>
        <p>
          Social feeds are built to hold on to your attention. A journal gives it back. We made Leaves as a small counterweight to the
          endless scroll: a private log you keep for yourself, at your own pace, that isn't meant to be performed or shared.
        </p>
        <p>
          Each page you finish is returned to you with a small drawing and a thought to keep, and every blank page opens with a new one,
          from voices across the world and across time: Ptahhotep and Plato, Confucius and Zhuangzi, the Buddha, Thiruvalluvar, Saadi,
          Montaigne, Marx, Simone de Beauvoir, Camus, Neruda, and philosophers writing today. Browse them all under Voices.
        </p>

        <h2 className="section-title">Who we are</h2>
        <p>
          Leaves was made by philosophy students and alumni of San Francisco State University and the University of California,
          Berkeley, who came together to build a more intimate, private kind of journal. It is an independent project.
        </p>

        <h2 className="section-title">How it works</h2>
        <ol className="steps">
          <li>
            <LeafIcon size={22} />
            <span>Write about your day, as much or as little as you like. Add a photo if you want to.</span>
          </li>
          <li>
            <span className="steps__finish" aria-hidden="true">
              Finish
            </span>
            <span>Tap Finish. Your page is dated and saved, and nothing is lost if you close the app mid-sentence.</span>
          </li>
          <li>
            <TreeIcon size={22} />
            <span>Receive a small drawing and a reflection made for that page. Your tree grows one leaf.</span>
          </li>
          <li>
            <LockIcon size={22} />
            <span>Come back to reread, search and remember. Everything stays private unless you choose to share a page.</span>
          </li>
        </ol>

        <h2 className="section-title">Keep it on your home screen</h2>
        <InstallCard />

        <div className="about__links">
          <button type="button" className="button button--soft" onClick={() => go("/privacy", { from: nav.from })}>
            Your privacy
          </button>
          <button type="button" className="button button--soft" onClick={() => go("/settings/ai")}>
            How AI is used
          </button>
        </div>

        <h2 className="section-title">Credits</h2>
        <p>
          The drawings, leaves, tree and launch pictures were made for Leaves. Words are set in Literata, Nunito and Atkinson
          Hyperlegible, which are free to use under the SIL Open Font License.{" "}
          <a href="/licenses/fonts.txt" target="_blank" rel="noreferrer">
            Read the licenses
          </a>
          .
        </p>
      </main>
    </>
  );
}

/** The privacy promise, in plain words. */
export function PrivacyScreen() {
  const nav = useBack();
  return (
    <>
      <SettingsBar back={nav.back} label={nav.label} />
      <main className="page page--prose" id="main">
        <h1 className="page-title">Your privacy</h1>
        <p className="lead">Your entries are yours. Only you can read them. We never sell them, share them, or use them for ads.</p>

        <ul className="promises">
          <li>
            <h2>No ads, no trackers</h2>
            <p>Leaves has no advertising, no analytics and no third-party trackers. Nothing about what you write is measured.</p>
          </li>
          <li>
            <h2>Saved on your device first</h2>
            <p>
              Every word is saved on your device as you type, so it works offline and nothing is lost. Each account has its own
              notebook, so people who share a phone or laptop never see each other's pages. Signing out removes your pages from the
              device.
            </p>
          </li>
          {cloudConfigured ? (
            <li>
              <h2>A private backup</h2>
              <p>
                When you sign in, your entries are backed up to your own account, so you can read them on any device. Every account's
                entries are kept apart by the database itself, travel over encrypted connections, and are stored encrypted. We never
                read your entries.
              </p>
            </li>
          ) : null}
          <li>
            <h2>AI only for the page you just finished</h2>
            <p>
              To write your reflection, the words of that one entry are sent from our server to an AI service that doesn't train on
              them. We don't keep or log your words. Turn on Keep from AI for any page, and nothing from it is sent anywhere.
            </p>
          </li>
          <li>
            <h2>Photos and places</h2>
            <p>
              Location and camera details are removed from photos before they're saved. A place is only added when you ask for it,
              and only its name is kept, never your coordinates.
            </p>
          </li>
          <li>
            <h2>Sharing is always your choice</h2>
            <p>
              Nothing leaves your notebook unless you share it. Shared links are hidden from search engines and can be turned off any
              time.
            </p>
          </li>
          <li>
            <h2>Take it with you, or delete it</h2>
            <p>
              Back up everything as one ZIP of your entries, photos and captions whenever you like, and restore it later. A deleted
              entry waits in Recently deleted for 30 days, in case you change your mind, and any link you shared stops working at once.
              Delete everything, or your whole account, from Settings with one confirmation.
            </p>
          </li>
        </ul>

        <div className="about__links">
          <button type="button" className="button button--soft" onClick={() => go("/settings/ai")}>
            How AI is used
          </button>
        </div>
      </main>
    </>
  );
}
