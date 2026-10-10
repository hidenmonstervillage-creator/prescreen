import { requireSitePage } from "@/lib/site-auth";
import { listSubmissions } from "@/lib/trials";
import SiteNav from "@/components/SiteNav";
import InboxTable from "@/components/InboxTable";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  await requireSitePage();
  const rows = await listSubmissions();
  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-5xl p-6">
        <h1 className="mb-4 text-2xl font-semibold">Inbox</h1>
        <InboxTable rows={rows} />
      </main>
    </>
  );
}
