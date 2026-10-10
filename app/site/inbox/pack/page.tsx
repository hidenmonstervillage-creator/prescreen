import type { Metadata } from "next";
import Link from "next/link";
import { requireSitePage } from "@/lib/site-auth";
import { loadLeadPack, packableTrials } from "@/lib/leads";
import SiteShell from "@/components/SiteShell";
import LeadPackPreview from "@/components/LeadPackPreview";
import { buttonClass, cardClass, nctClass, sectionLabel } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Lead pack" };

/** The preview before download. A pack is per trial; with several trials ready, pick one first. */
export default async function LeadPackPage({ searchParams }: { searchParams: { trial?: string } }) {
  await requireSitePage();
  let trialId = typeof searchParams.trial === "string" ? searchParams.trial : "";
  if (!trialId) {
    const trials = await packableTrials();
    if (trials.length === 1) trialId = trials[0].id;
    else
      return (
        <SiteShell>
          <section className={`${cardClass} p-6`} data-pack-choose>
            <p className={sectionLabel}>Lead pack</p>
            {trials.length === 0 ? (
              <>
                <h1 className="mt-2 text-title text-ink">No patient is ready for a lead pack</h1>
                <p className="mt-2 max-w-prose text-body text-ink-secondary">
                  A pack takes referral-ready rows that a coordinator confirmed, with consent recorded.
                </p>
              </>
            ) : (
              <>
                <h1 className="mt-2 text-title text-ink">Choose a trial</h1>
                <ul className="mt-4 space-y-2">
                  {trials.map((t) => (
                    <li key={t.id}>
                      <Link href={`/site/inbox/pack?trial=${t.id}`} className={buttonClass("secondary")}>
                        <span className={nctClass}>{t.nct_id}</span> &middot; {t.patients} {t.patients === 1 ? "patient" : "patients"}
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <Link href="/site/inbox" className={`mt-6 ${buttonClass("secondary")}`}>
              Back to hospital inbox
            </Link>
          </section>
        </SiteShell>
      );
  }
  const loaded = await loadLeadPack(trialId);
  if ("missing" in loaded) {
    return (
      <SiteShell>
        <section className={`${cardClass} p-6`} data-pack-empty>
          <h1 className="text-title text-ink">No patient is ready for a lead pack for this trial</h1>
          <Link href="/site/inbox" className={`mt-6 ${buttonClass("secondary")}`}>
            Back to hospital inbox
          </Link>
        </section>
      </SiteShell>
    );
  }
  const { pack } = loaded;
  const ids = pack.patients.map((p) => p.submission_id).join(",");
  return (
    <SiteShell>
      <LeadPackPreview pack={pack} downloadHref={`/api/site/pack?trial=${pack.trial.id}&ids=${ids}`} />
    </SiteShell>
  );
}
