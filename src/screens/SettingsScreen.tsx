import { useState } from "react";
import { BackIcon } from "../components/icons";
import { Choice, NameList, Toggle } from "../components/Controls";
import { Confirm } from "../components/Dialog";
import { NavLink, TopBar } from "../components/TopBar";
import { showToast } from "../components/Toast";
import { cloudConfigured, useAuth } from "../lib/auth";
import { formatClock } from "../lib/dates";
import { saveSettings, wipeLocal } from "../lib/db";
import { disableReminder, enableReminder } from "../lib/reminder";
import { go, navigate } from "../lib/router";
import { downloadBlob, shareFile } from "../lib/share";
import { useSettings } from "../lib/store";
import { deleteRemoteEverything } from "../lib/sync";
import type { PlaceMode, TextSize, ThemeSetting, WritingFont } from "../lib/types";

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  const id = `g-${title.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <section className="settings-group" aria-labelledby={id}>
      <h2 id={id} className="section-title">
        {title}
      </h2>
      <div className="settings-group__body">{children}</div>
    </section>
  );
}

export function SettingsBar({ back = "/entries", label = "Entries" }: { back?: string; label?: string }) {
  return (
    <TopBar
      left={
        <NavLink to={back} icon={<BackIcon size={20} />}>
          {label}
        </NavLink>
      }
    />
  );
}

export function SettingsScreen() {
  const [s, ready] = useSettings();
  const auth = useAuth();
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [reminderNote, setReminderNote] = useState<string | null>(null);
  const set = (patch: Parameters<typeof saveSettings>[0]) => void saveSettings(patch);

  if (!ready) return <main className="page" aria-busy="true" />;

  const exportAll = async () => {
    setBusy("export");
    try {
      const { buildExport } = await import("../lib/exportZip");
      const blob = await buildExport();
      const name = `leaves-${new Date().toISOString().slice(0, 10)}.zip`;
      const res = await shareFile(blob, name, "Leaves export").catch(() => {
        downloadBlob(blob, name);
        return "downloaded" as const;
      });
      if (res === "downloaded") showToast("Your export is in your downloads.");
    } catch {
      showToast("Couldn't make the export. Try again.");
    } finally {
      setBusy(null);
    }
  };

  const wipe = async () => {
    setConfirmWipe(false);
    setBusy("wipe");
    try {
      await disableReminder();
      await deleteRemoteEverything();
    } catch {
      /* local data is still removed below */
    }
    await wipeLocal();
    setBusy(null);
    navigate("/welcome", { replace: true });
  };

  const setReminder = async (on: boolean, time = s.reminderTime ?? "21:00") => {
    setReminderNote(null);
    if (!on) {
      await disableReminder();
      set({ reminderTime: null });
      return;
    }
    const res = await enableReminder(time);
    if (res.ok) set({ reminderTime: time });
    else setReminderNote(res.message);
  };

  return (
    <>
      <SettingsBar />
      <main className="page page--settings" id="main">
        <h1 className="page-title">Settings</h1>

        <Group title="Appearance">
          <Choice<ThemeSetting>
            legend="Theme"
            value={s.theme}
            onChange={(theme) => set({ theme })}
            options={[
              { value: "automatic", label: "Automatic" },
              { value: "daylight", label: "Daylight" },
              { value: "lamplight", label: "Lamplight" },
            ]}
          />
          <Toggle
            label="Warm evenings"
            hint={`Switch to Lamplight from ${formatClock(s.warmEveningsFrom)} to ${formatClock(s.warmEveningsTo)}.`}
            checked={s.warmEvenings}
            onChange={(warmEvenings) => set({ warmEvenings })}
          />
          {s.warmEvenings ? (
            <div className="row row--times">
              <label className="field">
                <span className="field__label">From</span>
                <input className="input" type="time" value={s.warmEveningsFrom} onChange={(e) => e.target.value && set({ warmEveningsFrom: e.target.value })} />
              </label>
              <label className="field">
                <span className="field__label">To</span>
                <input className="input" type="time" value={s.warmEveningsTo} onChange={(e) => e.target.value && set({ warmEveningsTo: e.target.value })} />
              </label>
            </div>
          ) : null}
          <Choice<TextSize>
            legend="Text size"
            value={s.textSize}
            onChange={(textSize) => set({ textSize })}
            options={[
              { value: "small", label: "Small" },
              { value: "default", label: "Default" },
              { value: "large", label: "Large" },
              { value: "larger", label: "Larger" },
            ]}
          />
          <Choice<WritingFont>
            legend="Writing font"
            value={s.writingFont}
            onChange={(writingFont) => set({ writingFont })}
            options={[
              { value: "literata", label: "Literata" },
              { value: "atkinson", label: "Atkinson Hyperlegible" },
            ]}
          />
          <Toggle label="Reduce motion" hint="Use short fades instead of movement." checked={s.reduceMotion} onChange={(reduceMotion) => set({ reduceMotion })} />
        </Group>

        <Group title="Writing">
          <Toggle label="Opening thought" hint="A short line at the top of a new page." checked={s.openingThought} onChange={(openingThought) => set({ openingThought })} />
          <Toggle label="Questions" hint="A question in the empty page, and Another question." checked={s.questions} onChange={(questions) => set({ questions })} />
        </Group>

        <Group title="Reflections">
          <Toggle label="Reflections" hint="A short thought after you finish." checked={s.reflections} onChange={(reflections) => set({ reflections })} />
          <Toggle
            label="Illustrations made with AI"
            hint="When off, each entry gets a simple drawing made on your phone."
            checked={s.illustrations}
            onChange={(illustrations) => set({ illustrations })}
          />
          <Toggle label="Religious and spiritual voices" checked={s.allowReligious} onChange={(allowReligious) => set({ allowReligious })} />
          <NameList label="Voices I love" hint="Writers you'd like to hear from now and then." names={s.lovedVoices} onChange={(lovedVoices) => set({ lovedVoices })} />
          <NameList label="Voices to skip" names={s.skippedVoices} onChange={(skippedVoices) => set({ skippedVoices })} />
        </Group>

        <Group title="Place">
          <Choice<PlaceMode>
            legend="When to add a place"
            value={s.placeMode}
            onChange={(placeMode) => set({ placeMode })}
            options={[
              { value: "off", label: "Off" },
              { value: "ask", label: "Ask each time" },
              { value: "auto", label: "Add automatically" },
            ]}
          />
          <Toggle label="Include place when sharing" checked={s.sharePlace} onChange={(sharePlace) => set({ sharePlace })} />
        </Group>

        <Group title="Reminder">
          <Toggle
            label="Daily reminder"
            hint="One gentle note a day: Your page is here whenever you want it."
            checked={s.reminderTime !== null}
            onChange={(on) => void setReminder(on)}
          />
          {s.reminderTime !== null ? (
            <label className="field">
              <span className="field__label">Time</span>
              <input className="input input--time" type="time" value={s.reminderTime} onChange={(e) => e.target.value && void setReminder(true, e.target.value)} />
            </label>
          ) : null}
          {reminderNote ? (
            <p className="field-note" role="alert">
              {reminderNote}
            </p>
          ) : null}
        </Group>

        <Group title="My data">
          <button type="button" className="button button--soft" onClick={exportAll} disabled={!!busy} aria-busy={busy === "export"}>
            {busy === "export" ? "Making your export" : "Export everything"}
          </button>
          <p className="setting__hint">A ZIP with one Markdown file per entry, plus all photos and drawings.</p>
          <button type="button" className="button button--soft" onClick={() => go("/settings/ai")}>
            How AI is used
          </button>
          <button type="button" className="button button--danger-quiet" onClick={() => setConfirmWipe(true)} disabled={!!busy}>
            {busy === "wipe" ? "Deleting" : "Delete everything"}
          </button>
        </Group>

        <Group title="Account">
          <p className="setting__hint">
            {!cloudConfigured
              ? "Your entries are kept on this device only."
              : auth.user && !auth.anonymous
                ? `Signed in as ${auth.user.email ?? "you"}. Your entries are backed up.`
                : "Your entries are on this device. Sign in to back them up."}
          </p>
          {cloudConfigured ? (
            <button type="button" className="button button--soft" onClick={() => go("/settings/account")}>
              Account
            </button>
          ) : null}
        </Group>
      </main>
      <Confirm
        open={confirmWipe}
        title="Delete everything?"
        body="This removes every entry, photo, drawing and setting from this device and from your backup. It can't be undone."
        confirmLabel="Delete everything"
        danger
        onConfirm={wipe}
        onCancel={() => setConfirmWipe(false)}
      />
    </>
  );
}

export function HowAIScreen() {
  return (
    <>
      <SettingsBar back="/settings" label="Settings" />
      <main className="page page--prose" id="main">
        <h1 className="page-title">How AI is used</h1>
        <p>Reflections, titles and illustrations are made with AI. Everything else happens on your phone.</p>
        <h2 className="section-title">What gets sent</h2>
        <p>
          When you tap Finish, the words of that one entry, and a small copy of its photo if it has one, are sent from our server to
          an AI service. The server also sends the names of voices you love or skip and the last few authors you received, so the
          reflection doesn't repeat itself.
        </p>
        <p>
          To make the drawing, only a one-sentence description of a nature scene is sent to an image service, never your words or
          your photo.
        </p>
        <p>If you add a place, your rough location is used once to find a name, and only the name is kept.</p>
        <h2 className="section-title">What doesn't</h2>
        <p>
          Entries you keep from AI are never sent to any AI service. They get a drawing made on your phone and a quote from a small
          library of well-known lines.
        </p>
        <p>
          Your other entries are never sent. The AI services we use don't train on what we send them. We don't keep or log your
          words on our server, and there are no ads or trackers.
        </p>
        <h2 className="section-title">When AI isn't available</h2>
        <p>If you're offline or the service can't answer, your entry is saved as it is and gets its drawing and reflection later.</p>
      </main>
    </>
  );
}
