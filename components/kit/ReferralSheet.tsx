import type { Criterion, Question } from "@/lib/types";
import Sheet, { WriteLine } from "./Sheet";

/**
 * Kit part (c): one page for local doctors. The plain words are the patient questions that ask the
 * askable criteria, in criteria order; criteria left to the research team are counted, not listed.
 */
export default function ReferralSheet({
  title,
  meta,
  nctId,
  conditions,
  criteria,
  questions,
  publicUrl,
}: {
  title: string;
  meta: string;
  nctId: string;
  conditions: string[];
  criteria: Criterion[];
  questions: Question[];
  publicUrl: string | null;
}) {
  const asked: Question[] = [];
  const coveredIds = new Set<string>();
  for (const c of criteria.filter((x) => x.askable)) {
    const q = questions.find((x) => x.criterion_ids.includes(c.id));
    if (!q) continue;
    coveredIds.add(c.id);
    if (!asked.includes(q)) asked.push(q);
  }
  const forResearchTeam = criteria.length - coveredIds.size;

  return (
    <Sheet part="referral" label="Part 3 · For local doctors" title={title} meta={meta}>
      <div className="break-inside-avoid">
        {conditions.length > 0 && (
          <p className="text-[15px]">
            <span className="font-semibold">Condition studied:</span> {conditions.join(", ")}
          </p>
        )}
        <div className="mt-3 rounded-lg border-2 border-ink px-4 py-3">
          <p className="text-small font-semibold">Your patient can answer the pre-screen online:</p>
          {publicUrl ? (
            <p className="mt-1 break-all font-mono text-[17px] font-medium" data-kit-public-link>
              {publicUrl}
            </p>
          ) : (
            <p className="mt-1 text-[15px] font-medium" data-kit-public-link>
              Not published yet. Publish the trial to print its pre-screen link here.
            </p>
          )}
          <p className="mt-1 text-small text-ink-secondary">The research team at the hospital reads every answer and contacts the patient. {nctId}</p>
        </div>

        <h3 className="mt-4 text-[16px] font-bold">What the pre-screen asks, in plain words</h3>
        <ol className="mt-1.5 list-decimal space-y-1 pl-7 text-[14px] leading-5 marker:font-semibold">
          {asked.map((q) => (
            <li key={q.id}>{q.text}</li>
          ))}
        </ol>
        {forResearchTeam > 0 && (
          <p className="mt-2 text-small text-ink-secondary">
            The research team checks the other {forResearchTeam} criteria with the patient&rsquo;s records.
          </p>
        )}

        <h3 className="mt-4 text-[16px] font-bold">Hospital contact</h3>
        <div className="grid grid-cols-2 gap-x-6">
          <WriteLine label="Hospital:" />
          <WriteLine label="Coordinator:" />
          <WriteLine label="Phone:" />
          <WriteLine label="Email:" />
        </div>
      </div>
    </Sheet>
  );
}
