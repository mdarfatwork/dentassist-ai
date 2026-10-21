"use client";

import React, { useId } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { OrganizationSwitcher } from "@/components/organization/organization-switcher";
import { LogoutButton } from "@/components/auth/logout-button";
import {
  LayoutDashboard,
  CalendarCheck,
  Stethoscope,
  Sparkles,
  Clock,
  CalendarOff,
  BookOpen,
  Bot,
  Mic,
  Globe,
  Calendar,
  Building2,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";

export interface NavItemConfig {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  badgeVariant?:
    | "default"
    | "secondary"
    | "success"
    | "warning"
    | "destructive"
    | "outline"
    | "info";
  href: string;
}

export interface NavGroupConfig {
  label: string;
  items: NavItemConfig[];
}

interface DashboardSidebarProps {
  activeTab?: string;
  onSelectTab?: (tabId: string) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  isMobile?: boolean;
  onCloseMobile?: () => void;
  userName?: string | null;
  userEmail?: string | null;
  dentistsCount?: number;
  servicesCount?: number;
  appointmentsCount?: number;
  holidaysCount?: number;
  docsCount?: number;
  isCalendarConnected?: boolean;
  completionPercentage?: number;
}

export function DashboardSidebar({
  activeTab,
  onSelectTab,
  collapsed = false,
  onToggleCollapse,
  isMobile = false,
  onCloseMobile,
  userName,
  userEmail,
  dentistsCount = 0,
  servicesCount = 0,
  appointmentsCount = 0,
  holidaysCount = 0,
  docsCount = 0,
  isCalendarConnected = false,
}: Readonly<DashboardSidebarProps>) {
  const headingId = useId();
  const pathname = usePathname();

  const navGroups: NavGroupConfig[] = [
    {
      label: "Workspace",
      items: [
        {
          id: "overview",
          label: "Practice Overview",
          icon: LayoutDashboard,
          href: "/dashboard",
        },
        {
          id: "appointments",
          label: "Appointments",
          icon: CalendarCheck,
          badge: appointmentsCount > 0 ? appointmentsCount : undefined,
          badgeVariant: "secondary",
          href: "/dashboard/appointments",
        },
        {
          id: "dentists",
          label: "Practitioners",
          icon: Stethoscope,
          badge: dentistsCount > 0 ? dentistsCount : undefined,
          badgeVariant: "outline",
          href: "/dashboard/practitioners",
        },
        {
          id: "services",
          label: "Dental Services",
          icon: Sparkles,
          badge: servicesCount > 0 ? servicesCount : undefined,
          badgeVariant: "outline",
          href: "/dashboard/services",
        },
        {
          id: "hours",
          label: "Working Hours",
          icon: Clock,
          href: "/dashboard/working-hours",
        },
        {
          id: "holidays",
          label: "Closures & Holidays",
          icon: CalendarOff,
          badge: holidaysCount > 0 ? holidaysCount : undefined,
          badgeVariant: "outline",
          href: "/dashboard/holidays",
        },
      ],
    },
    {
      label: "AI & Integrations",
      items: [
        {
          id: "knowledge",
          label: "Knowledge Base",
          icon: BookOpen,
          badge: docsCount > 0 ? docsCount : undefined,
          badgeVariant: "outline",
          href: "/dashboard/knowledge-base",
        },
        {
          id: "receptionist",
          label: "AI Receptionist",
          icon: Bot,
          href: "/dashboard/receptionist",
        },
        {
          id: "voice",
          label: "Voice Receptionist",
          icon: Mic,
          href: "/dashboard/voice-receptionist",
        },
        {
          id: "widget",
          label: "Website Widget",
          icon: Globe,
          href: "/dashboard/widget",
        },
        {
          id: "calendar",
          label: "Google Calendar",
          icon: Calendar,
          badge: isCalendarConnected ? "Synced" : undefined,
          badgeVariant: "success",
          href: "/dashboard/calendar",
        },
      ],
    },
    {
      label: "Settings",
      items: [
        {
          id: "profile",
          label: "Practice Profile",
          icon: Building2,
          href: "/dashboard/settings",
        },
      ],
    },
  ];

  const handleItemClick = (id: string) => {
    onSelectTab?.(id);
    if (isMobile && onCloseMobile) {
      onCloseMobile();
    }
  };

  const userInitial = userName ? userName.charAt(0).toUpperCase() : "U";

  return (
    <aside
      className={`h-full flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-200 select-none relative ${
        collapsed && !isMobile ? "w-[72px]" : "w-[264px]"
      }`}
      aria-labelledby={headingId}
    >
      {/* Sidebar Header: Brand & Collapse Toggle */}
      <div
        className={`h-16 flex items-center border-b border-sidebar-border shrink-0 transition-all ${
          collapsed && !isMobile
            ? "justify-center px-2 relative"
            : "justify-between px-4"
        }`}
      >
        {collapsed && !isMobile ? (
          <div className="flex items-center justify-center w-full relative">
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label="Expand sidebar"
              title="Expand sidebar"
              className="group/brand relative size-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-xs hover:bg-primary/90 transition-all cursor-pointer"
            >
              <Stethoscope className="size-5 transition-transform group-hover:scale-0 group-hover:opacity-0" />
              <ChevronRight className="size-5 transition-transform scale-0 opacity-0 group-hover:scale-100 group-hover:opacity-100 absolute" />
            </button>
            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                aria-label="Expand sidebar"
                title="Expand sidebar"
                className="absolute -right-5 top-1/2 -translate-y-1/2 size-5 rounded-full border border-sidebar-border bg-sidebar shadow-xs flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-all z-20 cursor-pointer"
              >
                <ChevronRight className="size-3" />
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="size-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-xs">
                <Stethoscope className="size-5" />
              </div>

              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm tracking-tight text-foreground truncate">
                    DentAssist
                  </span>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-primary/10 text-primary border border-primary/20">
                    AI
                  </span>
                </div>
                <span className="text-[11px] text-muted-foreground truncate">
                  Clinical Operations
                </span>
              </div>
            </div>

            {/* Desktop Collapse Toggle */}
            {!isMobile && onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                aria-label="Collapse sidebar"
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors cursor-pointer"
              >
                <ChevronLeft className="size-4" />
              </button>
            )}

            {/* Mobile Close Button */}
            {isMobile && onCloseMobile && (
              <button
                type="button"
                onClick={onCloseMobile}
                aria-label="Close navigation"
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors cursor-pointer"
              >
                <X className="size-4" />
              </button>
            )}
          </>
        )}
      </div>

      {/* Practice Switcher Area */}
      {(!collapsed || isMobile) && (
        <div className="p-3 border-b border-sidebar-border shrink-0 bg-sidebar-accent/30">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
            Active Practice
          </div>
          <OrganizationSwitcher />
        </div>
      )}

      {/* Nav Items List */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-5">
        {navGroups.map((group) => (
          <div key={group.label} className="space-y-1">
            {(!collapsed || isMobile) && (
              <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
                {group.label}
              </div>
            )}

            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.href === "/dashboard"
                    ? pathname === "/dashboard" || pathname === "/dashboard/"
                    : pathname === item.href ||
                      pathname.startsWith(`${item.href}/`) ||
                      activeTab === item.id;

                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={() => handleItemClick(item.id)}
                    title={collapsed && !isMobile ? item.label : undefined}
                    aria-current={isActive ? "page" : undefined}
                    className={`w-full flex items-center rounded-lg text-xs transition-colors cursor-pointer group ${
                      collapsed && !isMobile
                        ? "justify-center p-2.5"
                        : "justify-between px-3 py-2"
                    } ${
                      isActive
                        ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                        : "text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground font-medium"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon
                        className={`size-4 shrink-0 transition-transform ${
                          isActive
                            ? "text-primary-foreground"
                            : "text-muted-foreground group-hover:text-foreground"
                        }`}
                      />
                      {(!collapsed || isMobile) && (
                        <span className="truncate">{item.label}</span>
                      )}
                    </div>

                    {(!collapsed || isMobile) && item.badge !== undefined && (
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold shrink-0 ml-1.5 ${
                          isActive
                            ? "bg-primary-foreground/20 text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Sidebar Footer: User & Logout */}
      <div className="p-3 border-t border-sidebar-border bg-sidebar-accent/20 shrink-0">
        {!collapsed || isMobile ? (
          <div className="flex items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="size-8 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0 border border-primary/20">
                {userInitial}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-foreground truncate">
                  {userName || "Staff Member"}
                </span>
                <span className="text-[11px] text-muted-foreground truncate">
                  {userEmail || "Practice Admin"}
                </span>
              </div>
            </div>
            <LogoutButton
              variant="ghost"
              className="h-7 text-xs px-2 shrink-0"
            />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2.5 py-1">
            <div
              title={
                userName
                  ? `${userName} (${userEmail || "Practice Admin"})`
                  : "User Account"
              }
              className="size-8 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0 border border-primary/20 cursor-default"
            >
              {userInitial}
            </div>
            <LogoutButton
              variant="ghost"
              className="size-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              showIcon={true}
              hideText={true}
              title="Sign Out"
            />
          </div>
        )}
      </div>
    </aside>
  );
}
