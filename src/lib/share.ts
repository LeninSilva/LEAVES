import { entryArtUrl, entrySubject, subjectAlt } from "./art";
import { CARD_H, CARD_W, FONTS, MARGIN, planCard, type FontKey } from "./cardLayout";
import { formatStamp } from "./dates";
import { getBlob, updateEntry } from "./db";
import { supabase } from "./auth";
import { entryMarkdown, slug } from "./markdown";
import { newToken } from "./rng";
import { paperPath } from "../components/Illustration";
import type { ResolvedTheme } from "./theme";
import type { Entry, IllustrationStyle, Reflection } from "./types";

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

export interface CardOptions {
  image: "illustration" | "photo";
  excerpt: string;
  withReflection: boolean;
  withPlace: boolean;
  theme: ResolvedTheme;
  style: IllustrationStyle;
}

const CARD_COLORS = {
  daylight: { bg: "#eaf0e3", text: "#2b3326", muted: "#5c6655", line: "#c9d4bd", shadow: "rgba(43, 51, 38, 0.14)" },
  lamplight: { bg: "#1e2923", text: "#e9e4d3", muted: "#aeb5a5", line: "#3a463f", shadow: "rgba(0, 0, 0, 0.35)" },
};

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

/**
 * The picture shown with an entry in the chosen style and theme: the artwork that ships with the app,
 * or the entry's own drawing. If the shipped file can't be fetched (offline, never opened), the own
 * drawing stands in, so a card or a link can always be made.
 */
export async function entryPicture(e: Entry, style: IllustrationStyle, theme: ResolvedTheme): Promise<{ blob: Blob; alt: string; shipped: boolean } | null> {
  const subject = entrySubject(e);
  if (style !== "drawn" && subject) {
    try {
      const res = await fetch(entryArtUrl(style, theme, subject, "large"));
      if (res.ok) return { blob: await res.blob(), alt: subjectAlt(subject, style), shipped: true };
    } catch {
      /* fall back to the entry's own drawing */
    }
  }
  const own = e.illustration ? await getBlob(e.illustration.url) : undefined;
  return own && e.illustration ? { blob: own, alt: e.illustration.alt, shipped: false } : null;
}

