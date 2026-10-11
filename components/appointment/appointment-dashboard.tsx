"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useOrganization } from "@/components/organization/organization-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  RotateCcw,
  Plus,
  Clock,
  User,
  Sparkles,
  Stethoscope,
  Phone,
  Mail,
  CheckCircle2,
  XCircle,
  CalendarCheck,
  CalendarDays,
  Bot,
  Mic,
  FileText,
  ChevronLeft,
  ChevronRight,
  Check,
  CalendarRange,
  Loader2,
  AlertCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/server/trpc/routers/_app";

type ViewMode = "list" | "calendar";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type DashboardAppointment = RouterOutputs["appointment"]["list"][number];

function getLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function AppointmentDashboard() {
  const { activeOrganization } = useOrganization();
  const timezone = activeOrganization?.timezone || "UTC";

  // State: Filter controls
  const [selectedDate, setSelectedDate] = useState<string>(
    getLocalDateString(new Date()),
  );
  const [dentistFilter, setDentistFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [sourceFilter, setSourceFilter] = useState<string>("ALL");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  // Modals state
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] =
    useState<DashboardAppointment | null>(null);
  const [rescheduleMode, setRescheduleMode] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState<string>(
    getLocalDateString(new Date()),
  );
  const [selectedNewSlot, setSelectedNewSlot] = useState<string>("");

  // Queries
  const appointmentsQuery = trpc.appointment.list.useQuery({
    date: selectedDate === "ALL" ? undefined : selectedDate,
    dentistId: dentistFilter === "ALL" ? undefined : dentistFilter,
    status:
      statusFilter === "ALL"
        ? undefined
        : (statusFilter as
            "CONFIRMED" | "SCHEDULED" | "COMPLETED" | "CANCELLED"),
    source:
      sourceFilter === "ALL"
        ? undefined
        : (sourceFilter as "AI_CHAT" | "AI_VOICE" | "MANUAL"),
    limit: 100,
  });

  const dentistsQuery = trpc.dentist.list.useQuery();
  const servicesQuery = trpc.service.list.useQuery();

  // Mutations
  const cancelMutation = trpc.appointment.cancel.useMutation({
    onSuccess: () => {
      setDetailModalOpen(false);
      appointmentsQuery.refetch();
    },
  });

  const completeMutation = trpc.appointment.markCompleted.useMutation({
    onSuccess: () => {
      setDetailModalOpen(false);
      appointmentsQuery.refetch();
    },
  });

  const rescheduleMutation = trpc.appointment.reschedule.useMutation({
    onSuccess: () => {
      setRescheduleMode(false);
      setDetailModalOpen(false);
      appointmentsQuery.refetch();
    },
  });

  // Manual Booking Form State
  const [manualServiceId, setManualServiceId] = useState("");
  const [manualDentistId, setManualDentistId] = useState("");
  const [manualDate, setManualDate] = useState(getLocalDateString(new Date()));
  const [manualSelectedSlot, setManualSelectedSlot] = useState("");
  const [manualPatientName, setManualPatientName] = useState("");
  const [manualPatientEmail, setManualPatientEmail] = useState("");
  const [manualPatientPhone, setManualPatientPhone] = useState("");
  const [manualNotes, setManualNotes] = useState("");

  const availabilityQuery = trpc.availability.check.useQuery(
    {
      serviceId: manualServiceId,
      dentistId: manualDentistId || undefined,
      date: manualDate,
    },
    {
      enabled:
        manualModalOpen && Boolean(manualServiceId) && Boolean(manualDate),
    },
  );

  const rescheduleAvailabilityQuery = trpc.availability.check.useQuery(
    {
      serviceId: selectedAppointment?.serviceId || "",
      dentistId: selectedAppointment?.dentistId || undefined,
      date: rescheduleDate,
    },
    {
      enabled:
        rescheduleMode &&
        Boolean(selectedAppointment?.serviceId) &&
        Boolean(rescheduleDate),
    },
  );

  const createManualMutation = trpc.appointment.createManual.useMutation({
    onSuccess: () => {
      setManualModalOpen(false);
      setManualPatientName("");
      setManualPatientEmail("");
      setManualPatientPhone("");
      setManualNotes("");
      setManualSelectedSlot("");
      appointmentsQuery.refetch();
    },
  });

  const appointments = appointmentsQuery.data || [];

  const formatTime = (isoString: string | Date) => {
    try {
      const d = typeof isoString === "string" ? new Date(isoString) : isoString;
      return new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: timezone,
      }).format(d);
    } catch {
      return String(isoString);
    }
  };

  const formatDate = (isoString: string | Date) => {
    try {
      const d = typeof isoString === "string" ? new Date(isoString) : isoString;
      return new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: timezone,
      }).format(d);
    } catch {
      return String(isoString);
    }
  };

  const getSourceIcon = (source?: string | null) => {
    switch (source) {
      case "AI_CHAT":
        return <Bot className="size-3 text-primary" />;
      case "AI_VOICE":
        return <Mic className="size-3 text-indigo-500" />;
      case "MANUAL":
        return <User className="size-3 text-amber-500" />;
      default:
        return <Bot className="size-3 text-primary" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CONFIRMED":
      case "SCHEDULED":
        return (
          <Badge variant="success" className="text-[10px] gap-1 px-1.5 py-0.2">
            <CheckCircle2 className="size-3" /> Scheduled
          </Badge>
        );
      case "COMPLETED":
        return (
          <Badge
            variant="secondary"
            className="text-[10px] gap-1 px-1.5 py-0.2"
          >
            <Check className="size-3 text-emerald-600" /> Completed
          </Badge>
        );
      case "CANCELLED":
        return (
          <Badge
            variant="destructive"
            className="text-[10px] gap-1 px-1.5 py-0.2"
          >
            <XCircle className="size-3" /> Cancelled
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Date navigation handlers
  const handleShiftDay = (days: number) => {
    const current =
      selectedDate === "ALL"
        ? new Date()
        : new Date(`${selectedDate}T12:00:00Z`);
    current.setDate(current.getDate() + days);
    setSelectedDate(getLocalDateString(current));
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="rounded-[4px] border border-border bg-card p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[2px] border border-primary/20 bg-primary/10 text-primary text-[11px] font-semibold tracking-tight">
                <CalendarCheck className="size-3" /> Clinical Schedule
              </span>
              <Badge variant="secondary" className="text-[10px] font-mono">
                {appointments.length} Total
              </Badge>
            </div>
            <h2 className="text-lg font-bold tracking-tight text-foreground">
              {activeOrganization?.name} Appointments Dashboard
            </h2>
            <p className="text-xs text-muted-foreground">
              Manage patient bookings across AI Receptionist channels and front
              desk intake with Google Calendar synchronization.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              onClick={() => {
                setManualServiceId(servicesQuery.data?.[0]?.id || "");
                setManualModalOpen(true);
              }}
              className="gap-1.5 text-xs font-semibold"
            >
              <Plus className="size-3.5" /> Book Appointment
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => appointmentsQuery.refetch()}
              disabled={appointmentsQuery.isFetching}
              className="gap-1.5 text-xs"
            >
              <RotateCcw className="size-3.5" /> Refresh
            </Button>
          </div>
        </div>

        {/* Filters and View Bar */}
        <div className="mt-5 pt-4 border-t border-border flex flex-wrap items-center justify-between gap-4">
          {/* Left: Quick Date Navigation */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-[3px] border border-border bg-muted/40 p-0.5">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => handleShiftDay(-1)}
              >
                <ChevronLeft className="size-3.5" />
              </Button>

              <Button
                variant={
                  selectedDate === getLocalDateString(new Date())
                    ? "default"
                    : "ghost"
                }
                size="sm"
                className="h-7 px-3 text-xs font-semibold"
                onClick={() => setSelectedDate(getLocalDateString(new Date()))}
              >
                Today
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => handleShiftDay(1)}
              >
                <ChevronRight className="size-3.5" />
              </Button>
            </div>

            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={selectedDate === "ALL" ? "" : selectedDate}
                onChange={(e) =>
                  setSelectedDate(
                    e.target.value || getLocalDateString(new Date()),
                  )
                }
                className="h-8 text-xs px-2.5 rounded-[3px] border border-border bg-background text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <Button
                variant={selectedDate === "ALL" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 text-xs"
                onClick={() =>
                  setSelectedDate(
                    selectedDate === "ALL"
                      ? getLocalDateString(new Date())
                      : "ALL",
                  )
                }
              >
                {selectedDate === "ALL" ? "All Dates Active" : "View All"}
              </Button>
            </div>
          </div>

          {/* Center / Right: Filter dropdowns & View Mode Toggle */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Dentist Filter */}
            <select
              value={dentistFilter}
              onChange={(e) => setDentistFilter(e.target.value)}
              className="h-8 text-xs px-2 rounded-[3px] border border-border bg-background text-foreground focus:outline-none"
            >
              <option value="ALL">All Practitioners</option>
              {(dentistsQuery.data || []).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8 text-xs px-2 rounded-[3px] border border-border bg-background text-foreground focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="CONFIRMED">Scheduled</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            {/* Source Filter */}
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="h-8 text-xs px-2 rounded-[3px] border border-border bg-background text-foreground focus:outline-none"
            >
              <option value="ALL">All Channels</option>
              <option value="AI_CHAT">AI Chat</option>
              <option value="AI_VOICE">AI Voice</option>
              <option value="MANUAL">Manual / Front Desk</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex items-center rounded-[3px] border border-border bg-muted/40 p-0.5 ml-1">
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                className="h-7 px-2.5 text-xs gap-1"
                onClick={() => setViewMode("list")}
              >
                <FileText className="size-3" /> List
              </Button>
              <Button
                variant={viewMode === "calendar" ? "default" : "ghost"}
                size="sm"
                className="h-7 px-2.5 text-xs gap-1"
                onClick={() => setViewMode("calendar")}
              >
                <CalendarRange className="size-3" /> Calendar
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main View Display */}
      {appointmentsQuery.isLoading ? (
        <div className="rounded-[4px] border border-border bg-card p-12 flex flex-col items-center justify-center text-center space-y-3">
          <Loader2 className="size-6 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground">
            Loading appointments for {activeOrganization?.name}...
          </p>
        </div>
      ) : appointments.length === 0 ? (
        <div className="rounded-[4px] border border-dashed border-border bg-card p-12 flex flex-col items-center justify-center text-center space-y-3">
          <div className="size-12 rounded-[4px] bg-muted flex items-center justify-center text-muted-foreground">
            <CalendarCheck className="size-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-foreground">
              No Appointments Found
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm">
              {selectedDate === "ALL"
                ? "No appointments match your active filter criteria."
                : `No appointments scheduled for ${selectedDate}. You can book a patient directly or let the AI Receptionist book slots.`}
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setManualServiceId(servicesQuery.data?.[0]?.id || "");
              setManualModalOpen(true);
            }}
            className="text-xs gap-1.5"
          >
            <Plus className="size-3.5" /> Book An Appointment
          </Button>
        </div>
      ) : viewMode === "list" ? (
        /* List / Table View */
        <div className="rounded-[4px] border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Time & Date</th>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Procedure</th>
                  <th className="py-3 px-4">Practitioner</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Channel</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {appointments.map((appt) => (
                  <tr
                    key={appt.id}
                    onClick={() => {
                      setSelectedAppointment(appt);
                      setDetailModalOpen(true);
                      setRescheduleMode(false);
                    }}
                    className="hover:bg-muted/40 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="font-semibold text-foreground flex items-center gap-1.5">
                        <Clock className="size-3 text-primary shrink-0" />
                        {formatTime(appt.startTime)}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        {formatDate(appt.startTime)}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-foreground">
                        {appt.patientName}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {appt.patientPhone}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-medium text-foreground">
                        {appt.service?.name}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {appt.service?.durationMinutes} mins
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1 text-foreground font-medium">
                        <Stethoscope className="size-3 text-muted-foreground shrink-0" />
                        {appt.dentist?.name || "Clinic Staff"}
                      </div>
                    </td>

                    <td className="py-3 px-4">{getStatusBadge(appt.status)}</td>

                    <td className="py-3 px-4">
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[2px] bg-muted text-[10px] font-mono border border-border">
                        {getSourceIcon(appt.source)}
                        <span>
                          {appt.source === "AI_CHAT"
                            ? "AI Chat"
                            : appt.source === "AI_VOICE"
                              ? "AI Voice"
                              : "Manual"}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-primary hover:text-primary font-medium"
                      >
                        Details →
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Calendar Schedule View */
        <div className="rounded-[4px] border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground flex items-center gap-2">
              <CalendarDays className="size-4 text-primary" /> Daily Schedule
              Timeline
            </h3>
            <span className="text-[11px] font-mono text-muted-foreground">
              {formatDate(
                selectedDate === "ALL"
                  ? new Date()
                  : new Date(`${selectedDate}T12:00:00Z`),
              )}
            </span>
          </div>

          <div className="space-y-2.5">
            {appointments.map((appt) => (
              <div
                key={appt.id}
                onClick={() => {
                  setSelectedAppointment(appt);
                  setDetailModalOpen(true);
                  setRescheduleMode(false);
                }}
                className="p-3 rounded-[3px] border border-border bg-background hover:border-primary/50 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <div className="w-20 text-center py-1.5 px-2 rounded-[2px] bg-muted/60 border border-border shrink-0">
                    <span className="text-xs font-bold text-foreground block">
                      {formatTime(appt.startTime)}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {appt.service?.durationMinutes} min
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-foreground">
                        {appt.patientName}
                      </span>
                      {getStatusBadge(appt.status)}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Sparkles className="size-3 text-primary" />
                        {appt.service?.name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Stethoscope className="size-3 text-muted-foreground" />
                        {appt.dentist?.name || "Clinic Staff"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[2px] bg-muted text-[10px] font-mono border border-border">
                    {getSourceIcon(appt.source)}
                    <span>{appt.reference}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Appointment Detail / Reschedule / Cancel Modal */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <CalendarCheck className="size-4 text-primary" />
              Appointment {selectedAppointment?.reference}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Patient booking verified and isolated to{" "}
              {activeOrganization?.name}.
            </DialogDescription>
          </DialogHeader>

          {selectedAppointment && (
            <div className="py-3 space-y-4 text-xs">
              {/* Status and Channel Banner */}
              <div className="flex items-center justify-between p-3 rounded-[3px] bg-muted/40 border border-border">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Status:</span>
                  {getStatusBadge(selectedAppointment.status)}
                </div>
                <div className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                  <span>Channel:</span>
                  <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[2px] bg-background border border-border">
                    {getSourceIcon(selectedAppointment.source)}
                    <span>{selectedAppointment.source}</span>
                  </div>
                </div>
              </div>

              {/* Patient Details */}
              <div className="space-y-1.5 border-b border-border pb-3">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  Patient Information
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <User className="size-3.5 text-muted-foreground" />
                    <span className="font-semibold text-foreground">
                      {selectedAppointment.patientName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="size-3.5 text-muted-foreground" />
                    <span>{selectedAppointment.patientPhone}</span>
                  </div>
                  <div className="flex items-center gap-2 sm:col-span-2">
                    <Mail className="size-3.5 text-muted-foreground" />
                    <span className="font-mono">
                      {selectedAppointment.patientEmail}
                    </span>
                  </div>
                </div>
              </div>

              {/* Procedure & Schedule */}
              <div className="space-y-1.5 border-b border-border pb-3">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  Clinical Session
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[10px]">
                      Procedure
                    </span>
                    <span className="font-medium text-foreground">
                      {selectedAppointment.service?.name} (
                      {selectedAppointment.service?.durationMinutes} mins)
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">
                      Practitioner
                    </span>
                    <span className="font-medium text-foreground">
                      {selectedAppointment.dentist?.name || "Clinic Staff"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">
                      Date
                    </span>
                    <span className="font-medium text-foreground">
                      {formatDate(selectedAppointment.startTime)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">
                      Time Slot
                    </span>
                    <span className="font-medium text-foreground font-mono">
                      {formatTime(selectedAppointment.startTime)} -{" "}
                      {formatTime(selectedAppointment.endTime)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Google Calendar Linkage */}
              <div className="p-2.5 rounded-[3px] border border-border bg-muted/20 flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <CalendarDays className="size-3.5 text-primary" /> Google
                  Calendar Event:
                </span>
                <span className="font-mono text-foreground font-semibold">
                  {selectedAppointment.googleCalendarEventId
                    ? "Synchronized"
                    : "Local Database"}
                </span>
              </div>

              {/* Notes */}
              {selectedAppointment.notes && (
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                    Notes
                  </span>
                  <div className="p-2.5 rounded-[3px] bg-muted/40 border border-border text-foreground text-xs whitespace-pre-wrap">
                    {selectedAppointment.notes}
                  </div>
                </div>
              )}

              {/* Reschedule Mode Sub-Form */}
              {rescheduleMode && (
                <div className="p-3 rounded-[3px] border border-primary/30 bg-primary/5 space-y-3">
                  <h4 className="font-bold text-foreground text-xs flex items-center gap-1.5">
                    <RotateCcw className="size-3 text-primary" /> Select New
                    Available Slot
                  </h4>

                  <div className="space-y-1.5">
                    <Label className="text-[11px]">
                      Target Reschedule Date
                    </Label>
                    <input
                      type="date"
                      value={rescheduleDate}
                      onChange={(e) => setRescheduleDate(e.target.value)}
                      className="w-full h-8 text-xs px-2.5 rounded-[3px] border border-border bg-background text-foreground font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[11px]">Available Slots</Label>
                    {rescheduleAvailabilityQuery.isLoading ? (
                      <div className="text-xs text-muted-foreground flex items-center gap-1.5 py-2">
                        <Loader2 className="size-3 animate-spin text-primary" />{" "}
                        Calculating open slots...
                      </div>
                    ) : (rescheduleAvailabilityQuery.data?.availableSlots || [])
                        .length === 0 ? (
                      <div className="text-xs text-destructive p-2 rounded-[2px] bg-destructive/10 border border-destructive/20">
                        No slots available on this date for this procedure.
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-1.5 max-h-36 overflow-y-auto pr-1">
                        {(
                          rescheduleAvailabilityQuery.data?.availableSlots || []
                        ).map((slot) => {
                          const isSelected = selectedNewSlot === slot.startTime;
                          return (
                            <button
                              type="button"
                              key={slot.startTime}
                              onClick={() => setSelectedNewSlot(slot.startTime)}
                              className={`py-1.5 px-2 text-[11px] font-mono rounded-[2px] border text-center transition-colors ${
                                isSelected
                                  ? "bg-primary text-primary-foreground border-primary font-bold"
                                  : "bg-background border-border hover:bg-muted text-foreground"
                              }`}
                            >
                              {slot.timeString}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setRescheduleMode(false)}
                      className="text-xs h-7"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      disabled={
                        !selectedNewSlot || rescheduleMutation.isPending
                      }
                      onClick={async () => {
                        await rescheduleMutation.mutateAsync({
                          reference: selectedAppointment.reference,
                          newStartTime: selectedNewSlot,
                        });
                      }}
                      className="text-xs h-7 gap-1"
                    >
                      {rescheduleMutation.isPending ? (
                        <>
                          <Loader2 className="size-3 animate-spin" />{" "}
                          Updating...
                        </>
                      ) : (
                        "Confirm Reschedule"
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 justify-between">
            {!rescheduleMode && selectedAppointment?.status !== "CANCELLED" && (
              <Button
                variant="destructive"
                size="sm"
                onClick={async () => {
                  if (!selectedAppointment) return;
                  if (
                    confirm(
                      `Cancel appointment ${selectedAppointment.reference}?`,
                    )
                  ) {
                    await cancelMutation.mutateAsync({
                      reference: selectedAppointment.reference,
                      reason: "Cancelled by clinic staff from dashboard",
                    });
                  }
                }}
                disabled={cancelMutation.isPending}
                className="text-xs"
              >
                Cancel Appointment
              </Button>
            )}

            <div className="flex items-center gap-2">
              {!rescheduleMode &&
                selectedAppointment?.status !== "COMPLETED" &&
                selectedAppointment?.status !== "CANCELLED" && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setRescheduleDate(getLocalDateString(new Date()));
                        setRescheduleMode(true);
                      }}
                      className="text-xs"
                    >
                      Reschedule
                    </Button>
                    <Button
                      size="sm"
                      onClick={async () => {
                        if (!selectedAppointment) return;
                        await completeMutation.mutateAsync({
                          reference: selectedAppointment.reference,
                        });
                      }}
                      disabled={completeMutation.isPending}
                      className="text-xs gap-1"
                    >
                      <Check className="size-3.5" /> Mark Completed
                    </Button>
                  </>
                )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDetailModalOpen(false)}
                className="text-xs"
              >
                Close
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual Appointment Booking Modal */}
      <Dialog open={manualModalOpen} onOpenChange={setManualModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Plus className="size-4 text-primary" /> Book Clinical Appointment
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Manually reserve an appointment slot for intake or in-person
              walk-ins.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (
                !manualServiceId ||
                !manualSelectedSlot ||
                !manualPatientName ||
                !manualPatientEmail ||
                !manualPatientPhone
              ) {
                alert(
                  "Please complete all required fields and select an available time slot.",
                );
                return;
              }

              await createManualMutation.mutateAsync({
                serviceId: manualServiceId,
                dentistId: manualDentistId || undefined,
                startTime: manualSelectedSlot,
                patientName: manualPatientName,
                patientEmail: manualPatientEmail,
                patientPhone: manualPatientPhone,
                notes: manualNotes || undefined,
              });
            }}
            className="space-y-4 py-2 text-xs"
          >
            {/* Step 1: Service & Dentist */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px]">Dental Procedure *</Label>
                <select
                  value={manualServiceId}
                  onChange={(e) => {
                    setManualServiceId(e.target.value);
                    setManualSelectedSlot("");
                  }}
                  required
                  className="w-full h-8 text-xs px-2 rounded-[3px] border border-border bg-background text-foreground focus:outline-none"
                >
                  <option value="">Select Service</option>
                  {(servicesQuery.data || []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.durationMinutes}m)
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px]">Practitioner (Optional)</Label>
                <select
                  value={manualDentistId}
                  onChange={(e) => {
                    setManualDentistId(e.target.value);
                    setManualSelectedSlot("");
                  }}
                  className="w-full h-8 text-xs px-2 rounded-[3px] border border-border bg-background text-foreground focus:outline-none"
                >
                  <option value="">Any Available Dentist</option>
                  {(dentistsQuery.data || []).map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Step 2: Date & Available Slots */}
            <div className="space-y-2 border-t border-border pt-3">
              <div className="space-y-1">
                <Label className="text-[11px]">Appointment Date *</Label>
                <input
                  type="date"
                  value={manualDate}
                  onChange={(e) => {
                    setManualDate(e.target.value);
                    setManualSelectedSlot("");
                  }}
                  required
                  className="w-full h-8 text-xs px-2.5 rounded-[3px] border border-border bg-background text-foreground font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px]">
                  Verified Available Slots *
                </Label>
                {!manualServiceId ? (
                  <p className="text-[11px] text-muted-foreground italic">
                    Select a dental procedure first to calculate durations and
                    slots.
                  </p>
                ) : availabilityQuery.isLoading ? (
                  <div className="flex items-center gap-1.5 py-3 text-xs text-muted-foreground">
                    <Loader2 className="size-3.5 animate-spin text-primary" />{" "}
                    Calculating available slots...
                  </div>
                ) : (availabilityQuery.data?.availableSlots || []).length ===
                  0 ? (
                  <div className="p-2.5 rounded-[3px] bg-muted/60 border border-border text-xs text-muted-foreground text-center">
                    {availabilityQuery.data?.message ||
                      "No open slots found on this date."}
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-1.5 max-h-36 overflow-y-auto pr-1">
                    {(availabilityQuery.data?.availableSlots || []).map(
                      (slot) => {
                        const isSelected =
                          manualSelectedSlot === slot.startTime;
                        return (
                          <button
                            type="button"
                            key={slot.startTime}
                            onClick={() =>
                              setManualSelectedSlot(slot.startTime)
                            }
                            className={`py-1.5 px-2 text-[11px] font-mono rounded-[2px] border text-center transition-colors ${
                              isSelected
                                ? "bg-primary text-primary-foreground border-primary font-bold"
                                : "bg-background border-border hover:bg-muted text-foreground"
                            }`}
                          >
                            {slot.timeString}
                          </button>
                        );
                      },
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Step 3: Patient Information */}
            <div className="space-y-2 border-t border-border pt-3">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Patient Credentials
              </span>

              <div className="space-y-1">
                <Label className="text-[11px]">Full Name *</Label>
                <Input
                  value={manualPatientName}
                  onChange={(e) => setManualPatientName(e.target.value)}
                  placeholder="e.g. Eleanor Vance"
                  required
                  className="h-8 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[11px]">Email Address *</Label>
                  <Input
                    type="email"
                    value={manualPatientEmail}
                    onChange={(e) => setManualPatientEmail(e.target.value)}
                    placeholder="eleanor@example.com"
                    required
                    className="h-8 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px]">Phone Number *</Label>
                  <Input
                    value={manualPatientPhone}
                    onChange={(e) => setManualPatientPhone(e.target.value)}
                    placeholder="+1 (555) 234-5678"
                    required
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px]">Clinical Notes (Optional)</Label>
                <Input
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  placeholder="e.g. Sensitive lower molars, walk-in request"
                  className="h-8 text-xs"
                />
              </div>
            </div>

            {createManualMutation.isError && (
              <div className="p-2.5 rounded-[3px] bg-destructive/10 text-destructive border border-destructive/20 text-xs flex items-center gap-2">
                <AlertCircle className="size-4 shrink-0" />
                <span>{createManualMutation.error.message}</span>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setManualModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={!manualSelectedSlot || createManualMutation.isPending}
                className="text-xs gap-1.5"
              >
                {createManualMutation.isPending ? (
                  <>
                    <Loader2 className="size-3 animate-spin" /> Confirming...
                  </>
                ) : (
                  "Confirm & Book"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
