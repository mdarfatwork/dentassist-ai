import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { resolveLegacyTab } from "@/lib/dashboard/routes";

export const metadata = {
  title: "Practice Overview | DentAssist AI",
  description:
    "Real-time dental clinic operations, daily schedule, autonomous receptionist activity, and workspace health.",
};

interface DashboardPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function DashboardPage({
  searchParams,
}: Readonly<DashboardPageProps>) {
  const params = await searchParams;

  // 1. Legacy Tab Compatibility Redirect (/dashboard?tab=...)
  const tabParam = typeof params.tab === "string" ? params.tab : undefined;
  if (tabParam) {
    const targetRoute = resolveLegacyTab(tabParam);
    if (targetRoute && targetRoute !== "/dashboard") {
      const remainingParams = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (key === "tab") continue;
        if (Array.isArray(value)) {
          for (const v of value) remainingParams.append(key, v);
        } else if (typeof value === "string") {
          remainingParams.append(key, value);
        }
      }
      const qs = remainingParams.toString();
      const destination = qs ? `${targetRoute}?${qs}` : targetRoute;
      redirect(destination);
    }
  }

  // 2. Google Calendar OAuth Callback Query Params Legacy Fallback
  if (
    params.calendarConnected !== undefined ||
    params.calendarError !== undefined ||
    params.selectCalendar !== undefined
  ) {
    const remainingParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (key === "tab") continue;
      if (Array.isArray(value)) {
        for (const v of value) remainingParams.append(key, v);
      } else if (typeof value === "string") {
        remainingParams.append(key, value);
      }
    }
    const qs = remainingParams.toString();
    const destination = qs
      ? `/dashboard/calendar?${qs}`
      : "/dashboard/calendar";
    redirect(destination);
  }

  // 3. Render Default Operations Landing Page
  const reqHeaders = await headers();
  const sessionData = await auth.api.getSession({
    headers: reqHeaders,
  });

  return <DashboardOverview userName={sessionData?.user?.name} />;
}
