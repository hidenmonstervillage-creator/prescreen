import type { Metadata } from "next";
import MapFooter from "@/components/MapFooter";
import "./globals.css";

export const metadata: Metadata = {
  // "Atlas" alone on the landing; "Atlas · <page name>" wherever a page names itself.
  title: { default: "Atlas", template: "Atlas · %s" },
  description: "Per-trial pre-screen questions for hospitals that run clinical trials.",
  robots: { index: false, follow: false },
};

// Both families come from public/fonts (@font-face in globals.css); the preloads fetch them from this
// origin before first paint. Every screen ends with the footer.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preload" href="/fonts/Geologica-Sharp-Variable.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/OverpassMono-Variable.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      </head>
      <body className="flex min-h-screen flex-col bg-page font-sans text-body text-ink antialiased">
        <div className="flex flex-1 flex-col">{children}</div>
        <MapFooter />
      </body>
    </html>
  );
}
