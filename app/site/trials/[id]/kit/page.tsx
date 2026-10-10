import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { requireSitePage } from "@/lib/site-auth";
import { getTrialById } from "@/lib/trials";
import TrialKit from "@/components/kit/TrialKit";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Trial kit" };

/** The origin this request came in on, so the printed link matches the deployment. */
function requestOrigin(): string {
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export default async function TrialKitPage({ params }: { params: { id: string } }) {
  await requireSitePage();
  if (!/^[0-9a-f-]{36}$/.test(params.id)) notFound();
  const trial = await getTrialById(params.id);
  if (!trial) notFound();
  const publicUrl = trial.slug && trial.published_at ? `${requestOrigin()}/s/${trial.slug}` : null;
  return <TrialKit trial={trial} publicUrl={publicUrl} />;
}
