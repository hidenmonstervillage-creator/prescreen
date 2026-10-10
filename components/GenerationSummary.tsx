import type { GenerationReport } from "@/lib/generate";
import type { Criterion } from "@/lib/types";
import { UnavailableIcon } from "./Icons";

/** A problem left by generation: ink with the slashed circle, never red (red is a criterion state). */
function Problem({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-1.5 flex items-start gap-2 font-medium text-ink">
      <UnavailableIcon className="mt-0.5 size-5" />
      <span>{children}</span>
    </p>
  );
}

export default function GenerationSummary({ report, criteria }: { report: Partial<GenerationReport>; criteria: Criterion[] }) {
  const askable = criteria.filter((c) => c.askable).length;
  const c = report.criteria;
  const q = report.questions;
  return (
    <section data-generation-summary className="rounded-2xl border border-line bg-surface-sunken/60 px-5 py-4 text-body text-ink tabular-nums">
      <p className="text-[17px]">
        <strong className="font-semibold">{criteria.length} criteria:</strong> {askable} a patient can answer,{" "}
        {criteria.length - askable} for the research team.{q ? <strong className="font-semibold"> {q.kept} questions.</strong> : ""}
      </p>
      {c && c.reasked.length > 0 && (
        <p className="mt-1.5 text-ink-secondary">Re-asked: {c.reasked.map((r) => `${r.id} (${r.problems.join("; ")})`).join(", ")}</p>
      )}
      {c && c.dropped.length > 0 && (
        <Problem>Dropped: {c.dropped.map((r) => `"${r.quote}" (${r.problems.join("; ")})`).join(", ")}</Problem>
      )}
      {c && c.uncovered_lines.length > 0 && <Problem>Lines with no criterion: {c.uncovered_lines.map((l) => `"${l}"`).join(", ")}</Problem>}
      {q && q.reasked && <p className="mt-1.5 text-ink-secondary">Questions re-asked once: {q.first_problems.join("; ")}</p>}
      {q && q.dropped.length > 0 && (
        <Problem>Questions dropped: {q.dropped.map((d) => `${d.id} (${d.problems.join("; ")})`).join(", ")}</Problem>
      )}
      {report.usage && (
        <p className="mt-1.5 text-small text-ink-secondary">
          {report.model}: {report.usage.calls} calls, {report.usage.prompt_tokens} tokens in, {report.usage.completion_tokens} out
        </p>
      )}
    </section>
  );
}
