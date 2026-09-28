import { app } from "../server/app.js";

/**
 * The Leaves API as a Vercel function. vercel.json sends every /api/... request
 * here with its route in __route, and the Hono app answers it as usual.
 */
async function handle(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const route = url.searchParams.get("__route");
  if (route !== null) {
    url.searchParams.delete("__route");
    url.pathname = `/api/${route}`;
    request = new Request(url, request);
  }
  return app.fetch(request);
}

export const GET = handle;
export const POST = handle;
