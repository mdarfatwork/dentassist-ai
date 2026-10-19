"use client";

import React, { useState } from "react";
import { useOrganization } from "./organization-provider";
import { CreateOrganizationDialog } from "./create-organization-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Building2, Check, ChevronsUpDown, Plus } from "lucide-react";

export function OrganizationSwitcher() {
  const { activeOrganization, organizations, switchOrganization, isLoading } =
    useOrganization();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  const handleSelect = async (orgId: string) => {
    if (orgId === activeOrganization?.id) return;
    setSwitchingId(orgId);
    try {
      await switchOrganization(orgId);
    } finally {
      setSwitchingId(null);
    }
  };

  if (organizations.length === 0 && !isLoading) {
    return (
      <>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 border-dashed border-primary/40 text-primary hover:bg-primary/5 h-7.5 text-xs font-semibold"
          onClick={() => setCreateDialogOpen(true)}
        >
          <Plus className="size-3.5" /> Create Organization
        </Button>
        <CreateOrganizationDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
        />
      </>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2.5 gap-2 border-border bg-background hover:bg-muted/70 text-foreground font-medium transition-all max-w-[220px] sm:max-w-[260px] justify-between shadow-none rounded-lg"
            />
          }
        >
          <div className="flex items-center gap-2 truncate">
            <div className="size-4.5 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Building2 className="size-3" />
            </div>
            <span className="truncate text-xs font-semibold">
              {activeOrganization?.name || "Select Practice"}
            </span>
          </div>
          <ChevronsUpDown className="size-3 text-muted-foreground shrink-0 opacity-70" />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-64 p-1 shadow-md">
          <DropdownMenuLabel className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-2 py-1">
            <span>Your Practices</span>
            <span className="text-[10px] font-mono bg-muted px-1.5 py-0.2 rounded-sm text-muted-foreground border border-border/60">
              {organizations.length}{" "}
              {organizations.length === 1 ? "clinic" : "clinics"}
            </span>
          </DropdownMenuLabel>

          <div className="max-h-60 overflow-y-auto space-y-0.5 py-1">
            {organizations.map((org) => {
              const isActive = org.id === activeOrganization?.id;
              const isPending = switchingId === org.id;

              let statusIcon: React.ReactNode = null;
              if (isPending) {
                statusIcon = <Spinner className="size-3 text-primary" />;
              } else if (isActive) {
                statusIcon = <Check className="size-3.5 text-primary" />;
              }

              return (
                <DropdownMenuItem
                  key={org.id}
                  onClick={() => handleSelect(org.id)}
                  className="flex items-center justify-between py-1.5 px-2 rounded-md cursor-pointer hover:bg-muted/80 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <div
                      className={`size-6 rounded-md flex items-center justify-center shrink-0 ${
                        isActive
                          ? "bg-primary text-primary-foreground font-bold text-xs"
                          : "bg-muted text-muted-foreground text-xs"
                      }`}
                    >
                      {org.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold text-foreground truncate">
                        {org.name}
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground truncate">
                        {org.slug}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge
                      variant="secondary"
                      className="text-[9px] px-1 py-0 h-4 uppercase font-semibold font-mono"
                    >
                      {org.role}
                    </Badge>
                    {statusIcon}
                  </div>
                </DropdownMenuItem>
              );
            })}
          </div>

          <DropdownMenuSeparator className="my-1" />

          <DropdownMenuItem
            onClick={() => setCreateDialogOpen(true)}
            className="flex items-center gap-2 py-1.5 px-2 text-xs text-primary font-medium cursor-pointer hover:bg-primary/10 hover:text-primary rounded-md"
          >
            <div className="size-5 rounded-md border border-dashed border-primary/40 flex items-center justify-center">
              <Plus className="size-3" />
            </div>
            <span>New Clinic Organization</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateOrganizationDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </>
  );
}
