/**
 * "Fictional patient", right after every patient's name (CLAUDE.md rule 1: fictional patients only,
 * said on screen). Violet means this and nothing else. Not a button; it cannot be dismissed.
 */
export default function FictionalBadge() {
  return (
    <span
      className="inline-flex h-7 shrink-0 items-center whitespace-nowrap rounded-md border border-fictional-line bg-fictional-tint px-2.5 text-label uppercase text-fictional-ink"
      data-fictional-badge
    >
      Fictional patient
    </span>
  );
}
