import { redirect } from "next/navigation";
import { hasSiteSession } from "@/lib/site-auth";
import PasscodeForm from "@/components/PasscodeForm";
import PublicHeader from "@/components/PublicHeader";
import { cardClass } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function SiteGate() {
  if (await hasSiteSession()) redirect("/site/inbox");
  return (
    <>
      <PublicHeader current="site" />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-12">
        <div className={`${cardClass} p-6`}>
          <h1 className="text-title text-ink">Hospital sign in</h1>
          <p className="mb-6 mt-1 text-body text-ink-secondary">For the hospital research team. Enter the hospital passcode.</p>
          <PasscodeForm />
        </div>
      </main>
    </>
  );
}
