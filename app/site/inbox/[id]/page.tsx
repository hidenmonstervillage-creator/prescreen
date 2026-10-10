import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireSitePage } from "@/lib/site-auth";
import { getSubmissionDetail } from "@/lib/trials";
import SiteShell from "@/components/SiteShell";
import SubmissionMap from "@/components/SubmissionMap";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Criteria map" };

export default async function SubmissionPage({ params }: { params: { id: string } }) {
  await requireSitePage();
  const s = await getSubmissionDetail(params.id);
  if (!s) notFound();
  return (
    <SiteShell>
      <SubmissionMap detail={s} />
    </SiteShell>
  );
}
