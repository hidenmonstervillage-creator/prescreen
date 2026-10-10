import { getPublishedTrialBySlug, submitAnswers } from "@/lib/trials";
import { cleanSubmission } from "@/lib/answers";
import { errorResponse } from "@/lib/api-errors";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Public: stores answers and contact. The response never carries any result. */
export async function POST(req: Request, { params }: { params: { slug: string } }) {
  try {
    const trial = await getPublishedTrialBySlug(params.slug);
    if (!trial) return Response.json({ error: "This page does not exist." }, { status: 404 });
    const parsed = cleanSubmission(trial.questions, await req.json().catch(() => null));
    if (!parsed.ok) return Response.json({ error: "Please check your answers.", details: parsed.errors }, { status: 400 });
    await submitAnswers(trial, parsed.value.answers, parsed.value.contact);
    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err, "submit");
  }
}
