import Link from "next/link";
import type { InboxRow } from "@/lib/trials";
import { formatDate } from "@/lib/format";

export default function InboxTable({ rows }: { rows: InboxRow[] }) {
  if (!rows.length) return <p className="text-sm text-gray-600">No submissions yet.</p>;
  return (
    <table data-inbox className="w-full border-collapse text-left text-sm">
      <thead>
        <tr className="border-b border-gray-300 text-xs uppercase tracking-wide text-gray-500">
          <th className="py-2 pr-3">Trial</th>
          <th className="py-2 pr-3">Date</th>
          <th className="py-2">Contact</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} data-submission-id={r.id} className="border-b border-gray-200 align-top hover:bg-gray-50">
            <td className="py-2 pr-3">
              <Link href={`/site/inbox/${r.id}`} className="text-blue-700 hover:underline" data-open-submission>
                {r.trial?.nct_id ?? "Unknown trial"}
              </Link>
              <p className="text-xs text-gray-600">{r.trial?.title}</p>
            </td>
            <td className="whitespace-nowrap py-2 pr-3">{formatDate(r.created_at)}</td>
            <td className="py-2">{r.contact}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
