"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { useOrganization } from "@/components/organization/organization-provider";
import { DashboardSidebar } from "./dashboard-sidebar";
import { DashboardHeader } from "./dashboard-header";
import { DashboardOverview } from "./dashboard-overview";

// Clinical Workspace Sub-Managers
import { AppointmentManager } from "@/components/appointment/appointment-manager";
import { DentistManager } from "@/components/clinic/dentist-manager";
import { ServiceManager } from "@/components/clinic/service-manager";
import { WorkingHoursEditor } from "@/components/clinic/working-hours-editor";
import { HolidayManager } from "@/components/clinic/holiday-manager";
import { GoogleCalendarCard } from "@/components/clinic/google-calendar-card";
import { ClinicProfileForm } from "@/components/clinic/clinic-profile-form";
import { ClinicPhotoGallery } from "@/components/clinic/clinic-photo-gallery";
import { KnowledgeManager } from "@/components/knowledge/knowledge-manager";
import { ReceptionistPlayground } from "@/components/receptionist/receptionist-playground";
import { VoiceReceptionist } from "@/components/voice/voice-receptionist";
import { WebsiteWidgetManager } from "@/components/widget/website-widget-manager";

interface DashboardShellProps {
  userName?: string | null;
  userEmail?: string | null;
  emailVerified?: boolean;
  initialTab?: string;
}

const TAB_META: Record<string, { title: string; group: string }> = {
  overview: { title: "Practice Overview", group: "Workspace" },
  appointments: { title: "Appointments Calendar", group: "Workspace" },
  dentists: { title: "Practitioners Roster", group: "Workspace" },
  services: { title: "Dental Services", group: "Workspace" },
  hours: { title: "Operating Hours", group: "Workspace" },
  holidays: { title: "Closures & Holidays", group: "Workspace" },
  knowledge: { title: "Knowledge Base", group: "AI & Integrations" },
  receptionist: { title: "AI Receptionist", group: "AI & Integrations" },
  voice: { title: "Voice Receptionist", group: "AI & Integrations" },
  widget: { title: "Website Widget", group: "AI & Integrations" },
  calendar: { title: "Google Calendar", group: "AI & Integrations" },
  profile: { title: "Practice Profile", group: "Settings" },
};

function DashboardShellContent({
  userName,
  userEmail,
  emailVerified,
  initialTab = "overview",
}: Readonly<DashboardShellProps>) {
  const searchParams = useSearchParams();
  const { activeOrganization } = useOrganization();

  const paramTab = searchParams.get("tab");
  const [internalTab, setInternalTab] = useState<string>(
    paramTab && TAB_META[paramTab] ? paramTab : initialTab,
  );
  const activeTab = paramTab && TAB_META[paramTab] ? paramTab : internalTab;

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Handle tab navigation & URL push
  const handleSelectTab = (tabId: string) => {
    setInternalTab(tabId);
    setMobileMenuOpen(false);
    const newParams = new URLSearchParams(window.location.search);
    if (tabId === "overview") {
      newParams.delete("tab");
    } else {
      newParams.set("tab", tabId);
    }
    const query = newParams.toString();
    const newPath = query ? `/dashboard?${query}` : "/dashboard";
    window.history.pushState(null, "", newPath);
  };

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

  // Real data queries for counts and status
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

  const currentTabMeta = TAB_META[activeTab] || {
    title: "Practice Workspace",
    group: "Dashboard",
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex font-sans">
      {/* Desktop Sticky/Fixed Left Sidebar */}
      <div className="hidden lg:block shrink-0 h-screen sticky top-0 z-30">
        <DashboardSidebar
          activeTab={activeTab}
          onSelectTab={handleSelectTab}
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
              activeTab={activeTab}
              onSelectTab={handleSelectTab}
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
          activeTabTitle={currentTabMeta.title}
          activeTabGroup={currentTabMeta.group}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          userName={userName}
          userEmail={userEmail}
          emailVerified={emailVerified}
        />

        {/* Operational Workspace Body */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {activeTab === "overview" && (
            <DashboardOverview
              onNavigateTab={handleSelectTab}
              userName={userName}
            />
          )}

          {activeTab === "appointments" && <AppointmentManager />}

          {activeTab === "dentists" && <DentistManager />}

          {activeTab === "services" && <ServiceManager />}

          {activeTab === "hours" && <WorkingHoursEditor />}

          {activeTab === "holidays" && <HolidayManager />}

          {activeTab === "knowledge" && <KnowledgeManager />}

          {activeTab === "receptionist" && <ReceptionistPlayground />}

          {activeTab === "voice" && <VoiceReceptionist />}

          {activeTab === "widget" && <WebsiteWidgetManager />}

          {activeTab === "calendar" && <GoogleCalendarCard />}

          {activeTab === "profile" && (
            <div className="space-y-6">
              <ClinicProfileForm />
              <ClinicPhotoGallery />
            </div>
          )}
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
