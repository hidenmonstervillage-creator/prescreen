import { neutralPill } from "./ui";

/** The referral-ready flag as a neutral pill: ink on surface-sunken, never a state colour, never a verdict. */
export default function ReferralReadyLabel() {
  return (
    <span className={`${neutralPill} font-semibold`} data-referral-ready>
      referral-ready
    </span>
  );
}
