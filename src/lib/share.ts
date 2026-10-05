import { formatStamp } from "./dates";
import { getBlob, updateEntry } from "./db";
import { supabase } from "./auth";
import { entryMarkdown, slug } from "./markdown";
import { newToken } from "./rng";
import { paperPath } from "../components/Illustration";
import type { Entry, Reflection } from "./types";

export { slug };

/**
 * Nothing leaves the app unless the person chooses. Place is left out unless
 * they turn it on. Photos were stripped of location and camera data when they
 * were added, so every copy shared here is clean.
 */

// ---- Markdown ---------------------------------------------------------------

export async function copyMarkdown(e: Entry, withPlace: boolean): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(entryMarkdown(e, { withPlace }));
    return true;
  } catch {
    return false;
  }
}

// ---- image card -------------------------------------------------------------

const CARD_W = 1080;
const CARD_H = 1350;

export interface CardOptions {
  image: "illustration" | "photo";
  excerpt: string;
  withReflection: boolean;
  withPlace: boolean;
  theme: "daylight" | "lamplight";
}

const CARD_COLORS = {
  daylight: { bg: "#eaf0e3", text: "#2b3326", muted: "#5c6655", line: "#d6dfcc" },
  lamplight: { bg: "#1e2923", text: "#e9e4d3", muted: "#aeb5a5", line: "#3a463f" },
};

function wrapLines(ctx: CanvasRenderingContext2D, text: string, width: number, maxLines: number): string[] {
  const out: string[] = [];
  for (const para of text.split(/\n+/)) {
    const words = para.split(/\s+/).filter(Boolean);
    let line = "";
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (ctx.measureText(test).width > width && line) {
        out.push(line);
        line = w;
      } else line = test;
      if (out.length >= maxLines) break;
    }
    if (line && out.length < maxLines) out.push(line);
    if (out.length >= maxLines) break;
  }
  const total = text.split(/\s+/).filter(Boolean).length;
  const used = out.join(" ").split(/\s+/).filter(Boolean).length;
  if (used < total && out.length) out[out.length - 1] = out[out.length - 1].replace(/[\s,.;:]*\S*$/, "") + "…";
  return out;
}

async function loadImage(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return img;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

export async function renderCard(e: Entry, o: CardOptions): Promise<Blob> {
  await Promise.all([
    document.fonts.load('600 56px "Literata"'),
    document.fonts.load('400 36px "Literata"'),
    document.fonts.load('italic 400 32px "Literata"'),
    document.fonts.load('600 28px "Nunito"'),
  ]).catch(() => undefined);
  const c = CARD_COLORS[o.theme];
  const canvas = document.createElement("canvas");
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = c.bg;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  const margin = 96;
  const inner = CARD_W - margin * 2;

  // Measure the words first, then give the picture the room that is left.
  ctx.font = '600 56px "Literata", Georgia, serif';
  const titleLines = wrapLines(ctx, e.title ?? "", inner, 2);
  ctx.font = '400 34px "Literata", Georgia, serif';
  const excerptLines = o.excerpt.trim() ? wrapLines(ctx, o.excerpt.trim(), inner, 5) : [];
  const r = o.withReflection && e.reflection && !e.crisis && e.reflection.quote ? e.reflection : null;
  ctx.font = 'italic 400 30px "Literata", Georgia, serif';
  const quoteText = r ? (r.isParaphrase ? r.quote! : `“${r.quote}”`) : "";
  const quoteLines = r ? wrapLines(ctx, quoteText, inner, 4) : [];
  // A photo keeps its caption on the card, like a blog post.
  const cardPhoto = o.image === "photo" ? e.photos[0] : undefined;
  ctx.font = 'italic 400 28px "Literata", Georgia, serif';
  const captionLines = cardPhoto?.caption.trim() ? wrapLines(ctx, cardPhoto.caption.trim().replace(/\s+/g, " "), inner, 2) : [];
  const captionHeight = captionLines.length ? 20 + captionLines.length * 40 : 0;

  const textHeight =
    titleLines.length * 68 +
    24 +
    40 +
    captionHeight +
    (excerptLines.length ? 32 + excerptLines.length * 52 : 0) +
    (quoteLines.length ? 48 + quoteLines.length * 44 + 44 : 0);
  const imageSize = Math.max(360, Math.min(inner, CARD_H - margin * 2 - textHeight - 48));

  const ref = cardPhoto ? cardPhoto.url : e.illustration?.url;
  const blob = ref ? await getBlob(ref) : undefined;
  let y = margin;
  if (blob) {
    const img = await loadImage(blob);
    const x = (CARD_W - imageSize) / 2;
    ctx.save();
    if (o.image === "photo") {
      const radius = 48;
      ctx.beginPath();
      ctx.roundRect(x, y, imageSize, imageSize, radius);
      ctx.clip();
    } else {
      const path = new Path2D();
      const m = new DOMMatrix([imageSize, 0, 0, imageSize, x, y]);
      path.addPath(new Path2D(paperPath(e.id)), m);
      ctx.clip(path);
    }
    // cover-fit
    const s = Math.max(imageSize / img.naturalWidth, imageSize / img.naturalHeight);
    const w = img.naturalWidth * s;
    const h = img.naturalHeight * s;
    ctx.drawImage(img, x + (imageSize - w) / 2, y + (imageSize - h) / 2, w, h);
    ctx.restore();
    y += imageSize;
    if (captionLines.length) {
      y += 20;
      ctx.textBaseline = "top";
      ctx.fillStyle = c.muted;
      ctx.font = 'italic 400 28px "Literata", Georgia, serif';
      for (const line of captionLines) {
        ctx.fillText(line, margin, y);
        y += 40;
      }
    }
    y += 48;
  }

  ctx.textBaseline = "top";
  ctx.fillStyle = c.text;
  ctx.font = '600 56px "Literata", Georgia, serif';
  for (const line of titleLines) {
    ctx.fillText(line, margin, y);
    y += 68;
  }
  y += 16;
  ctx.fillStyle = c.muted;
  ctx.font = '600 28px "Nunito", system-ui, sans-serif';
  ctx.fillText(formatStamp(e, { withPlace: o.withPlace }), margin, y);
  y += 40;
  if (excerptLines.length) {
    y += 32;
    ctx.fillStyle = c.text;
    ctx.font = '400 34px "Literata", Georgia, serif';
    for (const line of excerptLines) {
      ctx.fillText(line, margin, y);
      y += 52;
    }
  }
  if (r) {
    y += 48;
    ctx.fillStyle = c.text;
    ctx.font = 'italic 400 30px "Literata", Georgia, serif';
    for (const line of quoteLines) {
      ctx.fillText(line, margin, y);
      y += 44;
    }
    ctx.fillStyle = c.muted;
    ctx.font = '600 24px "Nunito", system-ui, sans-serif';
    ctx.fillText(`${r.isParaphrase ? "after " : ""}${r.author ?? ""}`, margin, y + 6);
  }
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("card"))), "image/png"));
}

