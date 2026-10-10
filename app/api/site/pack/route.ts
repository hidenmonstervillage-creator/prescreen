import { siteApiGuard } from "@/lib/site-auth";
import { loadLeadPack } from "@/lib/leads";
import { buildPackPdf, packFileName } from "@/lib/pack";
import { packFonts } from "@/lib/pack-fonts";
import { errorResponse } from "@/lib/api-errors";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MISSING = {
  trial: { status: 404, error: "Unknown trial." },
  patients: { status: 404, error: "No referral-ready patient confirmed by a coordinator, with consent, for this trial." },
  changed: { status: 409, error: "The selection changed since the preview. Open the preview again." },
} as const;

/**
 * GET ?trial=<id>&ids=<submission ids, comma separated>: the lead pack PDF, as a download.
 * The ids come from the preview, so the file holds exactly the patients the preview showed.
 * Nothing is sent anywhere.
 */
export async function GET(req: Request) {
  const denied = await siteApiGuard();
  if (denied) return denied;
  try {
    const url = new URL(req.url);
    const trial = url.searchParams.get("trial") ?? "";
    const ids = (url.searchParams.get("ids") ?? "").split(",").filter(Boolean);
    if (!ids.length) return Response.json({ error: "Open the preview first: it chooses the patients." }, { status: 400 });
    const loaded = await loadLeadPack(trial, ids);
    if ("missing" in loaded) {
      const m = MISSING[loaded.missing];
      return Response.json({ error: m.error }, { status: m.status });
    }
    const { bytes, pages } = await buildPackPdf(loaded.pack, await packFonts(url.origin));
    console.log(`[pack] ${loaded.pack.trial.nct_id}: ${loaded.pack.patients.length} patients, ${pages.length} pages`);
    return new Response(new Blob([new Uint8Array(bytes)], { type: "application/pdf" }), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="${packFileName(loaded.pack)}"`,
        "cache-control": "no-store",
      },
    });
  } catch (err) {
    return errorResponse(err, "pack");
  }
}
