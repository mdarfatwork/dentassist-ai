"use client";

import React, { useState, useEffect, Suspense, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { useOrganization } from "@/components/organization/organization-provider";
import { DashboardSidebar } from "./dashboard-sidebar";
import { DashboardHeader } from "./dashboard-header";
import { getDashboardRouteMeta } from "@/lib/dashboard/routes";

interface DashboardShellProps {
  children?: ReactNode;
  userName?: string | null;
  userEmail?: string | null;
  emailVerified?: boolean;
}

function DashboardShellContent({
  children,
  userName,
  userEmail,
  emailVerified,
}: Readonly<DashboardShellProps>) {
  const pathname = usePathname();
  const { activeOrganization } = useOrganization();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Real data queries for counts and status badges
  const dentistsQuery = trpc.dentist.list.useQuery();
  const servicesQuery = trpc.service.list.useQuery();
  const hoursQuery = trpc.workingHours.get.useQuery();
  const holidaysQuery = trpc.holiday.list.useQuery();
  const knowledgeQuery = trpc.knowledge.list.useQuery();
  const appointmentsQuery = trpc.appointment.list.useQuery();
  const calendarStatusQuery = trpc.googleCalendar.getStatus.useQuery();

  const dentistsCount = dentistsQuery.data?.length ?? 0;
  const servicesCount = servicesQuery.data?.length ?? 0;
  const appointmentsCount = appointmentsQuery.data?.length ?? 0;
  const holidaysCount = holidaysQuery.data?.length ?? 0;
  const docsCount = knowledgeQuery.data?.length ?? 0;
  const isCalendarConnected = Boolean(
    calendarStatusQuery.data?.status === "CONNECTED" &&
    calendarStatusQuery.data?.calendarId,
  );
  const hoursConfigured = (hoursQuery.data?.length ?? 0) > 0;
  const profileConfigured = Boolean(
    activeOrganization?.name && activeOrganization?.timezone,
  );

  const completedCount =
    (profileConfigured ? 1 : 0) +
    (dentistsCount > 0 ? 1 : 0) +
    (servicesCount > 0 ? 1 : 0) +
    (hoursConfigured ? 1 : 0) +
    (holidaysCount > 0 ? 1 : 0) +
    (docsCount > 0 ? 1 : 0) +
    (isCalendarConnected ? 1 : 0);
  const completionPercentage = Math.round((completedCount / 7) * 100);

  const currentRouteMeta = getDashboardRouteMeta(pathname);

  return (
    <div className="min-h-screen bg-background text-foreground flex font-sans">
      {/* Desktop Sticky/Fixed Left Sidebar */}
      <div className="hidden lg:block shrink-0 h-screen sticky top-0 z-30">
        <DashboardSidebar
          activeTab={currentRouteMeta.id}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          userName={userName}
          userEmail={userEmail}
          dentistsCount={dentistsCount}
          servicesCount={servicesCount}
          appointmentsCount={appointmentsCount}
          holidaysCount={holidaysCount}
          docsCount={docsCount}
          isCalendarConnected={isCalendarConnected}
          completionPercentage={completionPercentage}
        />
      </div>

      {/* Mobile Drawer Navigation (Sheet) */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer panel */}
          <div className="fixed inset-y-0 left-0 w-[270px] max-w-[85vw] bg-sidebar z-50 shadow-2xl transition-transform animate-in slide-in-from-left duration-200 flex flex-col">
            <DashboardSidebar
              activeTab={currentRouteMeta.id}
              isMobile={true}
              onCloseMobile={() => setMobileMenuOpen(false)}
              userName={userName}
              userEmail={userEmail}
              dentistsCount={dentistsCount}
              servicesCount={servicesCount}
              appointmentsCount={appointmentsCount}
              holidaysCount={holidaysCount}
              docsCount={docsCount}
              isCalendarConnected={isCalendarConnected}
              completionPercentage={completionPercentage}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Compact Top Header */}
        <DashboardHeader
          activeTabTitle={currentRouteMeta.title}
          activeTabGroup={currentRouteMeta.group}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          userName={userName}
          userEmail={userEmail}
          emailVerified={emailVerified}
        />

        {/* Operational Workspace Body */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
      </div>
    </div>
  );
}

export function DashboardShell(props: Readonly<DashboardShellProps>) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="animate-pulse text-xs text-muted-foreground font-mono">
            Loading DentAssist Operations...
          </div>
        </div>
      }
    >
      <DashboardShellContent {...props} />
    </Suspense>
  );
}
