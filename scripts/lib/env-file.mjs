// Minimal .env.local reader and writer for scripts. Never prints values.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const ENV_PATH = fileURLToPath(new URL("../../.env.local", import.meta.url));

/** Keys .env.local is expected to hold. OPENAI_API_KEY is deliberately absent. */
export const ENV_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_ANON_KEY",
  "SUPABASE_DB_URL",
  "EXPECTED_SUPABASE_REF",
  "SITE_PASSCODE",
  "OPENAI_VISION_MODEL",
];

/** KEY=VALUE lines; the value is everything after the first "=", with matching outer quotes removed. */
export function parseEnv(text) {
  const values = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (value.length >= 2 && (value[0] === '"' || value[0] === "'") && value.at(-1) === value[0]) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

export function readEnvFile(path = ENV_PATH) {
  if (!existsSync(path)) throw new Error(`.env.local not found at ${path}`);
  const text = readFileSync(path, "utf8").replace(/^﻿/, "");
  return { text, values: parseEnv(text) };
}

/** Sets KEY=value in .env.local, replacing an existing KEY line or appending one. */
export function writeEnvValue(key, value, path = ENV_PATH) {
  const { text } = readEnvFile(path);
  const lines = text.split(/\r?\n/);
  const i = lines.findIndex((l) => l.trim().startsWith(`${key}=`));
  if (i >= 0) lines[i] = `${key}=${value}`;
  else lines.splice(lines.at(-1) === "" ? lines.length - 1 : lines.length, 0, `${key}=${value}`);
  writeFileSync(path, lines.join("\n"), "utf8");
}

/** Loads .env.local into process.env without overriding variables already set. */
export function loadEnvFile(path = ENV_PATH) {
  const { values } = readEnvFile(path);
  for (const [k, v] of Object.entries(values)) {
    if (process.env[k] === undefined) process.env[k] = v;
  }
  return values;
}
