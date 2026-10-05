import { useCallback, useEffect, useRef, useState } from "react";
import type { StarterLine } from "../../shared/starter";
import { Grass } from "../components/Grass";
import { PhotoStack } from "../components/PhotoStack";
import { SteadyButton } from "../components/SteadyButton";
import { showToast } from "../components/Toast";
import { LockIcon, PageIcon, TreeIcon } from "../components/icons";
import { NavLink, TopBar } from "../components/TopBar";
import { PlaceField } from "../components/PlaceField";
import { Attribution } from "../components/ReflectionView";
import { formatToday } from "../lib/dates";
import { getMeta, saveMeta, updateEntry } from "../lib/db";
import {
  backupDraft,
  beginIfNeeded,
  blankEntry,
  clearBackup,
  finishDraft,
  hasContent,
  openDraft,
  recoverEdits,
  saveDraft,
} from "../lib/entries";
import { lookUpPlace } from "../lib/place";
import { processEntry } from "../lib/pipeline";
import { QUESTIONS } from "../lib/questions";
import { go, navigate } from "../lib/router";
import { protectStorage } from "../lib/storage";
import { useSettings } from "../lib/store";
import { openingThought, retireOpeningThought } from "../lib/thoughts";
import type { Entry } from "../lib/types";
import { useAutoGrow } from "../lib/useAutoGrow";
import { useKeepKeyboard } from "../lib/useKeepKeyboard";
import { useKeyboardOffset } from "../lib/useKeyboardOffset";
import { usePhotoActions } from "../lib/usePhotoActions";

const SAVE_DELAY_MS = 400;

