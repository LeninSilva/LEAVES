import { zipSync, strToU8 } from "fflate";
import { finishedEntries, getBlob } from "./db";
import { entryDay, zonedParts } from "./dates";
import { entryMarkdown, slug } from "./share";
import type { Entry } from "./types";

/**
 * "Export everything": one Markdown file per entry (date, time, place, title,
 * text, reflection) plus every photo and illustration, in one ZIP.
 */

function ext(type: string): string {
  if (type.includes("svg")) return "svg";
  if (type.includes("webp")) return "webp";
  if (type.includes("png")) return "png";
  return "jpg";
}

function baseName(e: Entry, used: Set<string>): string {
  const p = e.finishedAt ? zonedParts(e.finishedAt, e.timeZone) : null;
  const time = p ? `${String(p.hour).padStart(2, "0")}${String(p.minute).padStart(2, "0")}` : "0000";
  let name = `${entryDay(e)}-${time}-${slug(e.title ?? "entry")}`;
  let n = 2;
  while (used.has(name)) name = `${entryDay(e)}-${time}-${slug(e.title ?? "entry")}-${n++}`;
  used.add(name);
  return name;
}

export async function buildExport(): Promise<Blob> {
  const entries = await finishedEntries();
  const files: Record<string, Uint8Array> = {};
  const used = new Set<string>();
  const book: string[] = ["# Reflections", ""];

  for (const e of [...entries].reverse()) {
    const name = baseName(e, used);
    let md = entryMarkdown(e, { withPlace: true, frontMatter: true });
    const images: string[] = [];
    if (e.illustration) {
      const blob = await getBlob(e.illustration.url);
      if (blob) {
        const file = `illustrations/${name}.${ext(blob.type)}`;
        files[file] = new Uint8Array(await blob.arrayBuffer());
        images.push(`![${e.illustration.alt.replace(/[[\]]/g, "")}](../${file})`);
      }
    }
    if (e.photo) {
      const blob = await getBlob(e.photo.url);
      if (blob) {
        const file = `photos/${name}.${ext(blob.type)}`;
        files[file] = new Uint8Array(await blob.arrayBuffer());
        images.push(`![${(e.photo.alt || "Photo").replace(/[[\]]/g, "")}](../${file})`);
      }
    }
    if (images.length) md = md.replace(/\n# /, `\n${images.join("\n\n")}\n\n# `);
    files[`entries/${name}.md`] = strToU8(md);
    if (e.reflection?.quote && !e.crisis) {
      const r = e.reflection;
      book.push(`> ${r.isParaphrase ? r.quote : `“${r.quote}”`}`, ">", `> ${r.isParaphrase ? "after " : ""}${r.author ?? ""}${r.source ? `, ${r.source}` : ""}`, "", `From [${e.title}](entries/${name}.md)`, "");
    }
  }
  files["reflections.md"] = strToU8(book.join("\n"));
  files["README.md"] = strToU8(
    `# Leaves export\n\nExported ${new Date().toISOString()}.\n\n- entries/: one Markdown file per entry\n- photos/: your photos\n- illustrations/: the drawing made for each entry\n- reflections.md: every reflection you received\n`,
  );
  const zipped = zipSync(files, { level: 6 });
  return new Blob([zipped], { type: "application/zip" });
}
