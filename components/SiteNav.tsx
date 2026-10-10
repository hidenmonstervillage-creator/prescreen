"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Wordmark from "./Wordmark";
import { buttonClass, navItemClass } from "./ui";

const NAV = [
  { href: "/site/inbox", label: "Hospital inbox", nav: "inbox" },
  { href: "/site/trials/new", label: "New trial", nav: "new-trial" },
];

/** The research team's 64px header (AppHeader recipe). It stays on top so the matrix header can stick under it. */
export default function SiteNav() {
  const pathname = usePathname() ?? "";
  async function signOut() {
    await fetch("/api/site/logout", { method: "POST" });
    window.location.href = "/site";
  }
  return (
    <header className="sticky top-0 z-20 h-16 border-b border-line bg-surface print:hidden">
      <nav aria-label="Main" className="mx-auto flex h-full max-w-content items-center gap-5 px-5">
        <Wordmark href="/site/inbox" />
        <div className="flex h-full items-center">
          {NAV.map((n) => {
            const current = pathname === n.href || pathname.startsWith(`${n.href}/`);
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={current ? "page" : undefined}
                data-nav={n.nav}
                className={navItemClass(current)}
              >
                {n.label}
              </Link>
            );
          })}
        </div>
        <button type="button" onClick={signOut} className={`ml-auto ${buttonClass("ghost")}`} data-nav="sign-out">
          Sign out
        </button>
      </nav>
    </header>
  );
}
