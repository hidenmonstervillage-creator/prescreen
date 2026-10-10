import SiteNav from "./SiteNav";

/** The research team's page frame: the header bar and the 1400px content column with 20px gutters. */
export default function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteNav />
      <main className="mx-auto w-full max-w-content px-5 pb-12 pt-10">{children}</main>
    </>
  );
}
