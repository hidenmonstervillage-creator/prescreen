import { requireSitePage } from "@/lib/site-auth";
import SiteNav from "@/components/SiteNav";
import NewTrial from "@/components/NewTrial";

export const dynamic = "force-dynamic";

export default async function NewTrialPage() {
  await requireSitePage();
  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-7xl p-6">
        <h1 className="mb-4 text-2xl font-semibold">New trial</h1>
        <NewTrial />
      </main>
    </>
  );
}
