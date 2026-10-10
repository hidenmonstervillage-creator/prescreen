// The hospital named on the lead pack. There is one hospital per deployment (one passcode),
// so it is configuration: HOSPITAL_NAME, else a placeholder that reads as one.
export const HOSPITAL_PLACEHOLDER = "[Hospital name]";

export function hospitalName(env: Record<string, string | undefined> = process.env): string {
  return env.HOSPITAL_NAME?.trim() || HOSPITAL_PLACEHOLDER;
}
