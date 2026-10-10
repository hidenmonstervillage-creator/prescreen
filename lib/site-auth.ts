// Server-side session checks for site pages and API routes. Middleware checks too;
// these run again inside each page and route so a middleware gap cannot expose data.
import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySessionToken } from "./session";

export async function hasSiteSession(): Promise<boolean> {
  return verifySessionToken(process.env.SITE_PASSCODE, cookies().get(SESSION_COOKIE)?.value);
}

/** For site pages: sends anyone without a session to the passcode gate. */
export async function requireSitePage(): Promise<void> {
  if (!(await hasSiteSession())) redirect("/site");
}

/** For site API routes: a 401 response when there is no session, else null. */
export async function siteApiGuard(): Promise<Response | null> {
  if (await hasSiteSession()) return null;
  return Response.json({ error: "Sign in first." }, { status: 401 });
}
