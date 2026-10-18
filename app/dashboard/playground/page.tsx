import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import {
  getUserOrganizations,
  getActiveOrganization,
} from "@/lib/auth/organization";
import { ACTIVE_ORG_COOKIE_NAME } from "@/lib/organization/cookies";
import { OrganizationProvider } from "@/components/organization/organization-provider";
import { OrganizationSwitcher } from "@/components/organization/organization-switcher";
import { OrganizationEmptyState } from "@/components/organization/organization-empty-state";
import { LogoutButton } from "@/components/auth/logout-button";
import { ReceptionistPlayground } from "@/components/receptionist/receptionist-playground";
import { Stethoscope, ArrowLeft } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "AI Receptionist Playground | DentAssist AI",
  description:
    "Test multi-turn patient conversations, inspect retrieval, and debug real AI Core execution traces.",
};

export default async function PlaygroundPage() {
  const reqHeaders = await headers();
  const cookieStore = await cookies();

  const sessionData = await auth.api.getSession({
    headers: reqHeaders,
  });

  if (!sessionData?.user) {
    redirect("/login");
  }

  const { user } = sessionData;

  const activeOrgCookie =
    cookieStore.get(ACTIVE_ORG_COOKIE_NAME)?.value ?? null;
  const organizations = await getUserOrganizations(user.id);
  const activeOrg = await getActiveOrganization(user.id, activeOrgCookie);

  return (
    <OrganizationProvider
      initialActiveOrg={activeOrg}
      initialOrganizations={organizations}
    >
      <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
        {/* Top Operational Navigation Bar */}
        <header className="border-b border-border bg-card sticky top-0 z-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2.5">
                <div className="size-7.5 rounded-[3px] bg-primary flex items-center justify-center text-primary-foreground shrink-0">
                  <Stethoscope className="size-4" />
                </div>
                <div className="hidden sm:flex items-center gap-1.5">
                  <span className="font-bold text-sm leading-none text-foreground tracking-tight">
                    DentAssist
                  </span>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-[2px] bg-primary/10 text-primary border border-primary/20">
                    PLAYGROUND
                  </span>
                </div>
              </div>

              {/* Organization Switcher */}
              <div className="h-4 w-px bg-border hidden sm:block" />
              <OrganizationSwitcher />

              <Link
                href="/dashboard"
                className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors pl-2"
              >
                <ArrowLeft className="size-3.5" />
                <span>Dashboard</span>
              </Link>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden md:flex flex-col text-right pr-2">
                <span className="text-xs font-semibold text-foreground leading-tight">
                  {user.name}
                </span>
                <span className="text-[11px] text-muted-foreground font-mono leading-tight">
                  {user.email}
                </span>
              </div>
              <LogoutButton variant="outline" />
            </div>
          </div>
        </header>

        {/* Main Playground Content */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
          {organizations.length === 0 ? (
            <OrganizationEmptyState userName={user.name} />
          ) : (
            <ReceptionistPlayground />
          )}
        </main>

        {/* Console Footer */}
        <footer className="border-t border-border py-4 px-6 bg-card text-xs text-muted-foreground mt-auto">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <span className="font-mono text-[11px]">
              DentAssist AI • AI Receptionist Playground & Observability
            </span>
            <span className="text-[11px]">
              Tenant: {activeOrg?.name || "None"} ({activeOrg?.slug || "none"})
            </span>
          </div>
        </footer>
      </div>
    </OrganizationProvider>
  );
}
