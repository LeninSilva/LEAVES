import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import {
  OpeningThoughtSchema,
  ReflectionResultSchema,
  checkReflection,
  tidyReflection,
  wordCount,
  type OpeningThought,
  type OpeningThoughtRequest,
  type ReflectRequest,
  type ReflectionResult,
} from "../shared/schema";
import { OPENING_SYSTEM, REFLECTION_SYSTEM } from "./prompts";

/**
 * The one AI service module for text: typed requests and responses, schema
 * validation, timeouts, and one retry with backoff. Entry text is never logged.
 */

const MODEL = process.env.REFLECTION_MODEL || "claude-opus-5";
const TIMEOUT_MS = 90_000;

let client: Anthropic | null = null;
function anthropic(): Anthropic {
  // The SDK's own retries are off so this module owns the single retry.
  client ??= new Anthropic({ timeout: TIMEOUT_MS, maxRetries: 0 });
  return client;
}

export const reflectionsAvailable = () => Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);

export class ReflectionError extends Error {}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function withOneRetry<T>(attempt: (retryNote: string | null) => Promise<T>): Promise<T> {
  try {
    return await attempt(null);
  } catch (first) {
    // Bad requests won't get better on a second try.
    if (first instanceof Anthropic.BadRequestError || first instanceof Anthropic.AuthenticationError) throw first;
    await sleep(first instanceof Anthropic.RateLimitError ? 4000 : 1500);
    const note = first instanceof ReflectionError ? first.message : null;
    return attempt(note);
  }
}

function describeError(err: unknown): string {
  if (err instanceof Anthropic.APIError) return `API ${err.status ?? "error"}`;
  if (err instanceof ReflectionError) return "invalid result";
  return (err as Error)?.name ?? "error";
}

export async function reflect(req: ReflectRequest): Promise<ReflectionResult> {
  const context = {
    recentVoices: req.recentVoices,
    lovedVoices: req.lovedVoices,
    skippedVoices: req.skippedVoices,
    allowReligious: req.allowReligious,
  };
  try {
    return await withOneRetry(async (retryNote) => {
      const content: Anthropic.Beta.BetaContentBlockParam[] = [];
      if (req.photo) {
        content.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: req.photo } });
      }
      content.push({
        type: "text",
        text:
          `${JSON.stringify(context)}\n\nWritten: ${req.when}.${req.photo ? " The writer added the photo above." : " There is no photo."}\n\n` +
          `<entry>\n${req.text.trim() || "(No words, only the photo.)"}\n</entry>` +
          (retryNote ? `\n\nA previous answer was rejected because: ${retryNote}. Please correct this.` : ""),
      });
      const response = await anthropic().beta.messages.parse({
        model: MODEL,
        max_tokens: 16000,
        system: REFLECTION_SYSTEM,
        messages: [{ role: "user", content }],
        output_config: { format: betaZodOutputFormat(ReflectionResultSchema) },
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
      });
      if (response.stop_reason === "refusal") throw new ReflectionError("the request was declined");
      const parsed = response.parsed_output;
      if (!parsed) throw new ReflectionError("the JSON did not match the schema");
      const result = tidyReflection(ReflectionResultSchema.parse(parsed));
      const problems = checkReflection(result, context);
      if (problems.length) throw new ReflectionError(problems.join("; "));
      return result;
    });
  } catch (err) {
    console.warn(`reflect failed: ${describeError(err)}`);
    throw new ReflectionError("unavailable");
  }
}

export async function openingThought(req: OpeningThoughtRequest): Promise<OpeningThought> {
  try {
    return await withOneRetry(async (retryNote) => {
      const response = await anthropic().beta.messages.parse({
        model: MODEL,
        max_tokens: 4000,
        system: OPENING_SYSTEM,
        messages: [
          {
            role: "user",
            content: JSON.stringify(req) + (retryNote ? `\n\nA previous answer was rejected because: ${retryNote}.` : ""),
          },
        ],
        output_config: { format: betaZodOutputFormat(OpeningThoughtSchema), effort: "medium" },
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
      });
      if (response.stop_reason === "refusal") throw new ReflectionError("the request was declined");
      const parsed = response.parsed_output;
      if (!parsed) throw new ReflectionError("the JSON did not match the schema");
      const thought = OpeningThoughtSchema.parse(parsed);
      if (wordCount(thought.quote) >= 25) throw new ReflectionError("the line must be under 25 words");
      const author = thought.author.toLowerCase();
      if ([...req.recentVoices, ...req.skippedVoices].some((v) => v.trim() && author.includes(v.trim().toLowerCase()))) {
        throw new ReflectionError("that voice was recent or skipped");
      }
      return { ...thought, quote: thought.quote.replace(/^["“]|["”]$/g, "") };
    });
  } catch (err) {
    console.warn(`opening thought failed: ${describeError(err)}`);
    throw new ReflectionError("unavailable");
  }
}
