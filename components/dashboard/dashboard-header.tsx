"use client";

import { useOrganization } from "@/components/organization/organization-provider";
import { LogoutButton } from "@/components/auth/logout-button";
import { Menu } from "lucide-react";

interface DashboardHeaderProps {
  activeTabTitle: string;
  activeTabGroup?: string;
  onOpenMobileMenu: () => void;
  onNavigateTab?: (tabId: string) => void;
  userName?: string | null;
  userEmail?: string | null;
  emailVerified?: boolean;
}

export function DashboardHeader({
  activeTabTitle,
  activeTabGroup = "Workspace",
  onOpenMobileMenu,
  userName,
  userEmail,
}: Readonly<DashboardHeaderProps>) {
  const { activeOrganization } = useOrganization();

  return (
    <header className="h-16 border-b border-border bg-card/90 backdrop-blur-md sticky top-0 z-20 px-4 sm:px-6 flex items-center justify-between gap-4">
      {/* Left: Mobile trigger & Breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile menu button */}
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Open navigation menu"
          className="lg:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
        >
          <Menu className="size-5" />
        </button>

        {/* Breadcrumbs */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1.5 text-xs truncate"
        >
          <span className="text-muted-foreground hidden sm:inline truncate">
            {activeOrganization?.name || "Practice"}
          </span>
          <span className="text-muted-foreground/60 hidden sm:inline">/</span>
          <span className="text-muted-foreground hidden md:inline truncate">
            {activeTabGroup}
          </span>
          <span className="text-muted-foreground/60 hidden md:inline">/</span>
          <span className="font-semibold text-foreground truncate">
            {activeTabTitle}
          </span>
        </nav>
      </div>

      {/* Right: Account & Logout */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="hidden sm:flex flex-col text-right pr-1">
          <span className="text-xs font-semibold text-foreground leading-tight truncate max-w-[150px]">
            {userName || "Staff Member"}
          </span>
          <span className="text-[11px] text-muted-foreground leading-tight truncate max-w-[150px]">
            {userEmail || activeOrganization?.name || "Admin"}
          </span>
        </div>

        <LogoutButton variant="outline" className="h-8 text-xs px-2.5" />
      </div>
    </header>
  );
}
