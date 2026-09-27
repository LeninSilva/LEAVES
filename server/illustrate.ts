import sharp from "sharp";
import type { IllustrateRequest, IllustrateResponse } from "../shared/schema";
import { illustrationPrompt } from "./prompts";

/**
 * Illustrations come from an image model on the server (OpenAI's gpt-image-1
 * by default). Each result is saved as a 1024px WebP plus a thumbnail. When no
 * provider is set, the app draws its own SVG vignette instead.
 */

const PROVIDER = process.env.IMAGE_PROVIDER?.toLowerCase() || "";
const TIMEOUT_MS = 150_000;

export const illustrationsAvailable = () => PROVIDER === "openai" && Boolean(process.env.OPENAI_API_KEY);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function generateOpenAI(prompt: string): Promise<Buffer> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1",
        prompt,
        size: "1024x1024",
        quality: "medium",
        n: 1,
      }),
    });
    if (!res.ok) throw new Error(`image ${res.status}`);
    const json = (await res.json()) as { data?: { b64_json?: string }[] };
    const b64 = json.data?.[0]?.b64_json;
    if (!b64) throw new Error("image missing");
    return Buffer.from(b64, "base64");
  } finally {
    clearTimeout(timer);
  }
}

export async function illustrate(req: IllustrateRequest): Promise<IllustrateResponse> {
  const prompt = illustrationPrompt(req);
  let png: Buffer;
  try {
    png = await generateOpenAI(prompt);
  } catch {
    await sleep(2000);
    png = await generateOpenAI(prompt);
  }
  const image = await sharp(png).resize(1024, 1024, { fit: "cover" }).webp({ quality: 82 }).toBuffer();
  const thumb = await sharp(png).resize(256, 256, { fit: "cover" }).webp({ quality: 78 }).toBuffer();
  return { image: image.toString("base64"), thumb: thumb.toString("base64") };
}
