// app/layout.tsx
import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import UserMenu from "@/components/UserMenu";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PulseNote",
  description: "Type your clinical notes, get a structured report.",
};
  
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
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
              <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">P</span>
              </div>
              <div className="leading-tight">
                <div className="text-xs text-slate-500">Clinical Note Reporter</div>
                <h1 className="text-lg font-semibold tracking-tight">PulseNote</h1>
              </div>
            </div>
            <nav className="text-sm text-slate-600 flex items-center gap-4">
              <a href="/" className="hover:text-slate-900">New Report</a>
              <a href="/workspaces" className="hover:text-slate-900">Workspaces</a>
              <a href="/report" className="hover:text-slate-900">Editor</a>
              <UserMenu />
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
}
