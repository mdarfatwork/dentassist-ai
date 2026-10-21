import { ClinicProfileForm } from "@/components/clinic/clinic-profile-form";
import { ClinicPhotoGallery } from "@/components/clinic/clinic-photo-gallery";

export const metadata = {
  title: "Practice Profile & Settings | DentAssist AI",
  description:
    "Clinic identity, address, contact details, timezone, chair locations, and clinic photo gallery.",
};

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <ClinicProfileForm />
      <ClinicPhotoGallery />
    </div>
  );
}
