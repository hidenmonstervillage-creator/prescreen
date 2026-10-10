import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSitePage } from "@/lib/site-auth";
import { getSubmissionDetail } from "@/lib/trials";
import { formatDate } from "@/lib/format";
import SiteNav from "@/components/SiteNav";
import CountsLine from "@/components/CountsLine";
import KarmaButton from "@/components/KarmaButton";
import CriteriaMatrix from "@/components/CriteriaMatrix";
import MapFooter from "@/components/MapFooter";
import RebuildMapButton from "@/components/RebuildMapButton";

export const dynamic = "force-dynamic";

export default async function SubmissionPage({ params }: { params: { id: string } }) {
  await requireSitePage();
  const s = await getSubmissionDetail(params.id);
  if (!s) notFound();
  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-6xl p-6" data-submission-detail={s.id}>
        <p className="mb-2 text-sm">
          <Link href="/site/inbox" className="text-blue-700 hover:underline">
            Back to inbox
          </Link>
        </p>
        <h1 className="text-2xl font-semibold">{s.trial.nct_id}</h1>
        <p className="text-sm text-gray-600">{s.trial.title}</p>
        <p className="mt-2 text-sm">
          Submitted {formatDate(s.created_at)} &middot; Contact: <span data-contact>{s.contact}</span>
        </p>
        <div className="my-4 flex flex-wrap items-start justify-between gap-4">
          {s.rows.length > 0 ? <CountsLine rows={s.rows} /> : <p className="text-sm">This submission has no map yet.</p>}
          <KarmaButton />
        </div>
        {s.rows.length > 0 ? (
          <CriteriaMatrix rows={s.rows} criteria={s.trial.criteria} questions={s.trial.questions} />
        ) : (
          <RebuildMapButton submissionId={s.id} />
        )}
        <MapFooter />
      </main>
    </>
  );
}
