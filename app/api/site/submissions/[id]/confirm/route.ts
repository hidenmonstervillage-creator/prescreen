import { siteApiGuard } from "@/lib/site-auth";
import { setCoordinatorConfirmation } from "@/lib/trials";
import { errorResponse } from "@/lib/api-errors";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** { confirmed: boolean }: the inbox checkbox "Confirmed by coordinator". */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const denied = await siteApiGuard();
  if (denied) return denied;
  const body = await req.json().catch(() => null);
  if (typeof body?.confirmed !== "boolean") return Response.json({ error: "Send { confirmed: true | false }." }, { status: 400 });
  try {
    const saved = await setCoordinatorConfirmation(params.id, body.confirmed);
    if (!saved) return Response.json({ error: "Unknown submission." }, { status: 404 });
    return Response.json(saved);
  } catch (err) {
    return errorResponse(err, "confirm");
  }
}
