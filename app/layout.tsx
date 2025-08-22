// app/layout.tsx
import "../styles/globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Image from "next/image";
import type { Metadata, Viewport } from "next";
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PulseNote",
  description: "Paste chat on the left, actions in the middle, live draft on the right.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* Header */}
        <header className="relative border-b">
          <div className="absolute inset-0 -z-10 bg-gradient-to-br from-emerald-50 via-white to-sky-50" />
          <div className="container-narrow py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image src="/publiclogo.png" alt="PulseNote logo" width={128} height={32} priority />
              <div className="leading-tight">
              <div className="text-xs text-slate-500">Feedback Reporter</div>
              <h1 className="text-lg font-semibold tracking-tight">PulseNote</h1>
              </div>
            </div>
            <nav className="text-sm text-slate-600 flex items-center gap-4">
              <a href="/" className="hover:text-slate-900">New</a>
              <a href="/report" className="hover:text-slate-900">Editor</a>
            </nav>
          </div>
        </header>

        <main className="container-narrow py-8 space-y-8">{children}</main>

        <footer className="border-t">
          <div className="container-narrow py-8 text-center text-xs text-slate-500">
            Built with Next.js + Tailwind + TipTap
          </div>
        </footer>
      </body>
    </html>
  );



export const metadata: Metadata = {
  title: "PulseNote",
  description: "Paste WhatsApp feedback, get a structured report.",
};
  
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};
}
