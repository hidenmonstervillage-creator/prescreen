import { unescapeMarkdown } from "@/lib/text";
import { cardClass, linkClass } from "./ui";

export default function SourceText({ text, nctId }: { text: string; nctId: string }) {
  return (
    <section data-source-text className={`${cardClass} flex min-w-0 flex-col lg:max-h-[78vh]`}>
      <div className="border-b border-line px-5 py-3.5">
        <h2 className="text-heading text-ink">Source text</h2>
        <p className="text-small text-ink-secondary">
          Verbatim from{" "}
          <a className={linkClass} href={`https://clinicaltrials.gov/study/${nctId}`} target="_blank" rel="noreferrer">
            ClinicalTrials.gov {nctId}
          </a>
        </p>
      </div>
      <pre className="min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap px-5 py-4 font-sans text-quote text-ink">
        {unescapeMarkdown(text)}
      </pre>
    </section>
  );
}