export async function shareFile(blob: Blob, name: string, title: string): Promise<"shared" | "downloaded" | "cancelled"> {
  const file = new File([blob], name, { type: blob.type });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
      return "shared";
    } catch (err) {
      if ((err as DOMException).name === "AbortError") return "cancelled";
    }
  }
  downloadBlob(blob, name);
  return "downloaded";
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

// ---- links and the public page ------------------------------------------------

export interface SharedSnapshot {
  title: string;
  text: string;
  stamp: string;
  finishedAt: string;
  illustrationUrl: string | null;
  illustrationAlt: string;
  /** Older links have a single photo here; newer ones use photos. */
  photoUrl?: string | null;
  photoAlt?: string;
  photos?: { url: string; alt: string; caption: string }[];
  reflection: Pick<Reflection, "quote" | "author" | "source" | "isParaphrase" | "bridge"> | null;
}

async function uploadShared(uid: string, token: string, name: string, ref: string | undefined): Promise<string | null> {
  if (!ref) return null;
  const blob = await getBlob(ref);
  if (!blob) return null;
  const sb = (await supabase())!;
  const ext = blob.type.includes("svg") ? "svg" : blob.type.includes("webp") ? "webp" : "jpg";
  const path = `${uid}/${token}/${name}.${ext}`;
  const { error } = await sb.storage.from("shared").upload(path, blob, { upsert: true, contentType: blob.type });
  if (error) throw error;
  return sb.storage.from("shared").getPublicUrl(path).data.publicUrl;
}

async function uploadSharedPhotos(uid: string, token: string, e: Entry) {
  const out: { url: string; alt: string; caption: string }[] = [];
  for (const [i, p] of e.photos.entries()) {
    const url = await uploadShared(uid, token, `photo-${i + 1}`, p.url);
    if (url) out.push({ url, alt: p.alt, caption: p.caption });
  }
  return out;
}

export interface SnapshotOptions {
  withPhoto: boolean;
  withReflection: boolean;
  withPlace: boolean;
}

