import { useMemo, useState } from "react";
import { SearchIcon } from "../components/icons";
import { Attribution, QuoteText } from "../components/ReflectionView";
import { formatRowDate } from "../lib/dates";
import { go } from "../lib/router";
import { useEntries } from "../lib/store";
import { CollectionSwitch, CollectionTopBar, fold } from "./EntriesScreen";

/** Every reflection received, newest first: a commonplace book. */
export function ReflectionsScreen() {
  const [entries, ready] = useEntries();
  const [query, setQuery] = useState("");
  const withQuotes = useMemo(
    () =>
      entries
        .filter((e) => e.reflection?.quote && !e.crisis)
        .sort((a, b) => (b.reflection!.receivedAt ?? "").localeCompare(a.reflection!.receivedAt ?? "")),
    [entries],
  );
  const results = useMemo(() => {
    const q = fold(query.trim());
    return q ? withQuotes.filter((e) => fold(e.reflection!.author ?? "").includes(q)) : withQuotes;
  }, [withQuotes, query]);

  return (
    <>
      <CollectionTopBar />
      <main className="page page--collection" id="main">
        <h1 className="visually-hidden">Reflections</h1>
        <CollectionSwitch current="reflections" />
        {ready && withQuotes.length === 0 ? (
          <div className="empty">
            <p>Each reflection you receive will be kept here.</p>
          </div>
        ) : (
          <div className="search" role="search">
            <SearchIcon size={20} className="search__icon" />
            <label htmlFor="rsearch" className="visually-hidden">
              Search by author
            </label>
            <input
              id="rsearch"
              type="search"
              className="input search__input"
              placeholder="Search by author"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoComplete="off"
            />
          </div>
        )}
        {query.trim() ? (
          <p className="field-note" role="status">
            {results.length === 0 ? "Nothing found." : `${results.length} found.`}
          </p>
        ) : null}
        <ol className="commonplace">
          {results.map((e) => (
            <li key={e.id} className="commonplace__item">
              <figure>
                <blockquote>
                  <QuoteText r={e.reflection!} />
                </blockquote>
                <figcaption>
                  <Attribution r={e.reflection!} />
                </figcaption>
              </figure>
              <a
                className="commonplace__link"
                href={`/entry/${e.id}`}
                onClick={(ev) => {
                  ev.preventDefault();
                  go(`/entry/${e.id}`);
                }}
              >
                From {e.title ?? "an entry"}, {formatRowDate(e)}
              </a>
            </li>
          ))}
        </ol>
      </main>
    </>
  );
}
