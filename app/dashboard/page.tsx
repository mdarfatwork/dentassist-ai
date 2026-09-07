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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CheckCircle2,
  AlertTriangle,
  Stethoscope,
  User,
  Mail,
  Calendar,
  Key,
  Shield,
  Building2,
  ShieldCheck,
  Layers,
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

  const { user, session } = sessionData;

  const activeOrgCookie =
    cookieStore.get(ACTIVE_ORG_COOKIE_NAME)?.value ?? null;
  const organizations = await getUserOrganizations(user.id);
  const activeOrg = await getActiveOrganization(user.id, activeOrgCookie);

  return (
    <OrganizationProvider
      initialActiveOrg={activeOrg}
      initialOrganizations={organizations}
    >
      <div className="min-h-screen bg-background flex flex-col">
        {/* Top Navigation Bar */}
        <header className="border-b border-border bg-card sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shadow-xs shadow-primary/20 shrink-0">
                  <Stethoscope className="size-5" />
                </div>
                <div className="hidden sm:block">
                  <span className="font-bold text-base leading-none text-foreground flex items-center gap-1.5">
                    DentAssist{" "}
                    <span className="text-primary font-semibold text-xs px-1.5 py-0.5 rounded bg-primary/10">
                      AI
                    </span>
                  </span>
                  <span className="text-[11px] text-muted-foreground block">
                    Receptionist Management Portal
                  </span>
                </div>
              </div>

              {/* Organization Switcher */}
              <div className="h-6 w-px bg-border hidden sm:block" />
              <OrganizationSwitcher />
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden md:flex flex-col text-right">
                <span className="text-sm font-semibold text-foreground">
                  {user.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {user.email}
                </span>
              </div>
              <LogoutButton variant="outline" />
            </div>
          </div>
        </header>

        {/* Main Dashboard Content */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">
          {organizations.length === 0 ? (
            <OrganizationEmptyState userName={user.name} />
          ) : (
            <>
              {/* Active Organization Context Banner */}
              <div className="rounded-xl border border-primary/25 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/15 text-primary text-xs font-semibold">
                    <Building2 className="size-3.5" /> Active Organization
                    Context
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
                    {activeOrg?.name}
                    <Badge
                      variant="default"
                      className="text-xs px-2 py-0.5 gap-1 font-semibold"
                    >
                      <Crown className="size-3" /> {activeOrg?.role}
                    </Badge>
                  </h1>
                  <p className="text-sm text-muted-foreground max-w-xl">
                    Operating within{" "}
                    <span className="font-mono text-xs font-semibold text-foreground bg-muted px-1.5 py-0.5 rounded">
                      {activeOrg?.slug}
                    </span>
                    {". "}All queries and clinic configurations are
                    tenant-isolated.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                  <Badge variant="success" className="gap-1 px-3 py-1 text-xs">
                    <ShieldCheck className="size-3.5" /> Tenant Isolated
                  </Badge>
                  {user.emailVerified ? (
                    <Badge
                      variant="success"
                      className="gap-1 px-3 py-1 text-xs"
                    >
                      <CheckCircle2 className="size-3.5" /> Email Verified
                    </Badge>
                  ) : (
                    <Badge
                      variant="warning"
                      className="gap-1 px-3 py-1 text-xs"
                    >
                      <AlertTriangle className="size-3.5" /> Unverified Email
                    </Badge>
                  )}
                </div>
              </div>

              {/* Grid Cards: Organization Info + User Profile + Session */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Active Organization Details */}
                <Card className="border-border shadow-xs">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <Building2 className="size-4 text-primary" /> Clinic
                      Workspace
                    </CardTitle>
                    <CardDescription>
                      Multi-tenant organization boundary
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex items-center justify-between py-2 border-b border-border/60">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <Building2 className="size-3.5" /> Clinic Name
                      </span>
                      <span className="font-medium text-foreground truncate max-w-[150px]">
                        {activeOrg?.name}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-border/60">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <Layers className="size-3.5" /> Slug
                      </span>
                      <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono text-foreground font-semibold">
                        {activeOrg?.slug}
                      </code>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-border/60">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <Crown className="size-3.5" /> Your Role
                      </span>
                      <Badge
                        variant="secondary"
                        className="font-semibold text-xs uppercase"
                      >
                        {activeOrg?.role}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-border/60">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <ShieldCheck className="size-3.5" /> Tenant Isolation
                      </span>
                      <span className="text-emerald-600 font-medium text-xs flex items-center gap-1">
                        <CheckCircle2 className="size-3.5" /> Enforced (RBAC
                        ready)
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <Key className="size-3.5" /> Org ID
                      </span>
                      <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono text-muted-foreground max-w-[130px] truncate">
                        {activeOrg?.id}
                      </code>
                    </div>
                  </CardContent>
                </Card>

                {/* User Profile Card */}
                <Card className="border-border shadow-xs">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <User className="size-4 text-primary" /> Authenticated
                      Profile
                    </CardTitle>
                    <CardDescription>
                      Account details from database
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex items-center justify-between py-2 border-b border-border/60">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <User className="size-3.5" /> Full Name
                      </span>
                      <span className="font-medium text-foreground">
                        {user.name}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-border/60">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <Mail className="size-3.5" /> Email
                      </span>
                      <span className="font-medium text-foreground truncate max-w-[150px]">
                        {user.email}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-border/60">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <Building2 className="size-3.5" /> Total Clinics
                      </span>
                      <span className="font-medium text-foreground">
                        {organizations.length}{" "}
                        {organizations.length === 1
                          ? "Organization"
                          : "Organizations"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-border/60">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <Shield className="size-3.5" /> Verification
                      </span>
                      <span>
                        {user.emailVerified ? (
                          <span className="text-emerald-600 font-medium text-xs flex items-center gap-1">
                            <CheckCircle2 className="size-3.5" /> Verified
                          </span>
                        ) : (
                          <span className="text-amber-600 font-medium text-xs flex items-center gap-1">
                            <AlertTriangle className="size-3.5" /> Pending
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <Key className="size-3.5" /> User ID
                      </span>
                      <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono text-muted-foreground max-w-[130px] truncate">
                        {user.id}
                      </code>
                    </div>
                  </CardContent>
                </Card>

                {/* Active Session Card */}
                <Card className="border-border shadow-xs">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <Calendar className="size-4 text-primary" /> Session
                      Information
                    </CardTitle>
                    <CardDescription>
                      Better Auth cryptographic session
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex items-center justify-between py-2 border-b border-border/60">
                      <span className="text-muted-foreground">Session ID</span>
                      <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono text-muted-foreground max-w-[140px] truncate">
                        {session.id}
                      </code>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-border/60">
                      <span className="text-muted-foreground">Expires At</span>
                      <span className="font-medium text-foreground text-xs">
                        {new Date(session.expiresAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-border/60">
                      <span className="text-muted-foreground">Created</span>
                      <span className="font-medium text-foreground text-xs">
                        {new Date(session.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-muted-foreground">Auth Type</span>
                      <span className="font-medium text-foreground capitalize text-xs">
                        Better Auth Session
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </main>
      </div>
    </OrganizationProvider>
  );
}
