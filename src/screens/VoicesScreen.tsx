import { useMemo, useState } from "react";
import { quotesBy, searchLibrary, voiceCount, voicesByTradition } from "../../shared/library";
import type { StarterLine } from "../../shared/starter";
import { traditionLabel, VOICES } from "../../shared/voices";
import { SearchIcon } from "../components/icons";
import { Attribution, QuoteText } from "../components/ReflectionView";
import { showToast } from "../components/Toast";
import { NavLink } from "../components/TopBar";
import { saveSettings } from "../lib/db";
import { go } from "../lib/router";
import { useSettings } from "../lib/store";
import { setOpeningThought } from "../lib/thoughts";
import { CollectionSwitch, CollectionTopBar, fold } from "./EntriesScreen";
import { SettingsBar } from "./SettingsScreen";

function copyText(l: StarterLine) {
  const body = l.isParaphrase ? l.quote : `“${l.quote}”`;
  return `${body}\n${l.isParaphrase ? "after " : ""}${l.author}, ${l.source}`;
}

function QuoteCard({ line, showVoice = true }: { line: StarterLine; showVoice?: boolean }) {
  return (
    <li className="commonplace__item voice-quote">
      <figure>
        <blockquote>
          <QuoteText r={{ quote: line.quote, isParaphrase: line.isParaphrase }} />
        </blockquote>
        <figcaption>
          <Attribution r={line} />
        </figcaption>
      </figure>
      <div className="voice-quote__actions">
        <button
          type="button"
          className="text-button"
          onClick={async () => {
            await setOpeningThought(line.id);
            go("/");
          }}
        >
          Write about this
        </button>
        <button
          type="button"
          className="text-button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(copyText(line));
              showToast("Copied.");
            } catch {
              showToast("Couldn't copy. Select the words instead.");
            }
          }}
        >
          Copy
        </button>
        {showVoice && line.voice ? (
          <NavLink to={`/voices/${line.voice}`}>More from {line.author}</NavLink>
        ) : null}
      </div>
    </li>
  );
}

/** Every voice in the library, and a way to search every line. */
export function VoicesScreen() {
  const [query, setQuery] = useState("");
  const [only, setOnly] = useState<string>("all");
  const groups = useMemo(() => voicesByTradition(), []);
  const results = useMemo(() => (query.trim() ? searchLibrary(query) : []), [query]);
  const total = useMemo(() => groups.reduce((n, g) => n + g.voices.reduce((m, v) => m + voiceCount(v.id), 0), 0), [groups]);
  const voices = groups.reduce((n, g) => n + g.voices.length, 0);

  return (
    <>
      <CollectionTopBar />
      <main className="page page--collection" id="main">
        <h1 className="visually-hidden">Voices</h1>
        <CollectionSwitch current="voices" />
        <p className="lead voices__intro">
          {total} thoughts from {voices} voices, across more than four thousand years. A new one waits on every blank page.
        </p>

        <div className="search" role="search">
          <SearchIcon size={20} className="search__icon" />
          <label htmlFor="vsearch" className="visually-hidden">
            Search voices and thoughts
          </label>
          <input
            id="vsearch"
            type="search"
            className="input search__input"
            placeholder="Search a name, a word, a theme"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
          />
        </div>

        {query.trim() ? (
          <>
            <p className="field-note" role="status">
              {results.length === 0 ? "Nothing found." : `${results.length} ${results.length === 1 ? "thought" : "thoughts"} found.`}
            </p>
            <ol className="commonplace">
              {results.slice(0, 80).map((l) => (
                <QuoteCard key={l.id} line={l} />
              ))}
            </ol>
          </>
        ) : (
          <>
            <div className="chips-row" role="group" aria-label="Show">
              {[{ id: "all", label: "Everyone" }, ...groups.map((g) => ({ id: g.id as string, label: g.label }))].map((c) => (
                <button key={c.id} type="button" className="filter-chip" aria-pressed={only === c.id} onClick={() => setOnly(c.id)}>
                  {c.label}
                </button>
              ))}
            </div>
            {groups
              .filter((g) => only === "all" || g.id === only)
              .map((g) => (
                <section key={g.id} className="month" aria-labelledby={`t-${g.id}`}>
                  <h2 id={`t-${g.id}`} className="section-title">
                    {g.label}
                  </h2>
                  <ul className="plain-list voice-list">
                    {g.voices.map((v) => (
                      <li key={v.id}>
                        <a
                          href={`/voices/${v.id}`}
                          className="voice-row"
                          onClick={(e) => {
                            e.preventDefault();
                            go(`/voices/${v.id}`);
                          }}
                        >
                          <span className="voice-row__name">{v.name}</span>
                          <span className="voice-row__meta">
                            {v.years ? `${v.years} · ` : ""}
                            {voiceCount(v.id)} {voiceCount(v.id) === 1 ? "thought" : "thoughts"}
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
          </>
        )}
      </main>
    </>
  );
}

/** One voice: who they were, and everything the library holds from them. */
export function VoiceScreen({ id }: { id: string }) {
  const voice = VOICES[id];
  const [settings] = useSettings();
  const lines = useMemo(() => quotesBy(id), [id]);
  if (!voice) {
    return (
      <>
        <SettingsBar back="/voices" label="Voices" />
        <main className="page" id="main">
          <p className="empty">There's no one here by that name.</p>
        </main>
      </>
    );
  }
  const loved = settings.lovedVoices.some((n) => fold(n) === fold(voice.name));
  const skipped = settings.skippedVoices.some((n) => fold(n) === fold(voice.name));
  const without = (list: string[]) => list.filter((n) => fold(n) !== fold(voice.name));
  return (
    <>
      <SettingsBar back="/voices" label="Voices" />
      <main className="page page--prose" id="main">
        <h1 className="page-title">{voice.name}</h1>
        <p className="voice__meta">
          {voice.years ? `${voice.years} · ` : ""}
          {traditionLabel(voice.tradition)}
        </p>
        <p className="lead">{voice.about}</p>
        <div className="voice__choices">
          <button
            type="button"
            className="button button--soft"
            aria-pressed={loved}
            onClick={() => void saveSettings({ lovedVoices: loved ? without(settings.lovedVoices) : [...without(settings.lovedVoices), voice.name], skippedVoices: without(settings.skippedVoices) })}
          >
            {loved ? "Loved. Tap to undo" : "I love this voice"}
          </button>
          <button
            type="button"
            className="button button--quiet"
            aria-pressed={skipped}
            onClick={() => void saveSettings({ skippedVoices: skipped ? without(settings.skippedVoices) : [...without(settings.skippedVoices), voice.name], lovedVoices: without(settings.lovedVoices) })}
          >
            {skipped ? "Skipped. Tap to undo" : "Skip this voice"}
          </button>
        </div>
        <ol className="commonplace">
          {lines.map((l) => (
            <QuoteCard key={l.id} line={l} showVoice={false} />
          ))}
        </ol>
      </main>
    </>
  );
}
