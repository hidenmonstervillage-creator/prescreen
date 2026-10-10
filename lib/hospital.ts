// The referring hospital named on the lead pack ("Referred from: ..."): the hospital that runs the
// inbox and refers patients to the contracted trial site. One per deployment (one passcode), so it
// is configuration: HOSPITAL_NAME, else a placeholder that reads as one.
export const HOSPITAL_PLACEHOLDER = "[Hospital name]";

export function hospitalName(env: Record<string, string | undefined> = process.env): string {
  return env.HOSPITAL_NAME?.trim() || HOSPITAL_PLACEHOLDER;
}
