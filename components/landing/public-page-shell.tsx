import { ReactNode } from "react";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { MarketingHeader } from "./marketing-header";
import { MarketingFooter } from "./marketing-footer";

interface PublicPageShellProps {
  children: ReactNode;
  className?: string;
}

export async function PublicPageShell({
  children,
  className,
}: Readonly<PublicPageShellProps>) {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({
    headers: reqHeaders,
  });

  const isAuthenticated = Boolean(session?.user);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-primary/15 selection:text-primary">
      {/* Accessible skip link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:shadow-md text-xs font-semibold"
      >
        Skip to main content
      </a>

      {/* Shared Marketing Header */}
      <MarketingHeader isAuthenticated={isAuthenticated} />

      {/* Main Content Area */}
      <main id="main-content" className={`flex-1 ${className || ""}`}>
        {children}
      </main>

      {/* Shared Marketing Footer */}
      <MarketingFooter />
    </div>
  );
}
