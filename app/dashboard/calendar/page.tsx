import { GoogleCalendarCard } from "@/components/clinic/google-calendar-card";

export const metadata = {
  title: "Google Calendar Integration | DentAssist AI",
  description:
    "Bi-directional synchronization with Google Calendar for clinical appointments and real-time chair availability.",
};

export default function CalendarPage() {
  return <GoogleCalendarCard />;
}
