"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { buttonClass, focusRing } from "./ui";

const NAV = [
  { href: "/site/inbox", label: "Hospital inbox", nav: "inbox" },
  { href: "/site/trials/new", label: "New trial", nav: "new-trial" },
];

export default function SiteNav() {
  const pathname = usePathname() ?? "";
  async function signOut() {
    await fetch("/api/site/logout", { method: "POST" });
    window.location.href = "/site";
  }
  return (
    <header className="h-16 border-b border-line bg-surface print:hidden">
      <nav className="mx-auto flex h-full max-w-content items-center gap-2 px-6">
        <span className="mr-4 text-heading text-ink">Pre-screen</span>
        {NAV.map((n) => {
          const current = pathname === n.href || pathname.startsWith(`${n.href}/`);
          return (
            <Link
              key={n.href}
              href={n.href}
              aria-current={current ? "page" : undefined}
              data-nav={n.nav}
              className={`inline-flex h-full items-center border-b-2 px-3 text-body ${
                current ? "border-ink font-semibold text-ink" : "border-transparent font-medium text-ink-secondary hover:border-line-strong hover:text-ink"
              } ${focusRing} focus-visible:outline-offset-[-4px]`}
            >
              {n.label}
            </Link>
          );
        })}
        <button type="button" onClick={signOut} className={`ml-auto ${buttonClass("ghost")}`} data-nav="sign-out">
          Sign out
        </button>
      </nav>
    </header>
  );
}
