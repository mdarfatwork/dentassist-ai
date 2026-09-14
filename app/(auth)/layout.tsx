import type { ReactNode } from "react";
import Link from "next/link";
import { ShieldCheck, Stethoscope } from "lucide-react";

export default function AuthLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-background text-foreground selection:bg-primary/10 selection:text-primary">
      {/* Top Header */}
      <header className="w-full border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2.5 group transition-opacity hover:opacity-90"
          >
            <div className="size-7.5 rounded-[3px] bg-primary flex items-center justify-center text-primary-foreground shadow-none">
              <Stethoscope className="size-4" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm leading-tight tracking-tight text-foreground">
                DentAssist
              </span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-[2px] bg-primary/10 text-primary border border-primary/20">
                AI
              </span>
              <span className="hidden sm:inline text-xs text-muted-foreground ml-2 pl-2 border-l border-border">
                Clinical Access Portal
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5 text-primary" />
            <span className="text-[11px] font-mono">
              HIPAA Encrypted Session
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-md">{children}</div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-border bg-card py-4 px-6 text-xs text-muted-foreground">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            © {new Date().getFullYear()} DentAssist AI. All rights reserved.
          </span>
          <span className="text-[11px] font-mono">
            Clinical Authentication Protocol
          </span>
        </div>
      </footer>
    </div>
  );
}
