/** Dates in the site's time zone, e.g. "10 Oct 2026, 14:05". */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    timeZone: "Europe/Sofia",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
