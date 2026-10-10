// Passcode rate limit: 5 wrong attempts per 10 minutes per address, then 429.
// Stored in login_attempts (service role) so it holds across serverless instances.
// Addresses are kept only as a keyed hash.
import "server-only";
import { createHash } from "node:crypto";
import { db } from "./supabase";

export const MAX_WRONG_ATTEMPTS = 5;
export const WINDOW_MINUTES = 10;

export function clientAddress(headers: Headers): string {
  return (
    headers.get("x-real-ip")?.trim() ||
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

export function hashAddress(address: string, secret: string): string {
  return createHash("sha256").update(`${secret}|login|${address}`).digest("hex");
}

export async function wrongAttemptsInWindow(ipHash: string, nowMs: number = Date.now()): Promise<number> {
  const since = new Date(nowMs - WINDOW_MINUTES * 60_000).toISOString();
  const { count, error } = await db()
    .from("login_attempts")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("created_at", since);
  if (error) throw new Error(`login_attempts count failed: ${error.message}`);
  return count ?? 0;
}

export async function recordWrongAttempt(ipHash: string): Promise<void> {
  const { error } = await db().from("login_attempts").insert({ ip_hash: ipHash });
  if (error) throw new Error(`login_attempts insert failed: ${error.message}`);
}
