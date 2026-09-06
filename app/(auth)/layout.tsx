import type { ReactNode } from "react";
import Link from "next/link";
import { ShieldCheck, Sparkles, Stethoscope } from "lucide-react";

export default function AuthLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-background selection:bg-primary/10 selection:text-primary relative overflow-hidden">
      {/* Ambient background decoration (subtle healthcare/clinical glow) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-primary/5 via-primary/2 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* Top Header */}
      <header className="w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2.5 group transition-opacity hover:opacity-90"
        >
          <div className="size-9 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shadow-xs shadow-primary/20">
            <Stethoscope className="size-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-lg leading-tight tracking-tight text-foreground flex items-center gap-1.5">
              DentAssist{" "}
              <span className="text-primary font-semibold text-xs px-1.5 py-0.5 rounded bg-primary/10">
                AI
              </span>
            </span>
            <span className="text-[11px] text-muted-foreground font-medium">
              Clinical Intelligence Platform
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-2 text-xs text-muted-foreground hidden sm:flex">
          <ShieldCheck className="size-4 text-primary" />
          <span>HIPAA-Ready & Encrypted</span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:px-6">
        <div className="w-full max-w-md animate-fadeIn">{children}</div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-6xl mx-auto px-6 py-6 border-t border-border/50 text-center text-xs text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-3">
        <p>© {new Date().getFullYear()} DentAssist AI. All rights reserved.</p>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1 text-[11px]">
            <Sparkles className="size-3 text-primary" /> Multi-Tenant Clinic
            Cloud
          </span>
        </div>
      </footer>
    </div>
  );
}
