import { requireSitePage } from "@/lib/site-auth";
import { listSubmissions } from "@/lib/trials";
import { formatDate } from "@/lib/format";
import SiteShell from "@/components/SiteShell";
import InboxTable from "@/components/InboxTable";
import MapFooter from "@/components/MapFooter";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  await requireSitePage();
  const rows = await listSubmissions();
  return (
    <SiteShell>
      <h1 className="mb-5 text-title text-ink">Hospital inbox</h1>
      <InboxTable rows={rows.map((r) => ({ ...r, submitted: formatDate(r.created_at) }))} />
      <MapFooter />
    </SiteShell>
  );
}
