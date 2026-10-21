import { ReceptionistPlayground } from "@/components/receptionist/receptionist-playground";

export const metadata = {
  title: "Voice Receptionist | DentAssist AI",
  description:
    "Real-time voice agent phone simulator, speech latency diagnostics, call handling, and audio benchmarks.",
};

export default function VoiceReceptionistPage() {
  return <ReceptionistPlayground initialMode="voice" />;
}
