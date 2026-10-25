"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { resolveLegacyTab } from "@/lib/dashboard/routes";
import { trpc } from "@/lib/trpc/client";
import { useOrganization } from "@/components/organization/organization-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/workspace/empty-state";
import {
  CalendarCheck,
  CalendarDays,
  Calendar,
  Bot,
  Clock,
  Plus,
  ArrowRight,
  CheckCircle2,
  Stethoscope,
  Globe,
  Building2,
  BookOpen,
  Sliders,
  ChevronRight,
} from "lucide-react";

interface DashboardOverviewProps {
  onNavigateTab?: (tab: string) => void;
  userName?: string | null;
}

function getLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatTime(date: Date | string): string {
  try {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  } catch {
    return String(date);
  }
}

function formatDate(date: Date | string): string {
  try {
    const d = typeof date === "string" ? new Date(date) : date;
    return getLocalDateString(d);
  } catch {
    return String(date);
  }
}

function getGreeting(name?: string | null): string {
  const hour = new Date().getHours();
  let displayName = "";

  if (name?.trim()) {
    const trimmed = name.trim();
    const parts = trimmed.split(/\s+/);
    const titleRegex = /^(dr\.?|doctor|prof\.?|professor|mr\.?|mrs\.?|ms\.?)$/i;

    if (titleRegex.test(parts[0])) {
      // If starts with title and has a name following (e.g. "Dr. Arfat" or "Dr. Mohammad Arfat")
      displayName = parts.length > 1 ? `, ${trimmed}` : "";
    } else {
      // Standard first name (e.g. "Mohammad Arfat" -> "Mohammad")
      displayName = `, ${parts[0]}`;
    }
  }

  if (hour < 12) return `Good morning${displayName}`;
  if (hour < 17) return `Good afternoon${displayName}`;
  return `Good evening${displayName}`;
}

