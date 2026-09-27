import { useEffect, useState } from "react";
import { PaperFrame } from "../components/Illustration";
import { Attribution, QuoteText } from "../components/ReflectionView";
import { BreathingLeaf } from "../components/BreathingLeaf";
import { fetchPublicPage, fetchSharedEntry, type PublicPage, type SharedSnapshot } from "../lib/share";

function setRobots(content: string) {
  let meta = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "robots";
    document.head.appendChild(meta);
  }
  meta.content = content;
}

export function SnapshotView({ s, seed, headingLevel = 1 }: { s: SharedSnapshot; seed: string; headingLevel?: 1 | 2 }) {
  const H = headingLevel === 1 ? "h1" : "h2";
  return (
    <article className="shared-entry">
      {s.illustrationUrl ? (
        <div className="entry__art">
          <PaperFrame seed={seed} className="paper--large">
            <img src={s.illustrationUrl} alt={s.illustrationAlt} loading="lazy" />
          </PaperFrame>
        </div>
      ) : null}
      <H className="entry__title">{s.title}</H>
      <p className="stamp">{s.stamp}</p>
      {s.photoUrl ? <img className="entry__photo" src={s.photoUrl} alt={s.photoAlt || "Photo"} loading="lazy" /> : null}
      <div className="entry__text">
        {s.text.split(/\n{2,}/).map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
      {s.reflection?.quote ? (
        <section className="reflection">
          <figure className="reflection__figure">
            <blockquote>
              <QuoteText r={s.reflection} />
            </blockquote>
            <figcaption>
              <Attribution r={s.reflection} />
            </figcaption>
          </figure>
          {s.reflection.bridge ? <p className="reflection__bridge">{s.reflection.bridge}</p> : null}
        </section>
      ) : null}
    </article>
  );
}

/** A read-only page for one entry, reached only by its unguessable link. */
export function SharedEntryPage({ token }: { token: string }) {
  const [state, setState] = useState<SharedSnapshot | null | "loading">("loading");
  useEffect(() => {
    setRobots("noindex, nofollow, noarchive");
    fetchSharedEntry(token).then(setState);
  }, [token]);
  useEffect(() => {
    if (state && state !== "loading") document.title = `${state.title} · Leaves`;
  }, [state]);
  return (
    <main className="page page--entry" id="main">
      {state === "loading" ? (
        <BreathingLeaf label="Loading" />
      ) : state ? (
        <SnapshotView s={state} seed={token} />
      ) : (
        <p className="empty">This link isn't shared anymore.</p>
      )}
    </main>
  );
}

/** The optional public page: entries marked Published, like a small quiet blog. */
export function PublicPageView({ handle }: { handle: string }) {
  const [page, setPage] = useState<PublicPage | null | "loading">("loading");
  useEffect(() => {
    fetchPublicPage(handle).then(setPage);
  }, [handle]);
  useEffect(() => {
    if (page && page !== "loading") document.title = `${page.title ?? page.handle} · Leaves`;
  }, [page]);
  if (page === "loading") {
    return (
      <main className="page" id="main">
        <BreathingLeaf label="Loading" />
      </main>
    );
  }
  if (!page) {
    return (
      <main className="page" id="main">
        <p className="empty">There's no page here.</p>
      </main>
    );
  }
  return (
    <main className="page page--public" id="main">
      <h1 className="page-title">{page.title ?? page.handle}</h1>
      {page.entries.length === 0 ? <p className="empty">Nothing here yet.</p> : null}
      <ol className="plain-list public-list">
        {page.entries.map((e) => (
          <li key={e.token}>
            <SnapshotView s={e} seed={e.token} headingLevel={2} />
          </li>
        ))}
      </ol>
    </main>
  );
}
