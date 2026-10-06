import { lazy, Suspense, useEffect, useState } from "react";
import { clearReloadFlag, ErrorBoundary } from "./components/ErrorBoundary";
import { ToastHost } from "./components/Toast";
import { BreathingLeaf } from "./components/BreathingLeaf";
import { mountAnnouncer } from "./lib/announce";
import { purgeExpiredTrash, sweepBlobs } from "./lib/db";
import { resumePending } from "./lib/pipeline";
import { match, navigate, usePath, useRouteState } from "./lib/router";
import { useEntry, useMeta, useSettings } from "./lib/store";
import { startAccount } from "./lib/session";
import { applyAppearance } from "./lib/theme";
import { EditEntry, Write } from "./screens/Write";
import { EntryScreen } from "./screens/EntryScreen";
import { EntriesScreen } from "./screens/EntriesScreen";
import { Welcome } from "./screens/Welcome";

// Screens away from the daily path load on demand, keeping the first load small.
const ReflectionsScreen = lazy(() => import("./screens/ReflectionsScreen").then((m) => ({ default: m.ReflectionsScreen })));
const SettingsScreen = lazy(() => import("./screens/SettingsScreen").then((m) => ({ default: m.SettingsScreen })));
const HowAIScreen = lazy(() => import("./screens/SettingsScreen").then((m) => ({ default: m.HowAIScreen })));
const AccountScreen = lazy(() => import("./screens/AccountScreen").then((m) => ({ default: m.AccountScreen })));
const VoicesScreen = lazy(() => import("./screens/VoicesScreen").then((m) => ({ default: m.VoicesScreen })));
const VoiceScreen = lazy(() => import("./screens/VoicesScreen").then((m) => ({ default: m.VoiceScreen })));
const TrashScreen = lazy(() => import("./screens/TrashScreen").then((m) => ({ default: m.TrashScreen })));
const DeletedEntry = lazy(() => import("./screens/TrashScreen").then((m) => ({ default: m.DeletedEntry })));
const AboutScreen = lazy(() => import("./screens/AboutScreen").then((m) => ({ default: m.AboutScreen })));
const PrivacyScreen = lazy(() => import("./screens/AboutScreen").then((m) => ({ default: m.PrivacyScreen })));
const ResetPasswordScreen = lazy(() => import("./screens/AccountScreen").then((m) => ({ default: m.ResetPasswordScreen })));
const SharedEntryPage = lazy(() => import("./screens/SharedPages").then((m) => ({ default: m.SharedEntryPage })));
const PublicPageView = lazy(() => import("./screens/SharedPages").then((m) => ({ default: m.PublicPageView })));

const TITLES: Record<string, string> = {
  "/": "Write",
  "/entries": "Entries",
  "/reflections": "Reflections",
  "/voices": "Voices",
  "/settings": "Settings",
  "/settings/ai": "How AI is used",
  "/settings/account": "Account",
  "/settings/trash": "Recently deleted",
  "/reset-password": "New password",
  "/about": "About",
  "/privacy": "Your privacy",
  "/welcome": "Leaves",
};

function EntryRoute({ id, edit }: { id: string; edit?: boolean }) {
  const [entry, ready] = useEntry(id);
  const state = useRouteState<{ justFinished?: boolean }>();
  if (!ready) return <main className="page" aria-busy="true" />;
  if (!entry) {
    return (
      <main className="page" id="main">
        <p className="empty">This entry isn't here anymore.</p>
        <button type="button" className="button" onClick={() => navigate("/entries", { replace: true })}>
          Entries
        </button>
      </main>
    );
  }
  if (entry.deletedAt) return <DeletedEntry entry={entry} />;
  if (entry.status === "draft") return <Write draftId={entry.id} />;
  if (edit) return <EditEntry entry={entry} />;
  return <EntryScreen entry={entry} justFinished={!!state?.justFinished} />;
}

/** Public pages never touch the person's local data. */
function isPublicPath(path: string) {
  return path.startsWith("/s/") || path.startsWith("/p/");
}

