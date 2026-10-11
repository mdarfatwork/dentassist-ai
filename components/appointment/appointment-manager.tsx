"use client";

import { GoogleCalendarCard } from "@/components/clinic/google-calendar-card";
import { AppointmentDashboard } from "./appointment-dashboard";

export function AppointmentManager() {
  return (
    <div className="space-y-6">
      {/* Clinic Google Calendar Integration Card */}
      <GoogleCalendarCard />

      {/* Primary Clinical Appointments Console & Roster */}
      <AppointmentDashboard />
    </div>
  );
}
