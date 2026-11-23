import { WhatsAppConnectionCard } from "@/components/whatsapp/whatsapp-connection-card";

export const metadata = {
  title: "WhatsApp Integration | DentAssist AI",
  description:
    "Autonomous 24/7 AI Receptionist linked directly to your clinic phone line via Baileys WhatsApp Web QR pairing.",
};

export default function WhatsAppDashboardPage() {
  return (
    <div className="space-y-6">
      <WhatsAppConnectionCard />
    </div>
  );
}