/** The card as a PNG. `scale` below 1 makes a small copy for the preview. */
export async function renderCard(e: Entry, o: CardOptions, scale = 1): Promise<Blob> {
  await Promise.all([
    document.fonts.load('600 56px "Literata"'),
    document.fonts.load('400 34px "Literata"'),
    document.fonts.load('italic 400 30px "Literata"'),
    document.fonts.load('600 28px "Nunito"'),
  ]).catch(() => undefined);
  const c = CARD_COLORS[o.theme];
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(CARD_W * scale);
  canvas.height = Math.round(CARD_H * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.scale(scale, scale);
  ctx.fillStyle = c.bg;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  const measure = (font: FontKey, text: string) => {
    ctx.font = FONTS[font].css;
    return ctx.measureText(text).width;
  };
  const cardPhoto = o.image === "photo" ? e.photos[0] : undefined;
  const reflection = o.withReflection && e.reflection && !e.crisis && e.reflection.quote ? e.reflection : null;
  const picture = cardPhoto
    ? await getBlob(cardPhoto.url).then((blob) => (blob ? { blob, shipped: false } : null))
    : o.image === "illustration"
      ? await entryPicture(e, o.style, o.theme)
      : null;
  const plan = planCard(measure, {
    title: e.title ?? "",
    stamp: formatStamp(e, { withPlace: o.withPlace }),
    excerpt: o.excerpt,
    caption: cardPhoto?.caption ?? "",
    quote: reflection ? (reflection.isParaphrase ? reflection.quote! : `“${reflection.quote}”`) : "",
    source: reflection?.author ? `${reflection.isParaphrase ? "after " : ""}${reflection.author}${reflection.source ? `, ${reflection.source}` : ""}` : "",
    hasPicture: !!picture,
  });

  ctx.textBaseline = "top";
  let y = MARGIN;
  if (picture && plan.imageSize > 0) {
    const img = await loadImage(picture.blob);
    const size = plan.imageSize;
    const x = (CARD_W - size) / 2;
    ctx.save();
    if (picture.shipped) {
      // The shipped pictures have their own paper edges; they only need lifting off the page.
      ctx.shadowColor = c.shadow;
      ctx.shadowBlur = 28;
      ctx.shadowOffsetY = 8;
      ctx.drawImage(img, x, y, size, size);
    } else {
      if (cardPhoto) {
        ctx.beginPath();
        ctx.roundRect(x, y, size, size, 48);
        ctx.clip();
      } else {
        const path = new Path2D();
        path.addPath(new Path2D(paperPath(e.id)), new DOMMatrix([size, 0, 0, size, x, y]));
        ctx.clip(path);
      }
      const s = Math.max(size / img.naturalWidth, size / img.naturalHeight);
      const w = img.naturalWidth * s;
      const h = img.naturalHeight * s;
      ctx.drawImage(img, x + (size - w) / 2, y + (size - h) / 2, w, h);
    }
    ctx.restore();
    y += size;
    if (plan.caption.length) {
      y += 20;
      ctx.fillStyle = c.muted;
      ctx.font = FONTS.caption.css;
      for (const line of plan.caption) {
        ctx.fillText(line, MARGIN, y);
        y += FONTS.caption.line;
      }
    }
    y += 48;
  }

  ctx.fillStyle = c.text;
  ctx.font = FONTS.title.css;
  for (const line of plan.title) {
    ctx.fillText(line, MARGIN, y);
    y += FONTS.title.line;
  }
  y += 16;
  ctx.fillStyle = c.muted;
  ctx.font = FONTS.stamp.css;
  const stamp = formatStamp(e, { withPlace: o.withPlace });
  if (stamp) {
    ctx.fillText(stamp, MARGIN, y);
    y += FONTS.stamp.line;
  }
  if (plan.excerpt.length) {
    y += 32;
    ctx.fillStyle = c.text;
    ctx.font = FONTS.excerpt.css;
    for (const line of plan.excerpt) {
      ctx.fillText(line, MARGIN, y);
      y += FONTS.excerpt.line;
    }
  }
  if (plan.quote.length) {
    y += 22;
    ctx.fillStyle = c.line;
    ctx.fillRect(MARGIN, y, 64, 3);
    y += 22;
    ctx.fillStyle = c.text;
    ctx.font = FONTS[plan.quoteFont].css;
    for (const line of plan.quote) {
      ctx.fillText(line, MARGIN, y);
      y += FONTS[plan.quoteFont].line;
    }
    if (plan.source) {
      y += 8;
      ctx.fillStyle = c.muted;
      ctx.font = FONTS.source.css;
      ctx.fillText(plan.source, MARGIN, y);
    }
  }

  // A strip of grass along the foot, as on the Write screen.
  try {
    const res = await fetch(`/art/grass/${o.theme}.svg`);
    if (res.ok) {
      const grass = await loadImage(await res.blob());
      const h = 56;
      const w = (grass.naturalWidth / grass.naturalHeight) * h;
      for (let gx = 0; gx < CARD_W; gx += w) ctx.drawImage(grass, gx, CARD_H - h, w, h);
    }
  } catch {
    /* the card is complete without it */
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

async function uploadShared(uid: string, token: string, name: string, ref: string | Blob | undefined): Promise<string | null> {
  if (!ref) return null;
  const blob = typeof ref === "string" ? await getBlob(ref) : ref;
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
  /** The picture the writer sees on the entry, so a shared page shows the same one. */
  style: IllustrationStyle;
  theme: ResolvedTheme;
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
  const picture = await entryPicture(e, o.style, o.theme);
  const snapshot: SharedSnapshot = {
    title: e.title ?? "Untitled",
    text: e.text,
    stamp: formatStamp(e, { withPlace: o.withPlace }),
    finishedAt: e.finishedAt ?? "",
    illustrationUrl: await uploadShared(uid, token, "illustration", picture?.blob),
    illustrationAlt: picture?.alt ?? "",
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
