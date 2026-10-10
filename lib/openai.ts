// Minimal OpenAI Chat Completions client: gpt-4o, temperature 0, strict JSON schema output.
// OPENAI_API_KEY comes from the environment and is never logged or returned.
import type { TokenUsage } from "./types";

export const MODEL = "gpt-4o";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export type JsonCall = {
  /** Short label for the spend log, e.g. "criteria", "questions", "free_text e3". */
  label: string;
  messages: ChatMessage[];
  schemaName: string;
  schema: Record<string, unknown>;
  maxTokens?: number;
};

export type JsonResult<T> = { data: T; raw: string; usage: { prompt_tokens: number; completion_tokens: number } };

/** Anything that can answer a JsonCall. Tests pass a fake; production uses openaiJson. */
export type LlmJson = <T>(call: JsonCall) => Promise<JsonResult<T>>;

export class OpenAIError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "OpenAIError";
  }
}

export const openaiJson: LlmJson = async <T>(call: JsonCall): Promise<JsonResult<T>> => {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new OpenAIError("OPENAI_API_KEY is not set", 500);
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0,
      seed: 7,
      max_tokens: call.maxTokens ?? 8000,
      messages: call.messages,
      response_format: {
        type: "json_schema",
        json_schema: { name: call.schemaName, strict: true, schema: call.schema },
      },
    }),
    signal: AbortSignal.timeout(180_000),
    cache: "no-store",
  });
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const body: any = await res.json().catch(() => null);
  if (!res.ok) {
    throw new OpenAIError(`OpenAI ${res.status}: ${body?.error?.message ?? "no error message"}`, res.status);
  }
  const choice = body?.choices?.[0];
  if (choice?.message?.refusal) throw new OpenAIError(`OpenAI refused: ${choice.message.refusal}`, 502);
  if (choice?.finish_reason === "length") throw new OpenAIError("OpenAI output was cut off (max tokens)", 502);
  const raw: string = choice?.message?.content ?? "";
  const usage = {
    prompt_tokens: body?.usage?.prompt_tokens ?? 0,
    completion_tokens: body?.usage?.completion_tokens ?? 0,
  };
  console.log(`[openai] ${call.label}: ${usage.prompt_tokens} in, ${usage.completion_tokens} out (${MODEL})`);
  return { data: JSON.parse(raw) as T, raw, usage };
};

export function emptyUsage(): TokenUsage {
  return { calls: 0, prompt_tokens: 0, completion_tokens: 0 };
}

export function addUsage(total: TokenUsage, u: { prompt_tokens: number; completion_tokens: number }): TokenUsage {
  total.calls += 1;
  total.prompt_tokens += u.prompt_tokens;
  total.completion_tokens += u.completion_tokens;
  return total;
}
