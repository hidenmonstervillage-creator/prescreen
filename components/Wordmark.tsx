import Link from "next/link";
import { focusRing } from "./ui";

/** The word "Atlas" in Geologica bold: Atlas's wordmark, in every header. `onDark` is the landing hero. */
export default function Wordmark({ href = "/", onDark = false }: { href?: string; onDark?: boolean }) {
  return (
    <Link
      href={href}
      className={`shrink-0 rounded-sm text-title font-bold leading-none tracking-[-0.02em] ${onDark ? "text-brand-ink" : "text-ink"} ${focusRing}`}
      data-wordmark
    >
      Atlas
    </Link>
  );
}
