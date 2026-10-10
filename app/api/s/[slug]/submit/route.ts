import { getPublishedTrialBySlug, submitAnswers } from "@/lib/trials";
import { cleanSubmission } from "@/lib/answers";
import { errorResponse } from "@/lib/api-errors";
import { clientAddress, hashAddress, MAX_SUBMITS, recordSubmit, SUBMIT_WINDOW_MINUTES, submitsInWindow } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Public: stores answers and contact. The response never carries any result. */
export async function POST(req: Request, { params }: { params: { slug: string } }) {
  try {
    const trial = await getPublishedTrialBySlug(params.slug);
    if (!trial) return Response.json({ error: "This page does not exist." }, { status: 404 });
    // 10 per 10 minutes per address per trial; every POST for a published trial counts.
    const ipHash = hashAddress(clientAddress(req.headers), process.env.SITE_PASSCODE ?? "", "submit");
    if ((await submitsInWindow(ipHash, trial.id)) >= MAX_SUBMITS) {
      return Response.json(
        { error: `Too many submissions from this address. Try again in ${SUBMIT_WINDOW_MINUTES} minutes.` },
        { status: 429, headers: { "retry-after": String(SUBMIT_WINDOW_MINUTES * 60) } },
      );
    }
    await recordSubmit(ipHash, trial.id);
    const parsed = cleanSubmission(trial.questions, await req.json().catch(() => null));
    if (!parsed.ok) return Response.json({ error: "Please check your answers.", details: parsed.errors }, { status: 400 });
    await submitAnswers(trial, parsed.value.answers, parsed.value.contact);
    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err, "submit");
  }
}
