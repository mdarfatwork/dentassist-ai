import { ReceptionistPlayground } from "@/components/receptionist/receptionist-playground";

export const metadata = {
  title: "AI Receptionist | DentAssist AI",
  description:
    "Autonomous AI receptionist configuration, live chat simulator, prompt guard inspection, and booking diagnostics.",
};

export default function ReceptionistPage() {
  return <ReceptionistPlayground initialMode="chat" />;
}
