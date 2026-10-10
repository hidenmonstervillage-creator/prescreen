import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto max-w-xl p-8">
      <h1 className="text-2xl font-semibold">Pre-screen</h1>
      <p className="mt-2 text-gray-600">
        Plain-language pre-screen questions for one clinical trial at a time. Every answer is mapped to the trial
        criterion it speaks to, with its source quoted.
      </p>
      <p className="mt-6">
        <Link href="/site" className="text-blue-700 underline" data-nav="site">
          Site staff sign in
        </Link>
      </p>
    </main>
  );
}
