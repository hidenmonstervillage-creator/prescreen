import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Karma's two families, self-hosted from public/fonts and bundled by next/font: no network requests.
const sans = localFont({
  src: "../public/fonts/Geologica-Sharp-Variable.woff2",
  weight: "100 900",
  variable: "--font-sans",
  display: "swap",
});

const mono = localFont({
  src: "../public/fonts/OverpassMono-Variable.woff2",
  weight: "300 700",
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Pre-screen",
  description: "Per-trial pre-screen questions for clinical trial sites.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body className="min-h-screen bg-page font-sans text-body text-ink antialiased">{children}</body>
    </html>
  );
}
