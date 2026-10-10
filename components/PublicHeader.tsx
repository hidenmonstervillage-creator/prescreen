import Link from "next/link";
import Wordmark from "./Wordmark";
import { navItemClass } from "./ui";

const NAV = [
  { href: "/pricing", label: "Pricing", nav: "pricing" },
  { href: "/site", label: "Hospital sign in", nav: "site" },
] as const;

export type PublicNav = (typeof NAV)[number]["nav"];

/**
 * The 64px header on the light public screens (AppHeader recipe): the wordmark, then Pricing and
 * Hospital sign in. The patient's pre-screen page shows the wordmark only (`nav={false}`).
 */
export default function PublicHeader({ current, nav = true }: { current?: PublicNav; nav?: boolean }) {
  return (
    <header className="h-16 border-b border-line bg-surface print:hidden">
      <div className="mx-auto flex h-full max-w-content items-center gap-5 px-5">
        <Wordmark />
        {nav && (
          <nav aria-label="Main" className="ml-auto flex h-full items-center">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                aria-current={current === n.nav ? "page" : undefined}
                className={navItemClass(current === n.nav)}
                data-nav={n.nav}
              >
                {n.label}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}