export function App() {
  const path = usePath();
  const [settings, settingsReady] = useSettings();
  const [meta, metaReady] = useMeta();
  const welcomed = metaReady ? meta.welcomed : null;
  const storageStuck = useStorageWatch(metaReady);

  // Theme, text size, font and motion. Warm evenings is re-checked each minute.
  useEffect(() => {
    if (!settingsReady) return;
    applyAppearance(settings);
    const timer = window.setInterval(() => applyAppearance(settings), 60_000);
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const rm = matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => applyAppearance(settings);
    mq.addEventListener("change", onChange);
    rm.addEventListener("change", onChange);
    return () => {
      window.clearInterval(timer);
      mq.removeEventListener("change", onChange);
      rm.removeEventListener("change", onChange);
    };
  }, [settings, settingsReady]);

  useEffect(() => {
    mountAnnouncer();
    if (isPublicPath(location.pathname)) return;
    void resumePending();
    void startAccount();
    // Housekeeping, never urgent: remove what has been in Recently deleted past its 30 days, and photos taken out long ago.
    const tidy = window.setTimeout(() => {
      void purgeExpiredTrash().catch(() => undefined);
      void sweepBlobs().catch(() => undefined);
    }, 8000);
    const online = () => void resumePending();
    window.addEventListener("online", online);
    return () => {
      window.clearTimeout(tidy);
      window.removeEventListener("online", online);
    };
  }, []);

  useEffect(() => {
    if (!isPublicPath(path)) document.title = TITLES[path] ? `${TITLES[path]} · Leaves` : "Leaves";
  }, [path]);

  // First launch shows one screen, then never again. Checked once, when the app opens.
  useEffect(() => {
    const here = location.pathname;
    if (metaReady && !meta.welcomed && !isPublicPath(here) && !["/welcome", "/reset-password", "/about", "/privacy"].includes(here)) {
      navigate("/welcome", { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metaReady]);

  let screen: React.ReactNode;
  let params: Record<string, string> | null;
  if ((params = match("/s/:token", path))) screen = <SharedEntryPage token={params.token} />;
  else if ((params = match("/p/:handle", path))) screen = <PublicPageView handle={params.handle} />;
  else if (welcomed === null && storageStuck) screen = <StorageStuck />;
  else if (welcomed === null) screen = <main className="page page--center"><BreathingLeaf /></main>;
  else if (path === "/welcome") screen = <Welcome />;
  else if (path === "/") screen = <Write key="write" />;
  else if ((params = match("/draft/:id", path))) screen = <Write key={params.id} draftId={params.id} />;
  else if (path === "/entries") screen = <EntriesScreen />;
  else if (path === "/reflections") screen = <ReflectionsScreen />;
  else if (path === "/voices") screen = <VoicesScreen />;
  else if ((params = match("/voices/:id", path))) screen = <VoiceScreen key={params.id} id={params.id} />;
  else if ((params = match("/entry/:id/edit", path))) screen = <EntryRoute id={params.id} edit />;
  else if ((params = match("/entry/:id", path))) screen = <EntryRoute key={params.id} id={params.id} />;
  else if (path === "/settings") screen = <SettingsScreen />;
  else if (path === "/settings/ai") screen = <HowAIScreen />;
  else if (path === "/settings/account") screen = <AccountScreen />;
  else if (path === "/settings/trash") screen = <TrashScreen />;
  else if (path === "/reset-password") screen = <ResetPasswordScreen />;
  else if (path === "/about") screen = <AboutScreen />;
  else if (path === "/privacy") screen = <PrivacyScreen />;
  else
    screen = (
      <main className="page" id="main">
        <p className="empty">There's nothing here.</p>
        <button type="button" className="button" onClick={() => navigate("/", { replace: true })}>
          Write
        </button>
      </main>
    );

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className="screen" key={path.split("/")[1] || "write"}>
        <ErrorBoundary key={path}>
          <Suspense fallback={<main className="page page--center" aria-busy="true" />}>{screen}</Suspense>
        </ErrorBoundary>
      </div>
      <ToastHost />
    </>
  );
}

/** Storage almost always opens at once. If it hasn't after a while, say so and offer a way out. */
function useStorageWatch(ready: boolean) {
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    if (ready) {
      clearReloadFlag();
      return;
    }
    const t = window.setTimeout(() => setStuck(true), 8000);
    return () => window.clearTimeout(t);
  }, [ready]);
  return stuck && !ready;
}

function StorageStuck() {
  return (
    <main className="page page--center" id="main">
      <p className="empty">Leaves is waiting for this device's storage. Close any other Leaves tabs, then open it again.</p>
      <button type="button" className="button button--primary" onClick={() => location.reload()}>
        Open again
      </button>
    </main>
  );
}
