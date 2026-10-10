import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedTrialBySlug } from "@/lib/trials";
import { toPublicQuestion } from "@/lib/types";
import PublicPrescreen from "@/components/PublicPrescreen";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Pre-screen questions" };

export default async function PublicPrescreenPage({ params }: { params: { slug: string } }) {
  const trial = await getPublishedTrialBySlug(params.slug);
  if (!trial || !trial.slug) notFound();
  return (
    <PublicPrescreen
      title={trial.title}
      nctId={trial.nct_id}
      slug={trial.slug}
      questions={trial.questions.map(toPublicQuestion)}
    />
  );
}
