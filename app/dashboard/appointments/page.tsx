import { AppointmentManager } from "@/components/appointment/appointment-manager";

export const metadata = {
  title: "Appointments Calendar | DentAssist AI",
  description:
    "Patient appointment scheduling, operatory calendar, and clinical chair availability.",
};

export default function AppointmentsPage() {
  return <AppointmentManager />;
}
