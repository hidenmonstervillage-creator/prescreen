import { unescapeMarkdown } from "@/lib/text";

export default function SourceText({ text, nctId }: { text: string; nctId: string }) {
  return (
    <section data-source-text>
      <h2 className="mb-2 text-lg font-semibold">Source text</h2>
      <p className="mb-2 text-xs text-gray-500">
        Verbatim from{" "}
        <a className="text-blue-700 underline" href={`https://clinicaltrials.gov/study/${nctId}`} target="_blank" rel="noreferrer">
          ClinicalTrials.gov {nctId}
        </a>
      </p>
      <pre className="whitespace-pre-wrap rounded border border-gray-200 bg-gray-50 p-2 font-sans text-sm text-gray-900">{unescapeMarkdown(text)}</pre>
    </section>
  );
}
