import { HolidayManager } from "@/components/clinic/holiday-manager";

export const metadata = {
  title: "Closures & Holidays | DentAssist AI",
  description:
    "Clinic holidays, scheduled closures, and emergency schedule overrides for patient bookings.",
};

export default function HolidaysPage() {
  return <HolidayManager />;
}
