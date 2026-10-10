import SiteNav from "./SiteNav";

/** Site staff page frame: the header bar and one content column. `wide` is for the three-column trial screen. */
export default function SiteShell({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <>
      <SiteNav />
      <main className={`mx-auto px-6 py-6 ${wide ? "max-w-[1760px]" : "max-w-content"}`}>{children}</main>
    </>
  );
}
