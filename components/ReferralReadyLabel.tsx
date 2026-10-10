/** The referral-ready flag as a label: neutral ink, never a state colour, never a verdict. */
export default function ReferralReadyLabel() {
  return (
    <span
      className="inline-flex h-7 items-center rounded-md border border-line-strong bg-ice px-2.5 text-small font-semibold text-ink"
      data-referral-ready
    >
      referral-ready
    </span>
  );
}
