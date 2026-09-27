import type { Reflection } from "../lib/types";

export const CRISIS_NOTE =
  "If you're in the US, you can call or text 988 any time. Elsewhere, findahelpline.com lists free support lines near you. If you're in danger right now, call your local emergency number.";

/** Author and source, with "after" before paraphrases. */
export function Attribution({ r }: { r: Pick<Reflection, "author" | "source" | "isParaphrase"> }) {
  if (!r.author) return null;
  return (
    <p className="attribution">
      {r.isParaphrase ? "after " : ""}
      {r.author}
      {r.source ? <span className="attribution__source">, {r.source}</span> : null}
    </p>
  );
}

export function QuoteText({ r }: { r: Pick<Reflection, "quote" | "isParaphrase"> }) {
  if (!r.quote) return null;
  // Paraphrases appear without quotation marks.
  return <p className="quote">{r.isParaphrase ? r.quote : `“${r.quote}”`}</p>;
}

export function ReflectionView({ reflection, crisis }: { reflection: Reflection; crisis: boolean }) {
  return (
    <section className="reflection" aria-labelledby="reflection-heading">
      <h2 id="reflection-heading" className="visually-hidden">
        Reflection
      </h2>
      {!crisis && reflection.quote ? (
        <figure className="reflection__figure">
          <blockquote>
            <QuoteText r={reflection} />
          </blockquote>
          <figcaption>
            <Attribution r={reflection} />
          </figcaption>
        </figure>
      ) : null}
      {reflection.bridge ? <p className="reflection__bridge">{reflection.bridge}</p> : null}
      {crisis ? (
        <p className="reflection__crisis">
          If you're in the US, you can call or text <a href="tel:988">988</a> any time. Elsewhere,{" "}
          <a href="https://findahelpline.com" target="_blank" rel="noreferrer">
            findahelpline.com
          </a>{" "}
          lists free support lines near you. If you're in danger right now, call your local emergency number.
        </p>
      ) : null}
    </section>
  );
}
