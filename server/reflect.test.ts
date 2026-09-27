// @vitest-environment node
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * Runs the reflection module against a stand-in for the Messages API, to check
 * schema validation, the rule checks, and the single retry.
 */

let server: Server;
let replies: unknown[] = [];
let requests: Record<string, unknown>[] = [];

const good = {
  title: "Gold on the river",
  themes: ["light"],
  mood: "calm",
  motif: "a small boat on still water",
  season: "autumn",
  timeOfDay: "evening",
  scene: "A small boat on a gold river.",
  illustrationAlt: "A small boat on a golden river.",
  photoAlt: null,
  quote: "Heaven is under our feet as well as over our heads.",
  author: "Henry David Thoreau",
  source: "Walden (1854)",
  isParaphrase: false,
  bridge: "The river held the light a little longer, and so did you.",
  crisis: false,
};

function message(text: string) {
  return {
    id: "msg_test",
    type: "message",
    role: "assistant",
    model: "claude-opus-5",
    content: [{ type: "text", text }],
    stop_reason: "end_turn",
    stop_sequence: null,
    usage: { input_tokens: 1, output_tokens: 1 },
  };
}

beforeAll(async () => {
  server = createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      requests.push(JSON.parse(body));
      const next = replies.shift() ?? good;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify(message(typeof next === "string" ? next : JSON.stringify(next))));
    });
  });
  await new Promise<void>((r) => server.listen(0, r));
  process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  process.env.ANTHROPIC_API_KEY = "test";
});

afterAll(() => server.close());

const req = {
  text: "Walked to the river after work.",
  photo: null,
  when: "Saturday, September 26, 9:42 PM",
  recentVoices: ["Seneca"],
  lovedVoices: [],
  skippedVoices: [],
  allowReligious: true,
};

describe("reflect", () => {
  it("returns a validated result and sends the entry only inside <entry> tags", async () => {
    replies = [good];
    requests = [];
    const { reflect } = await import("./reflect");
    const r = await reflect(req);
    expect(r.author).toBe("Henry David Thoreau");
    expect(requests).toHaveLength(1);
    const content = (requests[0].messages as { content: { type: string; text?: string }[] }[])[0].content;
    expect(content.at(-1)?.text).toContain("<entry>\nWalked to the river after work.\n</entry>");
    expect(requests[0].fallbacks).toBe("default");
  });

  it("retries once when a rule is broken, telling the model why", async () => {
    replies = [{ ...good, author: "Seneca" }, good];
    requests = [];
    const { reflect } = await import("./reflect");
    const r = await reflect(req);
    expect(r.author).toBe("Henry David Thoreau");
    expect(requests).toHaveLength(2);
    const retry = (requests[1].messages as { content: { text?: string }[] }[])[0].content.at(-1)?.text;
    expect(retry).toContain("recentVoices");
  }, 10_000);

  it("gives up after the retry so the app can use the starter library", async () => {
    replies = ["not json", "still not json"];
    requests = [];
    const { reflect } = await import("./reflect");
    await expect(reflect(req)).rejects.toThrow();
    expect(requests).toHaveLength(2);
  }, 10_000);
});
