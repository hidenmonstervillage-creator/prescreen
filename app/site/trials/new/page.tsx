import { requireSitePage } from "@/lib/site-auth";
import SiteShell from "@/components/SiteShell";
import NewTrial from "@/components/NewTrial";

export const dynamic = "force-dynamic";

export default async function NewTrialPage() {
  await requireSitePage();
  return (
    <SiteShell wide>
      <h1 className="mb-5 text-title text-ink">New trial</h1>
      <NewTrial />
    </SiteShell>
  );
}
