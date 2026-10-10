// Two address-based limits, stored in Supabase (service role) so they hold across
// serverless instances. Addresses are kept only as a keyed hash.
// - Passcode: 5 wrong attempts per 10 minutes per address, then 429 (login_attempts).
// - Public submit: 10 submissions per 10 minutes per address per trial, then 429 (submit_attempts).
import "server-only";
import { createHash } from "node:crypto";
import { db } from "./supabase";

export const MAX_WRONG_ATTEMPTS = 5;
export const WINDOW_MINUTES = 10;

export const MAX_SUBMITS = 10;
export const SUBMIT_WINDOW_MINUTES = 10;

export function clientAddress(headers: Headers): string {
  return (
    headers.get("x-real-ip")?.trim() ||
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

/** Keyed hash of an address. The scope keeps the login and submit hashes apart. */
export function hashAddress(address: string, secret: string, scope: "login" | "submit" = "login"): string {
  return createHash("sha256").update(`${secret}|${scope}|${address}`).digest("hex");
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

export async function submitsInWindow(ipHash: string, trialId: string, nowMs: number = Date.now()): Promise<number> {
  const since = new Date(nowMs - SUBMIT_WINDOW_MINUTES * 60_000).toISOString();
  const { count, error } = await db()
    .from("submit_attempts")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .eq("trial_id", trialId)
    .gte("created_at", since);
  if (error) throw new Error(`submit_attempts count failed: ${error.message}`);
  return count ?? 0;
}

export async function recordSubmit(ipHash: string, trialId: string): Promise<void> {
  const { error } = await db().from("submit_attempts").insert({ ip_hash: ipHash, trial_id: trialId });
  if (error) throw new Error(`submit_attempts insert failed: ${error.message}`);
}
