export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ ok: true, commit: process.env.BUILD_COMMIT ?? "unknown" });
}
