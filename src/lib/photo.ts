/**
 * Photos: accept HEIC, JPEG and PNG; fix orientation; resize to 2048px on the
 * long edge; compress; make a thumbnail. Re-encoding through a canvas drops
 * all EXIF data, including location and camera details.
 */

export const PHOTO_LONG_EDGE = 2048;
export const THUMB_LONG_EDGE = 480;
export const AI_LONG_EDGE = 768;

export const ACCEPTED_TYPES = "image/jpeg,image/png,image/heic,image/heif,.heic,.heif,.jpg,.jpeg,.png";

function isHeic(file: Blob & { name?: string }): boolean {
  return /hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name ?? "");
}

async function decode(file: Blob & { name?: string }): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch (err) {
    if (!isHeic(file)) throw err;
    // Browsers without native HEIC support: convert once, lazily loaded.
    const { default: heic2any } = await import("heic2any");
    const converted = (await heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 })) as Blob | Blob[];
    const jpeg = Array.isArray(converted) ? converted[0] : converted;
    return createImageBitmap(jpeg, { imageOrientation: "from-image" });
  }
}

function canvasFor(bitmap: ImageBitmap, longEdge: number) {
  const scale = Math.min(1, longEdge / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, w, h);
  return canvas;
}

export function canvasToBlob(canvas: HTMLCanvasElement, type = "image/jpeg", quality = 0.84): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not encode image"))), type, quality),
  );
}

export interface ProcessedPhoto {
  full: Blob;
  thumb: Blob;
  width: number;
  height: number;
}

export async function processPhoto(file: File): Promise<ProcessedPhoto> {
  const bitmap = await decode(file);
  try {
    const fullCanvas = canvasFor(bitmap, PHOTO_LONG_EDGE);
    const full = await canvasToBlob(fullCanvas, "image/jpeg", 0.86);
    const thumb = await canvasToBlob(canvasFor(bitmap, THUMB_LONG_EDGE), "image/jpeg", 0.8);
    return { full, thumb, width: fullCanvas.width, height: fullCanvas.height };
  } finally {
    bitmap.close();
  }
}

/** A small JPEG, as base64 without a data: prefix, for the reflection model. */
export async function smallCopyBase64(blob: Blob): Promise<string> {
  const bitmap = await createImageBitmap(blob);
  try {
    const small = await canvasToBlob(canvasFor(bitmap, AI_LONG_EDGE), "image/jpeg", 0.75);
    return blobToBase64(small);
  } finally {
    bitmap.close();
  }
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < buf.length; i += chunk) binary += String.fromCharCode(...buf.subarray(i, i + chunk));
  return btoa(binary);
}

export function base64ToBlob(b64: string, type: string): Blob {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type });
}