async function makeShare(e: Entry, kind: "link" | "published", o: SnapshotOptions): Promise<string> {
  const sb = await supabase();
  if (!sb) throw new Error("Sharing links need the cloud to be set up.");
  const { data } = await sb.auth.getSession();
  const uid = data.session?.user.id;
  if (!uid) throw new Error("Sign in to share a link.");
  // Replace any earlier share of the same kind for this entry.
  await removeShare(e, kind);
  const token = newToken();
  const snapshot: SharedSnapshot = {
    title: e.title ?? "Untitled",
    text: e.text,
    stamp: formatStamp(e, { withPlace: o.withPlace }),
    finishedAt: e.finishedAt ?? "",
    illustrationUrl: await uploadShared(uid, token, "illustration", e.illustration?.url),
    illustrationAlt: e.illustration?.alt ?? "",
    photos: o.withPhoto ? await uploadSharedPhotos(uid, token, e) : [],
    reflection:
      o.withReflection && e.reflection && !e.crisis
        ? {
            quote: e.reflection.quote,
            author: e.reflection.author,
            source: e.reflection.source,
            isParaphrase: e.reflection.isParaphrase,
            bridge: e.reflection.bridge,
          }
        : null,
  };
  const { error } = await sb.from("shares").insert({ token, user_id: uid, entry_id: e.id, kind, snapshot });
  if (error) throw error;
  return token;
}

/** Turns off a link or public page for an entry, and removes the copies of its pictures that were made for it. */
export async function removeSharesFor(entryId: string, kind?: "link" | "published") {
  const sb = await supabase();
  if (!sb) return;
  const { data } = await sb.auth.getSession();
  const uid = data.session?.user.id;
  if (!uid) throw new Error("Sign in to turn off a link.");
  let query = sb.from("shares").select("token").eq("entry_id", entryId);
  if (kind) query = query.eq("kind", kind);
  const { data: rows, error } = await query;
  if (error) throw error;
  for (const row of rows ?? []) {
    const token = row.token as string;
    const { data: files } = await sb.storage.from("shared").list(`${uid}/${token}`);
    if (files?.length) await sb.storage.from("shared").remove(files.map((f) => `${uid}/${token}/${f.name}`));
  }
  let del = sb.from("shares").delete().eq("entry_id", entryId);
  if (kind) del = del.eq("kind", kind);
  const { error: delError } = await del;
  if (delError) throw delError;
}

async function removeShare(e: Entry, kind: "link" | "published") {
  await removeSharesFor(e.id, kind);
}

export function shareUrl(token: string) {
  return `${location.origin}/s/${token}`;
}

export async function createLink(e: Entry, o: SnapshotOptions): Promise<string> {
  const token = await makeShare(e, "link", o);
  await updateEntry(e.id, (x) => ({ ...x, share: { ...x.share, linkToken: token } }));
  return shareUrl(token);
}

export async function revokeLink(e: Entry) {
  await removeShare(e, "link");
  await updateEntry(e.id, (x) => ({ ...x, share: { ...x.share, linkToken: null } }));
}

export async function publish(e: Entry, o: SnapshotOptions) {
  await makeShare(e, "published", o);
  await updateEntry(e.id, (x) => ({ ...x, share: { ...x.share, published: true } }));
}

export async function unpublish(e: Entry) {
  await removeShare(e, "published");
  await updateEntry(e.id, (x) => ({ ...x, share: { ...x.share, published: false } }));
}

export async function getProfile(): Promise<{ handle: string; title: string | null } | null> {
  const sb = await supabase();
  if (!sb) return null;
  const { data } = await sb.from("profiles").select("handle, title").maybeSingle();
  return (data as { handle: string; title: string | null } | null) ?? null;
}

export async function saveProfile(handle: string, title: string | null): Promise<string | null> {
  const sb = await supabase();
  if (!sb) return "Sharing isn't set up on this server.";
  const clean = handle.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{2,29}$/.test(clean)) return "Use 3 to 30 letters, numbers or dashes.";
  const { data } = await sb.auth.getSession();
  const uid = data.session?.user.id;
  if (!uid) return "Sign in first.";
  const { error } = await sb.from("profiles").upsert({ user_id: uid, handle: clean, title });
  if (error) return error.code === "23505" ? "That name is taken. Try another." : "Couldn't save. Try again.";
  return null;
}

export async function fetchSharedEntry(token: string): Promise<SharedSnapshot | null> {
  const sb = await supabase();
  if (!sb) return null;
  const { data, error } = await sb.rpc("get_shared_entry", { p_token: token });
  if (error) return null;
  return (data as SharedSnapshot | null) ?? null;
}

export interface PublicPage {
  title: string | null;
  handle: string;
  entries: (SharedSnapshot & { token: string })[];
}

export async function fetchPublicPage(handle: string): Promise<PublicPage | null> {
  const sb = await supabase();
  if (!sb) return null;
  const { data, error } = await sb.rpc("get_public_page", { p_handle: handle });
  if (error) return null;
  return (data as PublicPage | null) ?? null;
}
