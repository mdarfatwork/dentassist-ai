import type { ReactNode } from "react";
import Link from "next/link";
import { Stethoscope } from "lucide-react";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: ReactNode;
  headerSlot?: ReactNode;
  userSlot?: ReactNode;
  className?: string;
}

export function AppShell({
  children,
  headerSlot,
  userSlot,
  className,
}: Readonly<AppShellProps>) {
  return (
    <div
      className={cn(
        "min-h-screen bg-background flex flex-col font-sans",
        className,
      )}
    >
      {/* Top Clinical Navigation Bar */}
      <header className="border-b border-border bg-card sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Brand Logo & Name */}
            <Link
              href="/dashboard"
              className="flex items-center gap-2.5 group transition-opacity hover:opacity-90 shrink-0"
            >
              <div className="size-7 rounded-[3px] bg-primary flex items-center justify-center text-primary-foreground shadow-none">
                <Stethoscope className="size-4" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-tight text-foreground">
                  DentAssist
                </span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-[2px] bg-primary/10 text-primary border border-primary/20">
                  OPS
                </span>
              </div>
            </Link>

            {/* Injected Header Elements (Organization Switcher, Breadcrumbs, etc.) */}
            {headerSlot && (
              <>
                <div className="h-4 w-px bg-border hidden sm:block" />
                {headerSlot}
              </>
            )}
          </div>

          {/* User Controls & Actions */}
          {userSlot && (
            <div className="flex items-center gap-3">{userSlot}</div>
          )}
        </div>
      </header>

      {/* Main Workspace Surface */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
        {children}
      </main>

      {/* Operational Footer */}
      <footer className="border-t border-border py-4 px-6 bg-card text-xs text-muted-foreground mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="font-mono text-[11px]">
            DentAssist AI Clinical Operating System • v0.1.0
          </span>
          <span className="text-[11px]">
            Tenant Isolated • Encrypted Session
          </span>
        </div>
      </footer>
    </div>
  );
}
