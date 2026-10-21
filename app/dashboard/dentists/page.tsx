import { redirect } from "next/navigation";

export default function DentistsRedirectPage() {
  redirect("/dashboard/practitioners");
}
