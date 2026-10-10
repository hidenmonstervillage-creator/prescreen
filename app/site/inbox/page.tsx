import { requireSitePage } from "@/lib/site-auth";
import { listSubmissions } from "@/lib/trials";
import SiteShell from "@/components/SiteShell";
import InboxTable from "@/components/InboxTable";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  await requireSitePage();
  const rows = await listSubmissions();
  return (
    <SiteShell>
      <h1 className="mb-5 text-title text-ink">Inbox</h1>
      <InboxTable rows={rows} />
    </SiteShell>
  );
}