export function DashboardOverview({
  onNavigateTab,
  userName,
}: Readonly<DashboardOverviewProps>) {
  const router = useRouter();
  const { activeOrganization } = useOrganization();
  const timezone = activeOrganization?.timezone || "UTC";

  const handleNavigate = (target: string) => {
    onNavigateTab?.(target);
    const destination =
      resolveLegacyTab(target) ||
      (target.startsWith("/") ? target : `/dashboard/${target}`);
    router.push(destination);
  };

  const [scheduleFilter, setScheduleFilter] = useState<
    "today" | "upcoming" | "all"
  >("today");

  // Queries
  const appointmentsQuery = trpc.appointment.list.useQuery({ limit: 100 });
  const dentistsQuery = trpc.dentist.list.useQuery();
  const servicesQuery = trpc.service.list.useQuery();
  const hoursQuery = trpc.workingHours.get.useQuery();
  const holidaysQuery = trpc.holiday.list.useQuery();
  const knowledgeQuery = trpc.knowledge.list.useQuery();
  const calendarStatusQuery = trpc.googleCalendar.getStatus.useQuery();

  const dentistsCount = dentistsQuery.data?.length ?? 0;
  const servicesCount = servicesQuery.data?.length ?? 0;
  const holidaysCount = holidaysQuery.data?.length ?? 0;
  const docsCount = knowledgeQuery.data?.length ?? 0;
  const hoursConfigured = (hoursQuery.data?.length ?? 0) > 0;
  const profileConfigured = Boolean(
    activeOrganization?.name && activeOrganization?.timezone,
  );
  const isCalendarConnected = Boolean(
    calendarStatusQuery.data?.isConnected ||
    (calendarStatusQuery.data?.status === "CONNECTED" &&
      calendarStatusQuery.data?.calendarId),
  );

  // Setup completion calculations
  const setupItems = useMemo(
    () => [
      {
        id: "profile",
        label: "Practice Profile & Location",
        description: "Clinic identity, contact info, and chair address",
        completed: profileConfigured,
        tab: "profile",
      },
      {
        id: "dentists",
        label: "Practitioner Roster",
        description: `${dentistsCount} practitioner${dentistsCount === 1 ? "" : "s"} assigned`,
        completed: dentistsCount > 0,
        tab: "dentists",
      },
      {
        id: "services",
        label: "Dental Services & Durations",
        description: `${servicesCount} service${servicesCount === 1 ? "" : "s"} available`,
        completed: servicesCount > 0,
        tab: "services",
      },
      {
        id: "hours",
        label: "Operating Hours & Weekly Shifts",
        description: hoursConfigured
          ? "Weekly hours configured"
          : "Hours not yet defined",
        completed: hoursConfigured,
        tab: "hours",
      },
      {
        id: "holidays",
        label: "Closures & Public Holidays",
        description: `${holidaysCount} planned closure${holidaysCount === 1 ? "" : "s"}`,
        completed: holidaysCount > 0,
        tab: "holidays",
      },
      {
        id: "knowledge",
        label: "Knowledge Base Documents",
        description: `${docsCount} clinic document${docsCount === 1 ? "" : "s"} indexed`,
        completed: docsCount > 0,
        tab: "knowledge",
      },
      {
        id: "calendar",
        label: "Google Calendar Two-Way Sync",
        description: isCalendarConnected
          ? `Connected (${calendarStatusQuery.data?.calendarName || "Active Calendar"})`
          : "Not connected to Google Calendar",
        completed: isCalendarConnected,
        tab: "calendar",
      },
    ],
    [
      profileConfigured,
      dentistsCount,
      servicesCount,
      hoursConfigured,
      holidaysCount,
      docsCount,
      isCalendarConnected,
      calendarStatusQuery.data?.calendarName,
    ],
  );

  const completedCount = setupItems.filter((i) => i.completed).length;
  const completionPercentage = Math.round(
    (completedCount / setupItems.length) * 100,
  );

  // Appointment metrics
  const [initialTimestamp] = useState(() => Date.now());
  const todayStr = useMemo(
    () => getLocalDateString(new Date(initialTimestamp)),
    [initialTimestamp],
  );
  const allAppointments = useMemo(
    () => appointmentsQuery.data ?? [],
    [appointmentsQuery.data],
  );

  const todayAppointments = useMemo(() => {
    return allAppointments.filter((a) => {
      const apptDateStr = formatDate(a.startTime);
      return apptDateStr === todayStr;
    });
  }, [allAppointments, todayStr]);

  const upcomingAppointments = useMemo(() => {
    return allAppointments.filter((a) => {
      const t =
        a.startTime instanceof Date
          ? a.startTime.getTime()
          : new Date(a.startTime).getTime();
      return t >= initialTimestamp && a.status !== "CANCELLED";
    });
  }, [allAppointments, initialTimestamp]);

  const displayedAppointments = useMemo(() => {
    if (scheduleFilter === "today") return todayAppointments;
    if (scheduleFilter === "upcoming") return upcomingAppointments;
    return allAppointments;
  }, [
    scheduleFilter,
    todayAppointments,
    upcomingAppointments,
    allAppointments,
  ]);

  const todayScheduledCount = todayAppointments.filter(
    (a) => a.status === "SCHEDULED" || a.status === "CONFIRMED",
  ).length;
  const todayCompletedCount = todayAppointments.filter(
    (a) => a.status === "COMPLETED",
  ).length;

  const aiReady = servicesCount > 0 && hoursConfigured;

  const currentDateDisplay = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date());

  return (
    <div className="space-y-6">
      {/* Page Header / Welcome Banner */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-primary/5 via-primary/2 to-transparent pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border border-primary/20 bg-primary/10 text-primary text-xs font-semibold tracking-tight">
                <Building2 className="size-3.5" /> Practice Operations
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                {currentDateDisplay}
              </span>
              <span className="text-xs text-muted-foreground">
                • Timezone: {timezone}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {getGreeting(userName)}
            </h1>

            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Welcome to the daily operations center for{" "}
              <span className="font-semibold text-foreground">
                {activeOrganization?.name}
              </span>
              . Monitor live patient bookings, review receptionist readiness,
              and manage clinic capacity.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Button
              onClick={() => handleNavigate("appointments")}
              className="gap-2 text-xs font-semibold shadow-xs"
            >
              <Plus className="size-4" /> Book Appointment
            </Button>

            <Button
              variant="outline"
              onClick={() => handleNavigate("receptionist")}
              className="gap-2 text-xs font-semibold bg-background hover:bg-muted/60"
            >
              <Bot className="size-4 text-primary" /> Test AI Receptionist
            </Button>
          </div>
        </div>
      </div>

      {/* Top 4 Operational Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Today's Appointments */}
        <Card className="hover:border-primary/40 transition-colors">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Today&apos;s Appointments
              </span>
              <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <CalendarCheck className="size-4" />
              </div>
            </div>

            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-bold font-mono text-foreground tracking-tight">
                {todayAppointments.length}
              </span>
              <Badge variant="outline" className="text-[11px] font-mono">
                {todayScheduledCount} active
              </Badge>
            </div>

            <div className="text-xs text-muted-foreground flex items-center justify-between pt-1 border-t border-border/60">
              <span>{todayCompletedCount} completed</span>
              <button
                type="button"
                onClick={() => handleNavigate("appointments")}
                className="text-primary hover:underline font-medium inline-flex items-center gap-1 text-[11px]"
              >
                Schedule <ArrowRight className="size-3" />
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Upcoming Bookings */}
        <Card className="hover:border-primary/40 transition-colors">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Upcoming Bookings
              </span>
              <div className="size-8 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                <CalendarDays className="size-4" />
              </div>
            </div>

            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-bold font-mono text-foreground tracking-tight">
                {upcomingAppointments.length}
              </span>
              <Badge variant="secondary" className="text-[11px] font-mono">
                All Future
              </Badge>
            </div>

            <div className="text-xs text-muted-foreground flex items-center justify-between pt-1 border-t border-border/60">
              <span>{allAppointments.length} total recorded</span>
              <button
                type="button"
                onClick={() => handleNavigate("appointments")}
                className="text-primary hover:underline font-medium inline-flex items-center gap-1 text-[11px]"
              >
                View all <ArrowRight className="size-3" />
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Google Calendar Sync */}
        <Card className="hover:border-primary/40 transition-colors">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Google Calendar
              </span>
              <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                <Calendar className="size-4" />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`size-2.5 rounded-full shrink-0 ${
                  isCalendarConnected
                    ? "bg-emerald-600 animate-pulse"
                    : "bg-amber-500"
                }`}
              />
              <span className="text-base font-bold text-foreground">
                {isCalendarConnected ? "Connected & Synced" : "Not Connected"}
              </span>
            </div>

            <div className="text-xs text-muted-foreground truncate pt-1 border-t border-border/60 flex items-center justify-between">
              <span className="truncate max-w-[140px]">
                {isCalendarConnected
                  ? calendarStatusQuery.data?.calendarName || "Synced"
                  : "Sync chair availability"}
              </span>
              <button
                type="button"
                onClick={() => handleNavigate("calendar")}
                className="text-primary hover:underline font-medium inline-flex items-center gap-1 text-[11px] shrink-0"
              >
                {isCalendarConnected ? "Manage" : "Connect"}{" "}
                <ArrowRight className="size-3" />
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: AI Receptionist Readiness */}
        <Card className="hover:border-primary/40 transition-colors">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                AI Receptionist
              </span>
              <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Bot className="size-4" />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`size-2.5 rounded-full shrink-0 ${
                  aiReady ? "bg-emerald-600" : "bg-amber-500"
                }`}
              />
              <span className="text-base font-bold text-foreground">
                {aiReady ? "Operational" : "Configuration Needed"}
              </span>
            </div>

            <div className="text-xs text-muted-foreground flex items-center justify-between pt-1 border-t border-border/60">
              <span>
                {docsCount} docs • {servicesCount} services
              </span>
              <button
                type="button"
                onClick={() => handleNavigate("receptionist")}
                className="text-primary hover:underline font-medium inline-flex items-center gap-1 text-[11px]"
              >
                Inspect <ArrowRight className="size-3" />
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Operations Schedule & Preview (7/12) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/70">
              <div>
                <h2 className="text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
                  <CalendarCheck className="size-5 text-primary" /> Daily
                  Schedule & Bookings
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Review booked patient slots, provider assignments, and intake
                  sources.
                </p>
              </div>

              {/* View filter buttons */}
              <div className="flex items-center rounded-lg border border-border bg-muted/30 p-1 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setScheduleFilter("today")}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    scheduleFilter === "today"
                      ? "bg-card text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Today ({todayAppointments.length})
                </button>
                <button
                  type="button"
                  onClick={() => setScheduleFilter("upcoming")}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    scheduleFilter === "upcoming"
                      ? "bg-card text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Upcoming ({upcomingAppointments.length})
                </button>
                <button
                  type="button"
                  onClick={() => setScheduleFilter("all")}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    scheduleFilter === "all"
                      ? "bg-card text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  All ({allAppointments.length})
                </button>
              </div>
            </div>

            {/* Appointments Table or Empty State */}
            {displayedAppointments.length === 0 ? (
              <EmptyState
                icon={<CalendarCheck className="size-6 text-primary" />}
                title={
                  scheduleFilter === "today"
                    ? "No Appointments Scheduled Today"
                    : scheduleFilter === "upcoming"
                      ? "No Upcoming Appointments"
                      : "No Appointments on Record"
                }
                description="Patients who book via the Autonomous AI Receptionist, Website Widget, or front desk manual entry will appear in this timeline."
                action={
                  <Button
                    size="sm"
                    onClick={() => handleNavigate("appointments")}
                    className="gap-2 text-xs"
                  >
                    <Plus className="size-3.5" /> Book an Appointment
                  </Button>
                }
              />
            ) : (
              <div className="space-y-3">
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/40 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border">
                      <tr>
                        <th className="py-2.5 px-3.5">Time</th>
                        <th className="py-2.5 px-3.5">Patient</th>
                        <th className="py-2.5 px-3.5">Procedure</th>
                        <th className="py-2.5 px-3.5">Doctor</th>
                        <th className="py-2.5 px-3.5">Status</th>
                        <th className="py-2.5 px-3.5">Source</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {displayedAppointments.slice(0, 7).map((appt) => (
                        <tr
                          key={appt.id}
                          onClick={() => handleNavigate("appointments")}
                          className="hover:bg-muted/30 cursor-pointer transition-colors"
                        >
                          <td className="py-3 px-3.5 font-mono text-xs font-semibold text-foreground whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <Clock className="size-3 text-primary shrink-0" />
                              {formatTime(appt.startTime)}
                            </div>
                            <div className="text-[10px] text-muted-foreground font-normal">
                              {formatDate(appt.startTime)}
                            </div>
                          </td>

                          <td className="py-3 px-3.5 font-medium text-foreground whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <div className="size-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                                {appt.patientName.charAt(0).toUpperCase()}
                              </div>
                              <span className="truncate max-w-[120px]">
                                {appt.patientName}
                              </span>
                            </div>
                            {appt.patientPhone && (
                              <div className="text-[10px] text-muted-foreground font-mono pl-6">
                                {appt.patientPhone}
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-3.5 text-foreground whitespace-nowrap">
                            <span className="font-semibold text-xs">
                              {appt.service.name}
                            </span>
                            <div className="text-[10px] text-muted-foreground">
                              {appt.service.durationMinutes} mins
                            </div>
                          </td>

                          <td className="py-3 px-3.5 text-muted-foreground whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              <Stethoscope className="size-3 text-muted-foreground shrink-0" />
                              <span className="truncate max-w-[110px]">
                                {appt.dentist?.name ?? "General Practice"}
                              </span>
                            </div>
                          </td>

                          <td className="py-3 px-3.5 whitespace-nowrap">
                            <Badge
                              variant={
                                appt.status === "COMPLETED"
                                  ? "success"
                                  : appt.status === "CANCELLED"
                                    ? "destructive"
                                    : "info"
                              }
                              className="text-[10px] capitalize font-mono"
                            >
                              {appt.status.toLowerCase()}
                            </Badge>
                          </td>

                          <td className="py-3 px-3.5 text-muted-foreground whitespace-nowrap">
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted border border-border">
                              {appt.source === "AI_VOICE"
                                ? "Voice"
                                : appt.source === "AI_CHAT"
                                  ? "Widget"
                                  : "Front Desk"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-muted-foreground">
                    Showing {Math.min(displayedAppointments.length, 7)} of{" "}
                    {displayedAppointments.length} appointment
                    {displayedAppointments.length === 1 ? "" : "s"}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleNavigate("appointments")}
                    className="gap-1.5 text-xs text-primary hover:text-primary"
                  >
                    Manage Full Clinical Calendar{" "}
                    <ArrowRight className="size-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Quick Integration Diagnostic Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Google Calendar Card Preview */}
            <Card className="hover:border-primary/30 transition-colors">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="size-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Calendar className="size-3.5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-foreground">
                        Google Calendar
                      </h3>
                      <p className="text-[11px] text-muted-foreground">
                        Two-way operatory scheduling
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={isCalendarConnected ? "success" : "warning"}
                    className="text-[10px] font-mono"
                  >
                    {isCalendarConnected ? "Active" : "Required"}
                  </Badge>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  {isCalendarConnected
                    ? `Appointments booked through the receptionist synchronize instantly to Google Calendar.`
                    : "Connect Google Calendar to verify doctor chair conflicts and sync live patient events."}
                </p>

                <div className="pt-2 border-t border-border flex items-center justify-between">
                  <span className="text-[11px] font-mono text-muted-foreground">
                    OAuth 2.0 • Encrypted
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleNavigate("calendar")}
                    className="text-xs h-7"
                  >
                    {isCalendarConnected
                      ? "Calendar Settings"
                      : "Connect Calendar"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* AI Receptionist Diagnostic Card */}
            <Card className="hover:border-primary/30 transition-colors">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="size-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Bot className="size-3.5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-foreground">
                        AI Receptionist Core
                      </h3>
                      <p className="text-[11px] text-muted-foreground">
                        Multi-turn dialogue engine
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={aiReady ? "success" : "warning"}
                    className="text-[10px] font-mono"
                  >
                    {aiReady ? "Ready" : "Incomplete"}
                  </Badge>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  Grounded on {docsCount} clinic knowledge document
                  {docsCount === 1 ? "" : "s"} and {servicesCount} active dental
                  procedure{servicesCount === 1 ? "" : "s"}.
                </p>

                <div className="pt-2 border-t border-border flex items-center justify-between">
                  <span className="text-[11px] font-mono text-muted-foreground">
                    Prompt Guard • Failover
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleNavigate("receptionist")}
                    className="text-xs h-7"
                  >
                    View Receptionist
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Column: Setup Progress, Checklist & Fast Actions (5/12) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Practice Setup & Readiness Checklist */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="size-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">
                  Clinic Configuration
                </h3>
              </div>
              <Badge
                variant={completionPercentage === 100 ? "success" : "secondary"}
                className="text-[10px] font-mono"
              >
                {completionPercentage}% Complete
              </Badge>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300 rounded-full"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>
                  {completedCount} of {setupItems.length} steps configured
                </span>
                {completionPercentage === 100 && (
                  <span className="text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="size-3" /> Fully Operational
                  </span>
                )}
              </div>
            </div>

            {/* Interactive Checklist Items */}
            <div className="divide-y divide-border/60 rounded-lg border border-border bg-background overflow-hidden">
              {setupItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavigate(item.tab)}
                  className="w-full text-left p-3 hover:bg-muted/50 transition-colors flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="mt-0.5 shrink-0">
                      {item.completed ? (
                        <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <div className="size-4 rounded-full border border-muted-foreground/40 bg-muted/20" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div
                        className={`text-xs font-semibold truncate ${
                          item.completed
                            ? "text-foreground"
                            : "text-foreground/80 group-hover:text-primary"
                        }`}
                      >
                        {item.label}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {item.description}
                      </div>
                    </div>
                  </div>

                  <ChevronRight className="size-3.5 text-muted-foreground/60 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>
              ))}
            </div>
          </div>

          {/* Quick Practice Actions */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Quick Operations
            </h3>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleNavigate("receptionist")}
                className="w-full text-left p-3 rounded-lg border border-border bg-muted/20 hover:bg-muted/60 transition-colors flex items-center justify-between group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="size-7 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Bot className="size-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                      Test AI Receptionist
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Simulate chatbot & appointment intake
                    </div>
                  </div>
                </div>
                <ChevronRight className="size-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => handleNavigate("widget")}
                className="w-full text-left p-3 rounded-lg border border-border bg-muted/20 hover:bg-muted/60 transition-colors flex items-center justify-between group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="size-7 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Globe className="size-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                      Website Booking Widget
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Embed snippet on clinic website
                    </div>
                  </div>
                </div>
                <ChevronRight className="size-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => handleNavigate("knowledge")}
                className="w-full text-left p-3 rounded-lg border border-border bg-muted/20 hover:bg-muted/60 transition-colors flex items-center justify-between group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="size-7 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                    <BookOpen className="size-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                      Knowledge Base Ingestion
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Upload clinic FAQs & policies
                    </div>
                  </div>
                </div>
                <ChevronRight className="size-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
