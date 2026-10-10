import type { PublicQuestion } from "@/lib/types";
import PublicForm from "./PublicForm";
import PublicHeader from "./PublicHeader";
import { nctClass, sectionLabel } from "./ui";

/** Screen 3: the public pre-screen page. Large type: it is read on phones and shown on a projector. */
export default function PublicPrescreen({
  title,
  nctId,
  slug,
  questions,
}: {
  title: string;
  nctId: string;
  slug: string;
  questions: PublicQuestion[];
}) {
  return (
    <>
      <PublicHeader nav={false} />
      <main className="mx-auto w-full max-w-4xl px-5 pb-16 pt-8 md:pt-10">
        <p className={sectionLabel}>Pre-screen questions</p>
        <h1 className="mt-2 text-heading text-ink md:text-[24px] md:leading-8">{title}</h1>
        <p className={`mt-1 text-body text-ink-secondary ${nctClass}`}>{nctId}</p>
        <div
          className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-frozen-line bg-frozen-tint px-4 py-3 text-frozen-ink"
          data-demo-notice
        >
          <span className="inline-flex h-7 shrink-0 items-center rounded-md border border-frozen-line bg-surface px-2.5 text-label uppercase">
            Demo page
          </span>
          <p className="text-[17px] font-medium">
            Use fictional details only. Do not enter real health information or real contact details.
          </p>
        </div>
        <div className="mt-10">
          <PublicForm slug={slug} questions={questions} />
        </div>
      </main>
    </>
  );
}
