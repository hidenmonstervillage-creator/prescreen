import type { GenerationReport } from "@/lib/generate";
import type { Criterion } from "@/lib/types";

export default function GenerationSummary({ report, criteria }: { report: Partial<GenerationReport>; criteria: Criterion[] }) {
  const askable = criteria.filter((c) => c.askable).length;
  const c = report.criteria;
  const q = report.questions;
  return (
    <section data-generation-summary className="rounded border border-gray-200 bg-gray-50 p-3 text-sm">
      <p>
        {criteria.length} criteria: {askable} a patient can answer, {criteria.length - askable} for the site team.{" "}
        {q ? `${q.kept} questions.` : ""}
      </p>
      {c && c.reasked.length > 0 && (
        <p className="mt-1 text-gray-700">
          Re-asked: {c.reasked.map((r) => `${r.id} (${r.problems.join("; ")})`).join(", ")}
        </p>
      )}
      {c && c.dropped.length > 0 && (
        <p className="mt-1 text-red-800">Dropped: {c.dropped.map((r) => `"${r.quote}" (${r.problems.join("; ")})`).join(", ")}</p>
      )}
      {c && c.uncovered_lines.length > 0 && (
        <p className="mt-1 text-red-800">Lines with no criterion: {c.uncovered_lines.map((l) => `"${l}"`).join(", ")}</p>
      )}
      {q && q.reasked && <p className="mt-1 text-gray-700">Questions re-asked once: {q.first_problems.join("; ")}</p>}
      {q && q.dropped.length > 0 && (
        <p className="mt-1 text-red-800">Questions dropped: {q.dropped.map((d) => `${d.id} (${d.problems.join("; ")})`).join(", ")}</p>
      )}
      {report.usage && (
        <p className="mt-1 text-xs text-gray-500">
          {report.model}: {report.usage.calls} calls, {report.usage.prompt_tokens} tokens in, {report.usage.completion_tokens} out
        </p>
      )}
    </section>
  );
}
