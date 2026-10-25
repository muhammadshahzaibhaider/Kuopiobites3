import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Axiom Labs — Enterprise AI Architecture & Digital Engineering",
  description:
    "Axiom Labs explores sovereign AI patterns, agent orchestration, and precision digital products through workshops, prototypes, and honest evaluation. Illustrative work only — no client results guaranteed.",
  keywords: ["Axiom Labs", "AI Architecture", "Autonomous Agents", "Enterprise AI", "Next.js", "Digital Engineering"],
  authors: [{ name: "Axiom Labs Studio" }],
  openGraph: {
    title: "Axiom Labs — Enterprise AI Architecture & Digital Engineering",
    description: "Workshops, prototypes, and evaluation for AI systems and digital products. Demo site with illustrative concepts.",
    url: "https://axiomlabs.agency",
    siteName: "Axiom Labs",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Axiom Labs — Enterprise AI Architecture & Digital Engineering",
    description: "Workshops, prototypes, and evaluation for AI systems and digital products.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#030303",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body className="min-h-screen bg-[#030303] text-zinc-100 antialiased selection:bg-brand-primary selection:text-white font-sans overflow-x-hidden">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-brand-primary focus:text-white focus:rounded-md focus:shadow-lg focus:outline-none"
        >
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
