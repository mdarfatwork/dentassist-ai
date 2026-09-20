"use client";

import { trpc } from "@/lib/trpc/client";
import { useOrganization } from "@/components/organization/organization-provider";
import {
  AppointmentTimeline,
  type TimelineAppointmentItem,
} from "@/components/workspace/appointment-timeline";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, RotateCcw, CalendarCheck, ShieldCheck } from "lucide-react";

export function AppointmentManager() {
  const { activeOrganization } = useOrganization();
  const appointmentsQuery = trpc.appointment.list.useQuery();

  const appointments = appointmentsQuery.data || [];

  const timelineItems: TimelineAppointmentItem[] = appointments.map((appt) => {
    const startTime = new Date(appt.startTime);
    const timezone = activeOrganization?.timezone || "UTC";

    let timeString = "";
    try {
      timeString = new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: timezone,
      }).format(startTime);
    } catch {
      timeString = startTime.toISOString().slice(11, 16);
    }

    return {
      id: appt.id,
      patientName: appt.patientName,
      serviceName: appt.service?.name || "Dental Service",
      dentistName: appt.dentist?.name || "Clinic Dentist",
      time: timeString,
      durationMinutes: appt.service?.durationMinutes || 30,
      status: appt.status.toLowerCase() as TimelineAppointmentItem["status"],
    };
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-[4px] border border-border bg-card p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[2px] border border-primary/20 bg-primary/10 text-primary text-[11px] font-semibold tracking-tight">
                <CalendarCheck className="size-3" /> Scheduled Appointments
              </span>
              <Badge variant="secondary" className="text-[10px] font-mono">
                {appointments.length} Total
              </Badge>
            </div>
            <h2 className="text-lg font-bold tracking-tight text-foreground">
              {activeOrganization?.name} Appointment Schedule
            </h2>
            <p className="text-xs text-muted-foreground">
              Real-time patient bookings confirmed through the AI Receptionist
              and clinical front desk.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => appointmentsQuery.refetch()}
            disabled={appointmentsQuery.isFetching}
            className="gap-1.5 text-xs"
          >
            <RotateCcw className="size-3.5" /> Refresh Roster
          </Button>
        </div>
      </div>

      {/* Appointment Timeline List */}
      <div className="rounded-[4px] border border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Calendar className="size-4 text-primary" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Clinical Intake Roster
            </h3>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5 text-emerald-600" />
            <span className="text-[11px] font-mono">Multi-Tenant Isolated</span>
          </div>
        </div>

        <AppointmentTimeline items={timelineItems} />
      </div>
    </div>
  );
}
