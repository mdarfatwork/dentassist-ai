"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Stethoscope, ArrowRight, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MarketingHeaderProps {
  isAuthenticated?: boolean;
}

const NAV_ITEMS = [
  { label: "How It Works", href: "#how-it-works" },
  { label: "Features", href: "#features" },
  { label: "Scheduling", href: "#scheduling" },
  { label: "Security", href: "#security" },
  { label: "FAQ", href: "#faq" },
];

export function MarketingHeader({
  isAuthenticated = false,
}: Readonly<MarketingHeaderProps>) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 12);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full transition-all duration-200 border-b",
        isScrolled
          ? "border-border/80 bg-background/90 backdrop-blur-md shadow-xs shadow-stone-900/5"
          : "border-border/50 bg-background/80 backdrop-blur-xs",
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand / Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 group focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary rounded-md p-1 -m-1"
          aria-label="DentAssist AI Homepage"
        >
          <div className="size-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shadow-xs transition-transform duration-200 group-hover:scale-105">
            <Stethoscope className="size-4.5" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-bold text-base tracking-tight text-foreground">
              DentAssist
            </span>
            <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded-sm bg-primary/10 text-primary border border-primary/20">
              AI
            </span>
            <span className="hidden md:inline text-xs text-muted-foreground ml-2 pl-2 border-l border-border/80">
              Receptionist for Dental Practices
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav
          className="hidden lg:flex items-center gap-1 xl:gap-2 text-xs font-medium text-stone-600 dark:text-stone-300"
          aria-label="Main Navigation"
        >
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="px-3 py-1.5 rounded-md hover:text-foreground hover:bg-muted/70 transition-colors"
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Desktop CTAs */}
        <div className="hidden sm:flex items-center gap-2.5">
          {isAuthenticated ? (
            <Link href="/dashboard">
              <Button size="sm" className="gap-1.5 shadow-xs font-medium">
                Go to Dashboard <ArrowRight className="size-3.5" />
              </Button>
            </Link>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm" className="font-medium">
                  Sign In
                </Button>
              </Link>
              <Link href="/signup">
                <Button size="sm" className="gap-1.5 shadow-xs font-medium">
                  Create Practice Account <ArrowRight className="size-3.5" />
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex sm:hidden items-center gap-2">
          {isAuthenticated ? (
            <Link href="/dashboard">
              <Button size="xs" className="gap-1 font-medium">
                Dashboard
              </Button>
            </Link>
          ) : (
            <Link href="/signup">
              <Button size="xs" className="gap-1 font-medium">
                Sign Up
              </Button>
            </Link>
          )}

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-md text-foreground hover:bg-muted focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary"
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {mobileMenuOpen ? (
              <X className="size-5" />
            ) : (
              <Menu className="size-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Slide-Down Drawer */}
      {mobileMenuOpen && (
        <div
          className="sm:hidden border-b border-border bg-card/95 backdrop-blur-lg px-4 pt-3 pb-6 space-y-4 animate-in fade-in-50 slide-in-from-top-2 duration-200"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Navigation Menu"
        >
          <nav className="flex flex-col space-y-1">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={closeMobileMenu}
                className="px-3 py-2.5 rounded-md text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="pt-3 border-t border-border flex flex-col gap-2">
            {isAuthenticated ? (
              <Link href="/dashboard" onClick={closeMobileMenu}>
                <Button className="w-full justify-center gap-2">
                  Go to Clinic Dashboard <ArrowRight className="size-4" />
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/signup" onClick={closeMobileMenu}>
                  <Button className="w-full justify-center gap-2 shadow-xs">
                    Create Practice Account <ArrowRight className="size-4" />
                  </Button>
                </Link>
                <Link href="/login" onClick={closeMobileMenu}>
                  <Button
                    variant="outline"
                    className="w-full justify-center text-foreground"
                  >
                    Sign In to Portal
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
