"use client";

import Link from "next/link";

export default function SiteNav() {
  async function signOut() {
    await fetch("/api/site/logout", { method: "POST" });
    window.location.href = "/site";
  }
  return (
    <nav className="flex items-center gap-4 border-b border-gray-200 px-6 py-3 text-sm">
      <span className="font-semibold">Pre-screen</span>
      <Link href="/site/inbox" className="text-blue-700 hover:underline" data-nav="inbox">
        Inbox
      </Link>
      <Link href="/site/trials/new" className="text-blue-700 hover:underline" data-nav="new-trial">
        New trial
      </Link>
      <button type="button" onClick={signOut} className="ml-auto text-gray-600 hover:underline" data-nav="sign-out">
        Sign out
      </button>
    </nav>
  );
}
