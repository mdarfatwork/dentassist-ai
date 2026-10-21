import type { ReactNode } from "react";
import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import {
  getUserOrganizations,
  getActiveOrganization,
} from "@/lib/auth/organization";
import { ACTIVE_ORG_COOKIE_NAME } from "@/lib/organization/cookies";
import { OrganizationProvider } from "@/components/organization/organization-provider";
import { OrganizationEmptyState } from "@/components/organization/organization-empty-state";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export const metadata = {
  title: {
    template: "%s | DentAssist AI",
    default: "Clinical Operations Dashboard | DentAssist AI",
  },
  description:
    "Autonomous AI clinical operating system for dental practices. Appointments, rosters, knowledge, and receptionist management.",
};

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
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
      {organizations.length === 0 ? (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <OrganizationEmptyState userName={user.name} />
        </div>
      ) : (
        <DashboardShell
          userName={user.name}
          userEmail={user.email}
          emailVerified={user.emailVerified}
        >
          {children}
        </DashboardShell>
      )}
    </OrganizationProvider>
  );
}