/** The blank page. Open, write, finish. */
export function Write({ draftId }: { draftId?: string }) {
  const [settings] = useSettings();
  const [entry, setEntry] = useState<Entry | null>(null);
  const [question, setQuestion] = useState<string>(QUESTIONS[0]);
  const [thought, setThought] = useState<StarterLine | null>(null);
  const [finishing, setFinishing] = useState(false);
  const finishingRef = useRef(false);
  const entryRef = useRef<Entry | null>(null);
  const saveTimer = useRef<number | undefined>(undefined);
  const textRef = useRef<HTMLTextAreaElement>(null);
  useKeyboardOffset();
  useKeepKeyboard();
  useAutoGrow(textRef, entry?.text ?? "");

  // Open the draft left last time, or a new page.
  useEffect(() => {
    let alive = true;
    openDraft(draftId).then(async (e) => {
      if (!alive) return;
      entryRef.current = e;
      setEntry(e);
      const meta = await getMeta();
      setQuestion(QUESTIONS[meta.questionIndex % QUESTIONS.length]);
    });
    return () => {
      alive = false;
    };
  }, [draftId]);

  // A thought on the blank page, new each time the app is opened.
  useEffect(() => {
    if (!settings.openingThought) {
      setThought(null);
      return;
    }
    let alive = true;
    const load = () => void openingThought().then((t) => alive && setThought(t));
    load();
    const onVisible = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive = false;
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [settings.openingThought]);

  const flush = useCallback(async () => {
    window.clearTimeout(saveTimer.current);
    const e = entryRef.current;
    if (e && e.startedAt) await saveDraft(e);
  }, []);

  // Save when the page is hidden or closed, so a closed app never loses a word.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") void flush();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", flush);
      void flush();
    };
  }, [flush]);

  const update = useCallback(
    (next: Entry, opts: { immediate?: boolean } = {}) => {
      const wasBegun = !!entryRef.current?.startedAt;
      entryRef.current = next;
      setEntry(next);
      backupDraft(next);
      window.clearTimeout(saveTimer.current);
      if (opts.immediate) void flush();
      else saveTimer.current = window.setTimeout(flush, SAVE_DELAY_MS);
      // "Add automatically": look up the place once, when writing begins.
      if (!wasBegun && next.startedAt && settings.placeMode === "auto" && !next.place) {
        lookUpPlace().then((name) => {
          const cur = entryRef.current;
          if (name && cur && cur.id === next.id && !cur.place) update({ ...cur, place: { name } }, { immediate: true });
        });
      }
    },
    [flush, settings.placeMode],
  );

  // Every change is made to the page as it is right now, never to an older copy.
  const apply = useCallback(
    (change: (e: Entry) => Entry, opts: { immediate?: boolean } = {}) => {
      const cur = entryRef.current;
      if (cur) update(change(cur), opts);
    },
    [update],
  );

  const photos = usePhotoActions({ entryId: entry?.id ?? "", current: () => entryRef.current, apply });

  const onText = (text: string) => apply((e) => beginIfNeeded({ ...e, text }));

  const finish = async () => {
    const e = entryRef.current;
    if (!e || !hasContent(e) || finishingRef.current) return;
    finishingRef.current = true;
    setFinishing(true);
    let done: Entry | undefined;
    try {
      await flush();
      done = await finishDraft(e.id);
    } catch {
      showToast("Couldn't finish just now. Your words are saved. Try again.");
    }
    if (!done) {
      finishingRef.current = false;
      setFinishing(false);
      return;
    }
    // This page is finished: nothing more to autosave from it.
    window.clearTimeout(saveTimer.current);
    entryRef.current = null;
    textRef.current?.blur();
    // One soft haptic tap where supported.
    try {
      navigator.vibrate?.(12);
    } catch {
      /* not supported */
    }
    void processEntry(done.id);
    void retireOpeningThought();
    // A finished page is worth protecting: ask the browser not to clear this notebook (it may say no).
    void protectStorage();
    go(`/entry/${done.id}`, { justFinished: true });
  };

  const newPage = async () => {
    await flush();
    await saveMeta({ currentDraftId: null });
    const blank = blankEntry();
    entryRef.current = blank;
    setEntry(blank);
    navigate("/", { replace: true });
    textRef.current?.focus();
  };

  const nextQuestion = async () => {
    const meta = await getMeta();
    const i = (meta.questionIndex + 1) % QUESTIONS.length;
    await saveMeta({ questionIndex: i });
    setQuestion(QUESTIONS[i]);
  };

  const anotherThought = async () => setThought(await openingThought({ fresh: true }));

  if (!entry) return <main className="page page--write" aria-busy="true" />;

  const empty = entry.text.length === 0;
  const canFinish = hasContent(entry);
  const began = !!entry.startedAt;

  return (
    <>
      <TopBar
        left={
          began && canFinish ? (
            <SteadyButton className="button button--quiet button--icon" onPress={() => void newPage()}>
              <PageIcon size={20} />
              <span>New page</span>
            </SteadyButton>
          ) : null
        }
        right={
          <NavLink to="/entries" icon={<TreeIcon size={20} />}>
            Entries
          </NavLink>
        }
      />
      <main className="page page--write" id="main">
        <h1 className="today">{formatToday()}</h1>
        {thought && settings.openingThought ? (
          <div className={`opening ${empty ? "" : "opening--gone"}`} aria-hidden={!empty}>
            <div className="opening__inner">
              <p className="opening__quote">{thought.isParaphrase ? thought.quote : `“${thought.quote}”`}</p>
              <Attribution r={thought} />
              {empty ? (
                <SteadyButton className="text-button opening__another" onPress={() => void anotherThought()}>
                  Another thought
                </SteadyButton>
              ) : null}
            </div>
          </div>
        ) : null}

        <PhotoStack photos={entry.photos} actions={photos} />

        <label htmlFor="page" className="visually-hidden">
          Your entry
        </label>
        <textarea
          id="page"
          ref={textRef}
          className="page-text"
          value={entry.text}
          placeholder={settings.questions ? question : QUESTIONS[0]}
          onChange={(e) => onText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              void finish();
            }
          }}
          spellCheck
          autoCapitalize="sentences"
          autoCorrect="on"
          rows={6}
        />
        {empty && settings.questions ? (
          <SteadyButton className="text-button another" onPress={() => void nextQuestion()}>
            Another question
          </SteadyButton>
        ) : null}

        <div className="writebar" role="group" aria-label="Entry actions">
          <div className="writebar__inner">
            {settings.placeMode !== "off" ? (
              <PlaceField
                place={entry.place?.name ?? null}
                onChange={(name) => apply((e) => beginIfNeeded({ ...e, place: name ? { name } : null }), { immediate: true })}
              />
            ) : null}
            <SteadyButton
              className={`button button--quiet button--icon ${entry.keptFromAI ? "is-on" : ""}`}
              aria-pressed={entry.keptFromAI}
              onPress={() => apply((e) => ({ ...e, keptFromAI: !e.keptFromAI }), { immediate: true })}
            >
              <LockIcon size={20} />
              <span>Keep from AI</span>
            </SteadyButton>
            <span className="writebar__spacer" />
            {canFinish ? (
              <SteadyButton className="button button--primary finish" onPress={() => void finish()} aria-disabled={finishing || undefined}>
                {finishing ? "Finishing" : "Finish"}
              </SteadyButton>
            ) : null}
          </div>
        </div>
      </main>
      <Grass />
    </>
  );
}

