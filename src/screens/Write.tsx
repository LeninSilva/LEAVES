import { useCallback, useEffect, useRef, useState } from "react";
import { Grass } from "../components/Grass";
import { SteadyButton } from "../components/SteadyButton";
import { showToast } from "../components/Toast";
import { LockIcon, PageIcon, TreeIcon } from "../components/icons";
import { NavLink, TopBar } from "../components/TopBar";
import { PhotoField } from "../components/PhotoField";
import { PlaceField } from "../components/PlaceField";
import { Attribution } from "../components/ReflectionView";
import { formatToday } from "../lib/dates";
import { getMeta, saveMeta, updateEntry } from "../lib/db";
import {
  attachPhoto,
  backupText,
  beginIfNeeded,
  blankEntry,
  detachPhoto,
  finishDraft,
  hasContent,
  openDraft,
  saveDraft,
} from "../lib/entries";
import { lookUpPlace } from "../lib/place";
import { processEntry, retireOpeningThought, takeOpeningThought } from "../lib/pipeline";
import { QUESTIONS } from "../lib/questions";
import { go, navigate } from "../lib/router";
import { useSettings } from "../lib/store";
import type { Entry, OpeningThoughtLine } from "../lib/types";
import { useKeyboardOffset } from "../lib/useKeyboardOffset";
import { useAutoGrow } from "../lib/useAutoGrow";

const SAVE_DELAY_MS = 400;

/** The blank page. Open, write, finish. */
export function Write({ draftId }: { draftId?: string }) {
  const [settings] = useSettings();
  const [entry, setEntry] = useState<Entry | null>(null);
  const [question, setQuestion] = useState<string>(QUESTIONS[0]);
  const [thought, setThought] = useState<OpeningThoughtLine | null>(null);
  const [finishing, setFinishing] = useState(false);
  const finishingRef = useRef(false);
  const entryRef = useRef<Entry | null>(null);
  const saveTimer = useRef<number | undefined>(undefined);
  const textRef = useRef<HTMLTextAreaElement>(null);
  useKeyboardOffset();
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

  useEffect(() => {
    if (!settings.openingThought) {
      setThought(null);
      return;
    }
    takeOpeningThought().then(setThought);
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
      backupText(next.id, next.text);
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

  const onText = (text: string) => {
    if (!entryRef.current) return;
    update(beginIfNeeded({ ...entryRef.current, text }));
  };

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

  if (!entry) return <main className="page page--write" aria-busy="true" />;

  const empty = entry.text.length === 0;
  const canFinish = hasContent(entry);
  const began = !!entry.startedAt;

  return (
    <>
      <TopBar
        left={
          began && canFinish ? (
            <button type="button" className="button button--quiet button--icon" onClick={newPage}>
              <PageIcon size={20} />
              <span>New page</span>
            </button>
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
            <p className="opening__quote">{thought.isParaphrase ? thought.quote : `“${thought.quote}”`}</p>
            <Attribution r={thought} />
          </div>
        ) : null}

        <PhotoField
          photo={entry.photo}
          onPick={async (file) => update(await attachPhoto(entryRef.current!, file), { immediate: true })}
          onRemove={async () => update(await detachPhoto(entryRef.current!), { immediate: true })}
          onAlt={(alt) => {
            const cur = entryRef.current!;
            if (cur.photo) update({ ...cur, photo: { ...cur.photo, alt, altEdited: alt.length > 0 } }, { immediate: true });
          }}
        />

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
          <button type="button" className="text-button another" onClick={nextQuestion}>
            Another question
          </button>
        ) : null}

      <div className="writebar" role="group" aria-label="Entry actions">
        <div className="writebar__inner">
          {settings.placeMode !== "off" ? (
            <PlaceField
              place={entry.place?.name ?? null}
              onChange={(name) => update(beginIfNeeded({ ...entryRef.current!, place: name ? { name } : null }), { immediate: true })}
            />
          ) : null}
          <SteadyButton
            className={`button button--quiet button--icon ${entry.keptFromAI ? "is-on" : ""}`}
            aria-pressed={entry.keptFromAI}
            onPress={() => update({ ...entryRef.current!, keptFromAI: !entryRef.current!.keptFromAI }, { immediate: true })}
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
  const [current, setCurrent] = useState(entry);
  const ref = useRef(entry);
  const timer = useRef<number | undefined>(undefined);
  const textRef = useRef<HTMLTextAreaElement>(null);
  useKeyboardOffset();
  useAutoGrow(textRef, current.text);

  const save = useCallback(async () => {
    window.clearTimeout(timer.current);
    const e = ref.current;
    await updateEntry(e.id, (stored) => ({
      ...stored,
      text: e.text,
      photo: e.photo,
      place: e.place,
      editedAt: new Date().toISOString(),
    }));
  }, []);

  useEffect(() => {
    const onHide = () => document.visibilityState === "hidden" && void save();
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [save]);

  const change = (next: Entry, immediate = false) => {
    ref.current = next;
    setCurrent(next);
    backupText(next.id, next.text);
    window.clearTimeout(timer.current);
    if (immediate) void save();
    else timer.current = window.setTimeout(save, SAVE_DELAY_MS);
  };

  const done = async () => {
    await save();
    navigate(`/entry/${entry.id}`, { replace: true, state: { fromApp: true } });
  };

  return (
    <>
      <TopBar
        left={<h1 className="topbar__title">Edit entry</h1>}
        right={
          <button type="button" className="button button--primary" onClick={done}>
            Done
          </button>
        }
      />
      <main className="page page--write" id="main">
        <PhotoField
          photo={current.photo}
          onPick={async (file) => change(await attachPhoto(ref.current, file), true)}
          onRemove={async () => change(await detachPhoto(ref.current), true)}
          onAlt={(alt) => ref.current.photo && change({ ...ref.current, photo: { ...ref.current.photo, alt, altEdited: true } }, true)}
        />
        <label htmlFor="page" className="visually-hidden">
          Your entry
        </label>
        <textarea
          id="page"
          ref={textRef}
          className="page-text"
          value={current.text}
          onChange={(e) => change({ ...ref.current, text: e.target.value })}
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
            <PlaceField place={current.place?.name ?? null} onChange={(name) => change({ ...ref.current, place: name ? { name } : null }, true)} />
          </div>
        </div>
      </main>
      <Grass />
    </>
  );
}
