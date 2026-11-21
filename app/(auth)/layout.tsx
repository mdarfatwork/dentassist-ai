import type { ReactNode } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";

export default async function AuthLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  // If the user already has an active session, redirect to the dashboard
  const reqHeaders = await headers();
  const sessionData = await auth.api.getSession({
    headers: reqHeaders,
  });

  if (sessionData?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-background text-foreground selection:bg-primary/10 selection:text-primary">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
