import { redirect } from "next/navigation";
import { hasSiteSession } from "@/lib/site-auth";
import PasscodeForm from "@/components/PasscodeForm";

export const dynamic = "force-dynamic";

export default async function SiteGate() {
  if (await hasSiteSession()) redirect("/site/inbox");
  return (
    <main className="mx-auto max-w-sm p-8">
      <h1 className="mb-1 text-2xl font-semibold">Site sign in</h1>
      <p className="mb-6 text-sm text-gray-600">For trial site staff. Enter the site passcode.</p>
      <PasscodeForm />
    </main>
  );
}
