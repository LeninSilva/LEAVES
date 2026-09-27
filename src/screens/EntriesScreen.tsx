import { useCallback, useMemo, useState } from "react";
import { LeafIcon, SearchIcon, SettingsIcon } from "../components/icons";
import { Illustration } from "../components/Illustration";
import { LeafMark } from "../components/LeafShape";
import { NavLink, TopBar } from "../components/TopBar";
import { Tree } from "../components/Tree";
import { dayKey, entryDay, formatMonth, formatRowDate, onThisDayKeys, currentTimeZone } from "../lib/dates";
import { saveMeta } from "../lib/db";
import { firstLine } from "../lib/entries";
import { moodVar } from "../lib/moods";
import { go } from "../lib/router";
import { useDrafts, useEntries, useMeta } from "../lib/store";
import type { Entry } from "../lib/types";

export function fold(s: string): string {
  return s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function matches(e: Entry, q: string): boolean {
  if (!q) return true;
  const hay = fold(
    [e.text, e.title ?? "", e.place?.name ?? "", e.reflection?.author ?? "", e.reflection?.source ?? "", ...e.themes].join("\n"),
  );
  return fold(q)
    .split(/\s+/)
    .filter(Boolean)
    .every((w) => hay.includes(w));
}

/** The two-way switch between Entries and Reflections. */
export function CollectionSwitch({ current }: { current: "entries" | "reflections" }) {
  return (
    <nav className="switch" aria-label="Collection">
      <a
        href="/entries"
        className="switch__option"
        aria-current={current === "entries" ? "page" : undefined}
        onClick={(e) => {
          e.preventDefault();
          if (current !== "entries") go("/entries");
        }}
      >
        Entries
      </a>
      <a
        href="/reflections"
        className="switch__option"
        aria-current={current === "reflections" ? "page" : undefined}
        onClick={(e) => {
          e.preventDefault();
          if (current !== "reflections") go("/reflections");
        }}
      >
        Reflections
      </a>
    </nav>
  );
}

export function CollectionTopBar() {
  return (
    <TopBar
      left={
        <NavLink to="/" icon={<LeafIcon size={20} />}>
          Write
        </NavLink>
      }
      right={
        <NavLink to="/settings" icon={<SettingsIcon size={20} />}>
          Settings
        </NavLink>
      }
    />
  );
}

function onThisDay(entries: Entry[]): Entry | null {
  const today = dayKey(new Date().toISOString(), currentTimeZone());
  const { yearsAgo, monthAgo } = onThisDayKeys(today);
  return entries.find((e) => yearsAgo(entryDay(e))) ?? entries.find((e) => entryDay(e) === monthAgo) ?? null;
}

function onThisDayLabel(e: Entry): string {
  const today = dayKey(new Date().toISOString(), currentTimeZone());
  const years = Number(today.slice(0, 4)) - Number(entryDay(e).slice(0, 4));
  if (entryDay(e).slice(5) === today.slice(5) && years > 0) return years === 1 ? "On this day last year" : `On this day ${years} years ago`;
  return "One month ago";
}

export function EntriesScreen() {
  const [entries, ready] = useEntries();
  const [drafts] = useDrafts();
  const [meta] = useMeta();
  const [query, setQuery] = useState("");

  const oldestFirst = useMemo(() => [...entries].reverse(), [entries]);
  const moods = useMemo(() => oldestFirst.map((e) => e.mood), [oldestFirst]);
  const results = useMemo(() => entries.filter((e) => matches(e, query.trim())), [entries, query]);
  const groups = useMemo(() => {
    const map = new Map<string, Entry[]>();
    for (const e of results) {
      const month = entryDay(e).slice(0, 7);
      map.set(month, [...(map.get(month) ?? []), e]);
    }
    return [...map.entries()];
  }, [results]);
  const memory = useMemo(() => onThisDay(entries), [entries]);
  const seen = useCallback((count: number) => void saveMeta({ seenLeafCount: count }), []);
  const unfinished = drafts.filter((d) => d.text.trim() || d.photo);

  return (
    <>
      <CollectionTopBar />
      <main className="page page--collection" id="main">
        <h1 className="visually-hidden">Entries</h1>
        <CollectionSwitch current="entries" />
        <Tree moods={moods} seenCount={meta.seenLeafCount} onSeen={seen} />

        {ready && entries.length === 0 ? (
          <div className="empty">
            <p>Your first entry will grow the first leaf.</p>
            <button type="button" className="button button--primary button--icon" onClick={() => go("/")}>
              <LeafIcon size={20} />
              <span>Write</span>
            </button>
          </div>
        ) : null}

        {memory ? (
          <p className="memory">
            <a
              href={`/entry/${memory.id}`}
              onClick={(e) => {
                e.preventDefault();
                go(`/entry/${memory.id}`);
              }}
            >
              {onThisDayLabel(memory)}: {memory.title}
            </a>
          </p>
        ) : null}

        {unfinished.length ? (
          <section className="drafts" aria-labelledby="drafts-heading">
            <h2 id="drafts-heading" className="section-title">
              Unfinished pages
            </h2>
            <ul className="plain-list">
              {unfinished.map((d) => (
                <li key={d.id}>
                  <a
                    href={`/draft/${d.id}`}
                    className="draft-link"
                    onClick={(e) => {
                      e.preventDefault();
                      go(`/draft/${d.id}`);
                    }}
                  >
                    {firstLine(d.text, 60) || "A page with a photo"}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {entries.length ? (
          <div className="search" role="search">
            <SearchIcon size={20} className="search__icon" />
            <label htmlFor="search" className="visually-hidden">
              Search words, titles, places and authors
            </label>
            <input
              id="search"
              type="search"
              className="input search__input"
              placeholder="Search words, titles, places, authors"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoComplete="off"
            />
          </div>
        ) : null}
        {query.trim() ? (
          <p className="field-note" role="status">
            {results.length === 0 ? "Nothing found." : `${results.length} ${results.length === 1 ? "entry" : "entries"} found.`}
          </p>
        ) : null}

        {groups.map(([month, list]) => (
          <section key={month} className="month" aria-labelledby={`m-${month}`}>
            <h2 id={`m-${month}`} className="section-title">
              {formatMonth(month)}
            </h2>
            <ol className="vine">
              {list.map((e) => (
                <li key={e.id} className="vine__item">
                  <LeafMark color={moodVar(e.mood)} size={16} className="vine__leaf" />
                  <a
                    href={`/entry/${e.id}`}
                    className="row-link"
                    onClick={(ev) => {
                      ev.preventDefault();
                      go(`/entry/${e.id}`);
                    }}
                  >
                    <Illustration entry={e} variant="thumb" />
                    <span className="row-link__body">
                      <span className="row-link__title">{e.title ?? "Untitled"}</span>
                      {e.text ? <span className="row-link__first">{firstLine(e.text)}</span> : null}
                      <span className="row-link__date">{formatRowDate(e)}</span>
                    </span>
                  </a>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </main>
    </>
  );
}
