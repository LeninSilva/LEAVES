import { Zip, ZipDeflate, ZipPassThrough, inflateSync, strToU8 } from "fflate";

/** Folds finished chunks into one Blob after this many bytes, so a big backup is never held as one array. */
const FOLD_AFTER = 8 * 1024 * 1024;

/**
 * Builds a ZIP one file at a time. A notebook with thousands of photos never has
 * to fit in memory at once: each picture is added and let go, and the browser is
 * free to keep the growing result on disk.
 */
export class ZipWriter {
  private parts: BlobPart[] = [];
  private buffered = 0;
  private readonly zip: Zip;
  private readonly finished: Promise<Blob>;

  constructor() {
    let resolve!: (b: Blob) => void;
    let reject!: (e: unknown) => void;
    this.finished = new Promise<Blob>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    this.zip = new Zip((err, chunk, final) => {
      if (err) {
        reject(err);
        return;
      }
      this.parts.push(chunk);
      this.buffered += chunk.length;
      if (this.buffered > FOLD_AFTER) {
        this.parts = [new Blob(this.parts)];
        this.buffered = 0;
      }
      if (final) resolve(new Blob(this.parts, { type: "application/zip" }));
    });
  }

  text(name: string, text: string) {
    const file = new ZipDeflate(name, { level: 6 });
    this.zip.add(file);
    file.push(strToU8(text), true);
  }

  /** Photos are already compressed, so they are stored as they are; text-like files are squeezed. */
  async blob(name: string, blob: Blob, opts: { compress?: boolean } = {}) {
    const file = opts.compress ? new ZipDeflate(name, { level: 6 }) : new ZipPassThrough(name);
    this.zip.add(file);
    file.push(new Uint8Array(await blob.arrayBuffer()), true);
  }

  finish(): Promise<Blob> {
    this.zip.end();
    return this.finished;
  }
}

export interface ZipEntry {
  name: string;
  method: number;
  compressedSize: number;
  offset: number;
}

const u16 = (d: DataView, o: number) => d.getUint16(o, true);
const u32 = (d: DataView, o: number) => d.getUint32(o, true);

/**
 * Lists the files in a ZIP by reading only its directory at the end, so a very
 * large backup can be opened without loading the whole thing.
 */
export async function readZipDirectory(file: Blob): Promise<Map<string, ZipEntry>> {
  const tailSize = Math.min(file.size, 22 + 0xffff);
  const tail = new Uint8Array(await file.slice(file.size - tailSize).arrayBuffer());
  let at = tail.length - 22;
  while (at >= 0 && !(tail[at] === 0x50 && tail[at + 1] === 0x4b && tail[at + 2] === 5 && tail[at + 3] === 6)) at--;
  if (at < 0) throw new Error("Not a ZIP file");
  const end = new DataView(tail.buffer, tail.byteOffset + at, 22);
  const total = u16(end, 10);
  const size = u32(end, 12);
  const offset = u32(end, 16);
  if (total === 0xffff || offset === 0xffffffff) throw new Error("This ZIP is too large to open here");

  const dir = new Uint8Array(await file.slice(offset, offset + size).arrayBuffer());
  const list = new Map<string, ZipEntry>();
  const decoder = new TextDecoder("utf-8");
  let p = 0;
  while (p + 46 <= dir.length) {
    const d = new DataView(dir.buffer, dir.byteOffset + p, 46);
    if (u32(d, 0) !== 0x02014b50) break;
    const nameLength = u16(d, 28);
    const name = decoder.decode(dir.subarray(p + 46, p + 46 + nameLength));
    list.set(name, { name, method: u16(d, 10), compressedSize: u32(d, 20), offset: u32(d, 42) });
    p += 46 + nameLength + u16(d, 30) + u16(d, 32);
  }
  return list;
}

/** One file's contents, read straight from the ZIP. */
export async function readZipFile(file: Blob, entry: ZipEntry): Promise<Uint8Array> {
  const head = new DataView(await file.slice(entry.offset, entry.offset + 30).arrayBuffer());
  if (u32(head, 0) !== 0x04034b50) throw new Error("Damaged ZIP file");
  const start = entry.offset + 30 + u16(head, 26) + u16(head, 28);
  const data = new Uint8Array(await file.slice(start, start + entry.compressedSize).arrayBuffer());
  if (entry.method === 0) return data;
  if (entry.method === 8) return inflateSync(data);
  throw new Error("This ZIP uses a kind of compression Leaves can't read");
}
