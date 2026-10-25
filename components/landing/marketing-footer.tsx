import Link from "next/link";
import { Stethoscope } from "lucide-react";

export function MarketingFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border/80 bg-card/60 text-stone-600 dark:text-stone-400 py-12 px-4 sm:px-6 lg:px-8 mt-auto">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start justify-between">
          {/* Brand & Purpose Column */}
          <div className="md:col-span-5 space-y-3">
            <Link
              href="/"
              className="flex items-center gap-2 group w-fit focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary rounded p-0.5"
            >
              <div className="size-7 rounded-md bg-primary flex items-center justify-center text-primary-foreground">
                <Stethoscope className="size-4" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-bold text-sm tracking-tight text-foreground">
                  DentAssist
                </span>
                <span className="text-[10px] font-mono font-semibold px-1 py-0.2 rounded bg-primary/10 text-primary border border-primary/20">
                  AI
                </span>
              </div>
            </Link>

            <p className="text-xs text-muted-foreground leading-relaxed max-w-sm">
              AI receptionist for dental practices. Answers patient questions
              using clinic documents and assists with Google Calendar
              appointment scheduling.
            </p>
          </div>

          {/* Navigation Column */}
          <div className="md:col-span-4 space-y-2.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Navigation
            </p>
            <ul className="space-y-2 text-xs">
              <li>
                <a
                  href="#how-it-works"
                  className="hover:text-foreground transition-colors"
                >
                  How It Works
                </a>
              </li>
              <li>
                <a
                  href="#features"
                  className="hover:text-foreground transition-colors"
                >
                  Features & Knowledge Base
                </a>
              </li>
              <li>
                <a
                  href="#scheduling"
                  className="hover:text-foreground transition-colors"
                >
                  Google Calendar Scheduling
                </a>
              </li>
              <li>
                <a
                  href="#security"
                  className="hover:text-foreground transition-colors"
                >
                  Security & Multi-Tenancy
                </a>
              </li>
              <li>
                <a
                  href="#faq"
                  className="hover:text-foreground transition-colors"
                >
                  Frequently Asked Questions
                </a>
              </li>
            </ul>
          </div>

          {/* Clinic Account Access Column */}
          <div className="md:col-span-3 space-y-2.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Clinic Portal
            </p>
            <ul className="space-y-2 text-xs">
              <li>
                <Link
                  href="/signup"
                  className="hover:text-foreground transition-colors"
                >
                  Create Practice Account
                </Link>
              </li>
              <li>
                <Link
                  href="/login"
                  className="hover:text-foreground transition-colors"
                >
                  Sign In to Portal
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard"
                  className="hover:text-foreground transition-colors"
                >
                  Practice Dashboard
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Strip */}
        <div className="mt-12 pt-6 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>Copyright © {currentYear} DentAssist AI. All rights reserved.</p>
          <p className="text-[11px]">
            Crafted with care by{" "}
            <a
              href="https://arfat.is-a.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
            >
              Arfat
            </a>{" "}
          </p>
        </div>
      </div>
    </footer>
  );
}
