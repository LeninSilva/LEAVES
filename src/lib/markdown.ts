import { formatStamp } from "./dates";
import type { Entry, Reflection } from "./types";

/** A short, safe file name from a title. */
export function slug(s: string): string {
  return (
    s
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "entry"
  );
}

function reflectionMarkdown(r: Reflection, crisis: boolean): string {
  const blocks: string[] = [];
  if (!crisis && r.quote) {
    const quote = r.isParaphrase ? r.quote : `“${r.quote}”`;
    const by = `${r.isParaphrase ? "after " : ""}${r.author ?? ""}${r.source ? `, ${r.source}` : ""}`;
    blocks.push(`> ${quote}\n>\n> ${by}`);
  }
  if (r.bridge) blocks.push(r.bridge);
  return blocks.join("\n\n");
}

export interface MarkdownOptions {
  withPlace: boolean;
  withReflection?: boolean;
  frontMatter?: boolean;
  /** Where each photo was saved in an export, by photo id. Without it, captions are written as plain lines. */
  imagePaths?: Map<string, string>;
  /** The entry's drawing, as saved in an export. */
  illustration?: { path: string; alt: string };
}

const oneLine = (s: string) => s.trim().replace(/\s+/g, " ");
const forAlt = (s: string) => s.replace(/[[\]]/g, "");

export function entryMarkdown(e: Entry, opts: MarkdownOptions): string {
  const lines: string[] = [];
  if (opts.frontMatter) {
    const esc = (s: string) => JSON.stringify(s);
    lines.push("---");
    lines.push(`title: ${esc(e.title ?? "")}`);
    lines.push(`date: ${e.finishedAt ?? ""}`);
    if (e.status === "draft") lines.push("draft: true");
    if (e.startedAt) lines.push(`began: ${e.startedAt}`);
    lines.push(`timeZone: ${e.timeZone}`);
    if (e.place && opts.withPlace) lines.push(`place: ${esc(e.place.name)}`);
    if (e.editedAt) lines.push(`edited: ${e.editedAt}`);
    if (e.mood) lines.push(`mood: ${e.mood}`);
    lines.push("---", "");
  }
  if (opts.illustration) lines.push(`![${forAlt(opts.illustration.alt)}](${opts.illustration.path})`, "");
  lines.push(`# ${e.title ?? "Untitled"}`, "");
  const stamp = formatStamp(e, { withPlace: opts.withPlace });
  if (stamp) lines.push(`*${stamp}*`, "");
  if (opts.imagePaths) {
    for (const p of e.photos) {
      const path = opts.imagePaths.get(p.id);
      if (!path) continue;
      lines.push(`![${forAlt(p.alt || p.caption || "Photo")}](${path})`, "");
      if (p.caption.trim()) lines.push(`*${oneLine(p.caption)}*`, "");
    }
  }
  if (e.text.trim()) lines.push(e.text.trim(), "");
  if (!opts.imagePaths) {
    for (const p of e.photos) if (p.caption.trim()) lines.push(`*Photo: ${oneLine(p.caption)}*`, "");
  }
  if (opts.withReflection !== false && e.reflection) {
    lines.push("---", "", reflectionMarkdown(e.reflection, e.crisis), "");
  }
  return lines.join("\n");
}
