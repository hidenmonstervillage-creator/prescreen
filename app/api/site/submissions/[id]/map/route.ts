import { siteApiGuard } from "@/lib/site-auth";
import { buildMap } from "@/lib/trials";
import { errorResponse } from "@/lib/api-errors";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Rebuilds one submission's map, for when the first build failed. */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const denied = await siteApiGuard();
  if (denied) return denied;
  try {
    const rows = await buildMap(params.id);
    return Response.json({ rows: rows.length });
  } catch (err) {
    return errorResponse(err, "map");
  }
}
