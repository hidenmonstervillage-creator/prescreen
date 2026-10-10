import { NextResponse } from "next/server";
import { makeSessionToken, passcodeMatches, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/session";
import { clientAddress, hashAddress, MAX_WRONG_ATTEMPTS, recordWrongAttempt, WINDOW_MINUTES, wrongAttemptsInWindow } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: Request) {
  const secret = process.env.SITE_PASSCODE ?? "";
  const body = await req.json().catch(() => null);
  const passcode = typeof body?.passcode === "string" ? body.passcode : "";
  const ipHash = hashAddress(clientAddress(req.headers), secret);

  if ((await wrongAttemptsInWindow(ipHash)) >= MAX_WRONG_ATTEMPTS) {
    return NextResponse.json(
      { error: `Too many wrong attempts. Try again in ${WINDOW_MINUTES} minutes.` },
      { status: 429, headers: { "retry-after": String(WINDOW_MINUTES * 60) } },
    );
  }
  if (!(await passcodeMatches(secret, passcode))) {
    await recordWrongAttempt(ipHash);
    return NextResponse.json({ error: "Wrong passcode." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, await makeSessionToken(secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}
