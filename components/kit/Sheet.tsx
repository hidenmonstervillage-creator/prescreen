import { sectionLabel } from "../ui";

/** One printed part of the kit: an A4 sheet on screen, its own page(s) on paper. */
export default function Sheet({
  part,
  label,
  title,
  meta,
  children,
  first = false,
}: {
  part: string;
  label: string;
  title: string;
  meta: string;
  children: React.ReactNode;
  first?: boolean;
}) {
  return (
    <section
      data-kit-part={part}
      className={`mx-auto w-full max-w-[210mm] bg-surface px-[14mm] py-[12mm] text-ink shadow-raised print:max-w-none print:p-0 print:shadow-none ${
        first ? "" : "print:break-before-page"
      }`}
    >
      <header className="border-b-2 border-ink pb-3">
        <p className={sectionLabel}>{label}</p>
        <h2 className="mt-1 text-[22px] font-bold leading-7">{title}</h2>
        <p className="mt-1 text-small text-ink-secondary">{meta}</p>
      </header>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** An empty tick box for paper. */
export function Box() {
  return <span aria-hidden="true" className="mt-0.5 inline-block size-4 shrink-0 rounded-sm border-[1.5px] border-ink" />;
}

/** A ruled line to write on. */
export function WriteLine({ label }: { label?: string }) {
  return (
    <p className="flex items-end gap-2 pt-3 text-small">
      {label && <span className="shrink-0 font-semibold">{label}</span>}
      <span aria-hidden="true" className="h-5 flex-1 border-b border-ink" />
    </p>
  );
}
