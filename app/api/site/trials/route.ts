import { siteApiGuard } from "@/lib/site-auth";
import { normalizeNctId } from "@/lib/ctgov";
import { createOrGetTrial } from "@/lib/trials";
import { errorResponse } from "@/lib/api-errors";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** { nct, regenerate? }: fetch from ClinicalTrials.gov, generate, store a draft trial. */
export async function POST(req: Request) {
  const denied = await siteApiGuard();
  if (denied) return denied;
  const body = await req.json().catch(() => null);
  const nct = normalizeNctId(typeof body?.nct === "string" ? body.nct : "");
  if (!nct) return Response.json({ error: "Enter an NCT ID: NCT followed by 8 digits." }, { status: 400 });
  try {
    const { trial, reused } = await createOrGetTrial(nct, body?.regenerate === true);
    return Response.json({ trial, reused });
  } catch (err) {
    return errorResponse(err, "trials");
  }
}
