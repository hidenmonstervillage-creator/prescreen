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
    // overflow-clip, not overflow-hidden, so the sticky header keeps sticking (Karma).
    <div className="overflow-clip rounded-xl border border-line bg-surface shadow-card">
      <table data-matrix className="w-full table-fixed border-collapse text-left">
        <colgroup>
          <col className="w-[44%]" />
          <col className="w-[20rem]" />
          <col />
        </colgroup>
        <thead className="sticky top-0 z-10 bg-surface-sunken">
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
                      {SECTION_TITLE[section]} <span className="font-normal text-ink-secondary">({perSection(section)})</span>
                    </th>
                  </tr>
                )}
                <tr data-criterion-id={r.criterion_id} className="border-t border-line align-top hover:bg-page">
                  <td className="px-5 py-4">
                    <p className="text-small text-ink-secondary">
                      <span className="font-mono font-medium">{r.criterion_id}</span>
                      {section ? ` · ${section}` : ""}
                    </p>
                    <blockquote className="mt-1 text-[18px] leading-7 text-ink">&ldquo;{r.quoted_criterion}&rdquo;</blockquote>
                  </td>
                  <td className="px-5 py-4" data-state={r.state}>
                    <StateCell state={r.state} />
                  </td>
                  <td className="px-5 py-4">
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
