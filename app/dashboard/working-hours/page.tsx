import { WorkingHoursEditor } from "@/components/clinic/working-hours-editor";

export const metadata = {
  title: "Operating Hours | DentAssist AI",
  description:
    "Weekly practice working hours, operatory shifts, breaks, and emergency call windows.",
};

export default function WorkingHoursPage() {
  return <WorkingHoursEditor />;
}
