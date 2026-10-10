import { notFound } from "next/navigation";
import { getPublishedTrialBySlug } from "@/lib/trials";
import { toPublicQuestion } from "@/lib/types";
import PublicForm from "@/components/PublicForm";

export const dynamic = "force-dynamic";

export default async function PublicPrescreen({ params }: { params: { slug: string } }) {
  const trial = await getPublishedTrialBySlug(params.slug);
  if (!trial || !trial.slug) notFound();
  return (
    <main className="mx-auto max-w-2xl p-6">
      <p className="text-xs uppercase tracking-wide text-gray-500">Pre-screen questions</p>
      <h1 className="mt-1 text-xl font-semibold">{trial.title}</h1>
      <p className="text-sm text-gray-600">{trial.nct_id}</p>
      <p className="mt-4 text-sm text-gray-700">
        Answer what you know. You can choose &ldquo;Not sure&rdquo; or leave a question blank. The trial site reads your answers and
        contacts you.
      </p>
      <p className="mt-2 rounded border border-amber-300 bg-amber-50 p-2 text-sm text-amber-900" data-demo-notice>
        Demo site: use invented details only. Do not enter real health information or real contact details.
      </p>
      <div className="mt-6">
        <PublicForm slug={trial.slug} questions={trial.questions.map(toPublicQuestion)} />
      </div>
    </main>
  );
}
