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
import { Badge } from "@/components/ui/badge";
import { ClinicSetupHub } from "@/components/clinic/clinic-setup-hub";
import {
  CheckCircle2,
  AlertTriangle,
  Stethoscope,
  Building2,
  ShieldCheck,
  Crown,
} from "lucide-react";

export const metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
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
                    OPS
                  </span>
                </div>
              </div>

              {/* Organization Switcher */}
              <div className="h-4 w-px bg-border hidden sm:block" />
              <OrganizationSwitcher />
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

        {/* Main Dashboard Workspace */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
          {organizations.length === 0 ? (
            <OrganizationEmptyState userName={user.name} />
          ) : (
            <>
              {/* Active Practice Context Banner - Flat Clinical Header */}
              <div className="rounded-[4px] border border-border bg-card p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[2px] border border-primary/20 bg-primary/10 text-primary text-[11px] font-semibold tracking-tight">
                      <Building2 className="size-3" /> Practice Workspace
                    </span>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      ID: {activeOrg?.slug}
                    </span>
                  </div>

                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                    {activeOrg?.name}
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0.2 gap-1 font-semibold border-border uppercase"
                    >
                      <Crown className="size-2.5 text-primary" />{" "}
                      {activeOrg?.role}
                    </Badge>
                  </h1>

                  <p className="text-xs text-muted-foreground max-w-xl leading-normal">
                    Clinic operating within{" "}
                    <code className="font-mono text-[11px] font-semibold text-foreground bg-muted px-1 py-0.5 rounded-[2px] border border-border/80">
                      {activeOrg?.slug}
                    </code>
                    {". "}Practitioner rosters, chair schedules, and policies
                    are isolated to this tenant.
                  </p>
                </div>

                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
                  <Badge
                    variant="success"
                    className="gap-1 px-2 py-0.5 text-[11px]"
                  >
                    <ShieldCheck className="size-3" /> Tenant Isolated
                  </Badge>
                  {user.emailVerified ? (
                    <Badge
                      variant="success"
                      className="gap-1 px-2 py-0.5 text-[11px]"
                    >
                      <CheckCircle2 className="size-3" /> Verified Account
                    </Badge>
                  ) : (
                    <Badge
                      variant="warning"
                      className="gap-1 px-2 py-0.5 text-[11px]"
                    >
                      <AlertTriangle className="size-3" /> Unverified Email
                    </Badge>
                  )}
                </div>
              </div>

              {/* Clinic Setup Hub with Tabs */}
              <ClinicSetupHub />
            </>
          )}
        </main>

        {/* Workspace Footer */}
        <footer className="border-t border-border py-4 px-6 bg-card text-xs text-muted-foreground mt-auto">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <span className="font-mono text-[11px]">
              DentAssist AI • Operations Console
            </span>
            <span className="text-[11px]">
              Active Tenant: {activeOrg?.name || "None"} (
              {activeOrg?.slug || "none"})
            </span>
          </div>
        </footer>
      </div>
    </OrganizationProvider>
  );
}
