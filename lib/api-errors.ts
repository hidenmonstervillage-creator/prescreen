// Turns thrown errors into JSON responses with a plain message and no secrets.
import { CtgovError } from "./ctgov";
import { OpenAIError } from "./openai";

export function errorResponse(err: unknown, label: string): Response {
  const e = err as Error;
  if (err instanceof CtgovError) {
    return Response.json({ error: e.message }, { status: err.status === 404 || err.status === 400 ? err.status : 502 });
  }
  if (err instanceof OpenAIError) {
    console.error(`[${label}] ${e.message}`);
    return Response.json({ error: "The question writer is unavailable right now. Try again in a minute." }, { status: 502 });
  }
  console.error(`[${label}] ${e?.message ?? String(err)}`);
  return Response.json({ error: e?.message ?? "Something went wrong." }, { status: 500 });
}