/** Editing a finished entry: same page, keeps the original finish time, notes "Edited". */
export function EditEntry({ entry }: { entry: Entry }) {
  const [current, setCurrent] = useState(() => recoverEdits(entry));
  const ref = useRef(current);
  const timer = useRef<number | undefined>(undefined);
  const textRef = useRef<HTMLTextAreaElement>(null);
  useKeyboardOffset();
  useKeepKeyboard();
  useAutoGrow(textRef, current.text);

  const save = useCallback(async () => {
    window.clearTimeout(timer.current);
    const e = ref.current;
    await updateEntry(e.id, (stored) => ({
      ...stored,
      text: e.text,
      photos: e.photos,
      place: e.place,
      editedAt: new Date().toISOString(),
    }));
    // Saved, so the crash backup has done its job (unless more was typed since).
    if (ref.current === e) clearBackup(e.id);
  }, []);

  useEffect(() => {
    const onHide = () => document.visibilityState === "hidden" && void save();
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", save);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", save);
      void save();
    };
  }, [save]);

  const change = useCallback(
    (next: Entry, immediate = false) => {
      ref.current = next;
      setCurrent(next);
      backupDraft(next);
      window.clearTimeout(timer.current);
      if (immediate) void save();
      else timer.current = window.setTimeout(save, SAVE_DELAY_MS);
    },
    [save],
  );

  const apply = useCallback((fn: (e: Entry) => Entry, opts: { immediate?: boolean } = {}) => change(fn(ref.current), opts.immediate), [change]);
  const photos = usePhotoActions({ entryId: entry.id, current: () => ref.current, apply });

  const done = async () => {
    await save();
    navigate(`/entry/${entry.id}`, { replace: true, state: { fromApp: true } });
  };

  return (
    <>
      <TopBar
        left={<h1 className="topbar__title">Edit entry</h1>}
        right={
          <SteadyButton className="button button--primary" onPress={() => void done()}>
            Done
          </SteadyButton>
        }
      />
      <main className="page page--write" id="main">
        <PhotoStack photos={current.photos} actions={photos} />
        <label htmlFor="page" className="visually-hidden">
          Your entry
        </label>
        <textarea
          id="page"
          ref={textRef}
          className="page-text"
          value={current.text}
          onChange={(e) => apply((x) => ({ ...x, text: e.target.value }))}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              void done();
            }
          }}
          spellCheck
          rows={8}
        />
        <div className="writebar" role="group" aria-label="Entry actions">
          <div className="writebar__inner">
            <PlaceField place={current.place?.name ?? null} onChange={(name) => apply((x) => ({ ...x, place: name ? { name } : null }), { immediate: true })} />
          </div>
        </div>
      </main>
      <Grass />
    </>
  );
}
