import type { Metadata } from "next";
import { requireSitePage } from "@/lib/site-auth";
import SiteShell from "@/components/SiteShell";
import NewTrial from "@/components/NewTrial";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "New trial" };

export default async function NewTrialPage() {
  await requireSitePage();
  return (
    <SiteShell>
      <h1 className="mb-6 text-title text-ink">New trial</h1>
      <NewTrial />
    </SiteShell>
  );
}
