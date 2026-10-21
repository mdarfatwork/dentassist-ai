import { DentistManager } from "@/components/clinic/dentist-manager";

export const metadata = {
  title: "Practitioners Roster | DentAssist AI",
  description:
    "Manage dentists, dental hygienists, specialists, and clinical staff profiles and chair assignments.",
};

export default function PractitionersPage() {
  return <DentistManager />;
}
