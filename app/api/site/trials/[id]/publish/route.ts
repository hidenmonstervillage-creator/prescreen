import { siteApiGuard } from "@/lib/site-auth";
import { publishTrial } from "@/lib/trials";
import { errorResponse } from "@/lib/api-errors";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Creates the slug and the public page. Publishing twice returns the same slug. */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const denied = await siteApiGuard();
  if (denied) return denied;
  try {
    const trial = await publishTrial(params.id);
    return Response.json({ slug: trial.slug, path: `/s/${trial.slug}`, published_at: trial.published_at });
  } catch (err) {
    return errorResponse(err, "publish");
  }
}
