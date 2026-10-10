// Site staff session: an httpOnly cookie holding "v1.<expiry>.<hmac>", keyed by
// SITE_PASSCODE, so changing the passcode signs everyone out. Web Crypto only, so the
// same code runs in middleware (edge) and in route handlers (node).

export const SESSION_COOKIE = "site_session";
export const SESSION_DAYS = 30;
export const SESSION_MAX_AGE = SESSION_DAYS * 24 * 60 * 60;

const enc = new TextEncoder();

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Constant-time comparison of two strings of any length. */
export function safeEqual(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

/** Compares a typed passcode with SITE_PASSCODE without leaking timing on the content. */
export async function passcodeMatches(secret: string, input: string): Promise<boolean> {
  if (!secret) return false;
  const [a, b] = await Promise.all([hmacHex(secret, `pass:${input.trim()}`), hmacHex(secret, `pass:${secret}`)]);
  return safeEqual(a, b);
}

export async function makeSessionToken(secret: string, nowMs: number = Date.now()): Promise<string> {
  const exp = Math.floor(nowMs / 1000) + SESSION_MAX_AGE;
  return `v1.${exp}.${await hmacHex(secret, `site:v1:${exp}`)}`;
}

export async function verifySessionToken(
  secret: string | undefined,
  token: string | undefined,
  nowMs: number = Date.now(),
): Promise<boolean> {
  if (!secret || !token) return false;
  const m = /^v1\.(\d{1,12})\.([0-9a-f]{64})$/.exec(token);
  if (!m) return false;
  const exp = Number(m[1]);
  if (exp <= Math.floor(nowMs / 1000)) return false;
  return safeEqual(m[2], await hmacHex(secret, `site:v1:${exp}`));
}
