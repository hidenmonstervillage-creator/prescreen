// First gate for site staff routes. Pages and routes check the session again themselves.
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

const OPEN = new Set(["/site", "/api/site/login"]);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (OPEN.has(pathname)) return NextResponse.next();
  const ok = await verifySessionToken(process.env.SITE_PASSCODE, req.cookies.get(SESSION_COOKIE)?.value);
  if (ok) return NextResponse.next();
  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const url = req.nextUrl.clone();
  url.pathname = "/site";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/site/:path*", "/api/site/:path*"] };
