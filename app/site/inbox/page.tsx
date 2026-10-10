import type { Metadata } from "next";
import { requireSitePage } from "@/lib/site-auth";
import { listSubmissions } from "@/lib/trials";
import { formatDate } from "@/lib/format";
import SiteShell from "@/components/SiteShell";
import InboxTable from "@/components/InboxTable";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Hospital inbox" };

export default async function InboxPage() {
  await requireSitePage();
  const rows = await listSubmissions();
  return (
    <SiteShell>
      <h1 className="mb-6 text-title text-ink">Hospital inbox</h1>
      <InboxTable rows={rows.map((r) => ({ ...r, submitted: formatDate(r.created_at) }))} />
    </SiteShell>
  );
}
