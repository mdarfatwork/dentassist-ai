import { ServiceManager } from "@/components/clinic/service-manager";

export const metadata = {
  title: "Dental Services | DentAssist AI",
  description:
    "Treatment catalog, service durations, pricing, and category configurations for clinical workflows.",
};

export default function ServicesPage() {
  return <ServiceManager />;
}
