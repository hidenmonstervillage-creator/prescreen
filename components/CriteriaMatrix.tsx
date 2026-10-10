import { Fragment } from "react";
import StateCell from "./StateCell";
import AnswerQuote from "./AnswerQuote";
import type { Criterion, MappingRow, Question, Section } from "@/lib/types";

const SECTION_TITLE: Record<Section, string> = { inclusion: "Inclusion criteria", exclusion: "Exclusion criteria" };

export default function CriteriaMatrix({
  rows,
  criteria,
  questions,
}: {
  rows: MappingRow[];
  criteria: Criterion[];
  questions: Question[];
}) {
  const byId = new Map(criteria.map((c) => [c.id, c]));
  const perSection = (s: Section) => rows.filter((r) => byId.get(r.criterion_id)?.section === s).length;
  return (
    // overflow-clip, not overflow-hidden, so the sticky header keeps sticking under the 64px app header.
    <div className="overflow-clip rounded-2xl border border-line bg-surface shadow-card">
      <table data-matrix className="w-full table-fixed border-collapse text-left">
        <colgroup>
          <col className="w-[44%]" />
          <col className="w-60" />
          <col />
        </colgroup>
        <thead className="sticky top-16 z-10 bg-surface-sunken shadow-[inset_0_-1px_0_theme(colors.line-strong)]">
          <tr className="text-label uppercase text-ink-secondary">
            <th scope="col" className="px-5 py-3">
              Criterion (quoted)
            </th>
            <th scope="col" className="px-5 py-3">
              State
            </th>
            <th scope="col" className="px-5 py-3">
              Answer (quoted)
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const c = byId.get(r.criterion_id);
            const section = c?.section;
            const startsSection = section && section !== byId.get(rows[i - 1]?.criterion_id)?.section;
            return (
              <Fragment key={r.criterion_id}>
                {startsSection && (
                  <tr className="border-t border-line bg-page">
                    <th scope="colgroup" colSpan={3} className="px-5 py-2.5 text-heading text-ink">
                      {SECTION_TITLE[section]} <span className="font-normal text-ink-secondary tabular-nums">({perSection(section)})</span>
                    </th>
                  </tr>
                )}
                <tr data-criterion-id={r.criterion_id} className="border-t border-line align-top hover:bg-page">
                  <td className="px-5 py-3">
                    <p className="text-small text-ink-secondary">
                      <span className="font-mono font-medium">{r.criterion_id}</span>
                      {section ? ` · ${section}` : ""}
                    </p>
                    <blockquote className="mt-1 text-quote text-ink">&ldquo;{r.quoted_criterion}&rdquo;</blockquote>
                  </td>
                  <td className="px-5 py-3" data-state={r.state}>
                    <StateCell state={r.state} />
                  </td>
                  <td className="px-5 py-3">
                    <AnswerQuote row={r} criterion={c} questions={questions} />
                  </td>
                </tr>
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
