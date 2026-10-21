export interface DashboardRouteMeta {
  id: string;
  href: string;
  title: string;
  group: string;
  aliases: string[];
}

export const DASHBOARD_ROUTES: readonly DashboardRouteMeta[] = [
  {
    id: "overview",
    href: "/dashboard",
    title: "Practice Overview",
    group: "Workspace",
    aliases: ["overview"],
  },
  {
    id: "appointments",
    href: "/dashboard/appointments",
    title: "Appointments Calendar",
    group: "Workspace",
    aliases: ["appointments"],
  },
  {
    id: "practitioners",
    href: "/dashboard/practitioners",
    title: "Practitioners Roster",
    group: "Workspace",
    aliases: ["dentists", "practitioners"],
  },
  {
    id: "services",
    href: "/dashboard/services",
    title: "Dental Services",
    group: "Workspace",
    aliases: ["services"],
  },
  {
    id: "working-hours",
    href: "/dashboard/working-hours",
    title: "Operating Hours",
    group: "Workspace",
    aliases: ["hours", "working-hours"],
  },
  {
    id: "holidays",
    href: "/dashboard/holidays",
    title: "Closures & Holidays",
    group: "Workspace",
    aliases: ["holidays"],
  },
  {
    id: "knowledge-base",
    href: "/dashboard/knowledge-base",
    title: "Knowledge Base",
    group: "AI & Integrations",
    aliases: ["knowledge", "knowledge-base"],
  },
  {
    id: "receptionist",
    href: "/dashboard/receptionist",
    title: "AI Receptionist",
    group: "AI & Integrations",
    aliases: ["receptionist"],
  },
  {
    id: "voice-receptionist",
    href: "/dashboard/voice-receptionist",
    title: "Voice Receptionist",
    group: "AI & Integrations",
    aliases: ["voice", "voice-receptionist"],
  },
  {
    id: "widget",
    href: "/dashboard/widget",
    title: "Website Widget",
    group: "AI & Integrations",
    aliases: ["widget"],
  },
  {
    id: "calendar",
    href: "/dashboard/calendar",
    title: "Google Calendar",
    group: "AI & Integrations",
    aliases: ["calendar"],
  },
  {
    id: "settings",
    href: "/dashboard/settings",
    title: "Practice Profile",
    group: "Settings",
    aliases: ["profile", "settings"],
  },
] as const;

/**
 * Maps legacy tab values (e.g., "calendar", "dentists", "hours", "knowledge", "voice", "profile")
 * to their dedicated route paths. Returns null if unknown.
 */
export function resolveLegacyTab(tab: string): string | null {
  const normalized = tab.trim().toLowerCase();
  for (const route of DASHBOARD_ROUTES) {
    if (route.id === normalized || route.aliases.includes(normalized)) {
      return route.href;
    }
  }
  return null;
}

/**
 * Resolves the metadata for the active route based on the current pathname.
 */
export function getDashboardRouteMeta(pathname: string): DashboardRouteMeta {
  const normalized = pathname.replace(/\/+$/, "") || "/dashboard";

  // Check non-overview routes first (more specific matches)
  for (const route of DASHBOARD_ROUTES) {
    if (route.href === "/dashboard") continue;
    if (normalized === route.href || normalized.startsWith(`${route.href}/`)) {
      return route;
    }
  }

  // Check aliases in pathname (e.g. /dashboard/dentists -> practitioners)
  for (const route of DASHBOARD_ROUTES) {
    for (const alias of route.aliases) {
      const aliasPath = `/dashboard/${alias}`;
      if (normalized === aliasPath || normalized.startsWith(`${aliasPath}/`)) {
        return route;
      }
    }
  }

  // Fallback to overview
  return DASHBOARD_ROUTES[0];
}
