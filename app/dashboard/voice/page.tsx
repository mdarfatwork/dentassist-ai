import { redirect } from "next/navigation";

export default function VoiceRedirectPage() {
  redirect("/dashboard/receptionist");
}
