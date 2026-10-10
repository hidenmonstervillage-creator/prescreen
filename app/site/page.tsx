import { redirect } from "next/navigation";
import { hasSiteSession } from "@/lib/site-auth";
import PasscodeForm from "@/components/PasscodeForm";
import { cardClass, sectionLabel } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function SiteGate() {
  if (await hasSiteSession()) redirect("/site/inbox");
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <p className={sectionLabel}>Pre-screen</p>
      <div className={`${cardClass} mt-3 px-7 py-8`}>
        <h1 className="text-title text-ink">Site sign in</h1>
        <p className="mb-6 mt-1 text-body text-ink-secondary">For trial site staff. Enter the site passcode.</p>
        <PasscodeForm />
      </div>
    </main>
  );
}
