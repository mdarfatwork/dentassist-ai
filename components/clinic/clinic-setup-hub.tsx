"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useOrganization } from "@/components/organization/organization-provider";
import { ClinicProfileForm } from "./clinic-profile-form";
import { DentistManager } from "./dentist-manager";
import { ServiceManager } from "./service-manager";
import { WorkingHoursEditor } from "./working-hours-editor";
import { HolidayManager } from "./holiday-manager";
import { ClinicSetupWizard } from "./clinic-setup-wizard";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Stethoscope,
  Sparkles,
  Clock,
  CalendarOff,
  CheckCircle2,
  Compass,
  ShieldCheck,
  Calendar,
  BookOpen,
  Bot,
  Sliders,
} from "lucide-react";

export function ClinicSetupHub() {
  const { activeOrganization } = useOrganization();
  const [isWizardMode, setIsWizardMode] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");

  const dentistsQuery = trpc.dentist.list.useQuery();
  const servicesQuery = trpc.service.list.useQuery();
  const hoursQuery = trpc.workingHours.get.useQuery();
  const holidaysQuery = trpc.holiday.list.useQuery();

  const dentistsCount = dentistsQuery.data?.length ?? 0;
  const servicesCount = servicesQuery.data?.length ?? 0;
  const holidaysCount = holidaysQuery.data?.length ?? 0;
  const hoursConfigured = (hoursQuery.data?.length ?? 0) > 0;
  const profileConfigured = Boolean(
    activeOrganization?.name && activeOrganization?.timezone,
  );

  // Calculate setup score out of 4 core items
  const completedCount =
    (profileConfigured ? 1 : 0) +
    (dentistsCount > 0 ? 1 : 0) +
    (servicesCount > 0 ? 1 : 0) +
    (hoursConfigured ? 1 : 0);
  const completionPercentage = Math.round((completedCount / 4) * 100);

  if (isWizardMode) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsWizardMode(false)}
            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            ← Exit to Tabbed Hub
          </Button>
        </div>
        <ClinicSetupWizard onComplete={() => setIsWizardMode(false)} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Clinic Setup Status Banner */}
      <div className="rounded-xl border border-border bg-card p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                <Sliders className="size-3.5" /> Phase 3: Clinic Setup
              </span>
              <Badge
                variant={completionPercentage === 100 ? "success" : "secondary"}
                className="text-xs"
              >
                {completionPercentage}% Configured
              </Badge>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {activeOrganization?.name} Clinic Hub
            </h2>

            <p className="text-sm text-muted-foreground">
              Configure clinic information, dentists, treatments, and working
              hours for this practice.
            </p>

            {/* Checklist Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${
                  profileConfigured
                    ? "bg-emerald-50 text-emerald-700 border-emerald-500/20 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "bg-muted text-muted-foreground border-border"
                }`}
              >
                <CheckCircle2 className="size-3" /> Profile
              </span>

              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${
                  dentistsCount > 0
                    ? "bg-emerald-50 text-emerald-700 border-emerald-500/20 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "bg-muted text-muted-foreground border-border"
                }`}
              >
                <CheckCircle2 className="size-3" /> {dentistsCount}{" "}
                {dentistsCount === 1 ? "Dentist" : "Dentists"}
              </span>

              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${
                  servicesCount > 0
                    ? "bg-emerald-50 text-emerald-700 border-emerald-500/20 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "bg-muted text-muted-foreground border-border"
                }`}
              >
                <CheckCircle2 className="size-3" /> {servicesCount} Services
              </span>

              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${
                  hoursConfigured
                    ? "bg-emerald-50 text-emerald-700 border-emerald-500/20 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "bg-muted text-muted-foreground border-border"
                }`}
              >
                <CheckCircle2 className="size-3" /> Working Hours
              </span>

              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${
                  holidaysCount > 0
                    ? "bg-emerald-50 text-emerald-700 border-emerald-500/20 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "bg-muted text-muted-foreground border-border"
                }`}
              >
                <CheckCircle2 className="size-3" /> {holidaysCount} Closures
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end gap-2 shrink-0">
            <Button
              onClick={() => setIsWizardMode(true)}
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs font-medium"
            >
              <Compass className="size-3.5 text-primary" /> Launch Onboarding
              Wizard
            </Button>
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <ShieldCheck className="size-3 text-emerald-600" /> Scoped to{" "}
              <code className="font-mono text-[10px] bg-muted px-1 rounded font-semibold text-foreground">
                {activeOrganization?.slug}
              </code>
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation for Clinic Setup */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="profile" className="gap-1.5">
            <Building2 className="size-3.5" /> Clinic Profile
          </TabsTrigger>
          <TabsTrigger value="dentists" className="gap-1.5">
            <Stethoscope className="size-3.5" /> Dentists
            {dentistsCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-muted-foreground/15 text-[10px] font-mono">
                {dentistsCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="services" className="gap-1.5">
            <Sparkles className="size-3.5" /> Services
            {servicesCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-muted-foreground/15 text-[10px] font-mono">
                {servicesCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="hours" className="gap-1.5">
            <Clock className="size-3.5" /> Working Hours
          </TabsTrigger>
          <TabsTrigger value="holidays" className="gap-1.5">
            <CalendarOff className="size-3.5" /> Closures & Holidays
            {holidaysCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-muted-foreground/15 text-[10px] font-mono">
                {holidaysCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="roadmap" className="gap-1.5">
            <Compass className="size-3.5" /> Launchpad
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ClinicProfileForm />
        </TabsContent>

        <TabsContent value="dentists">
          <DentistManager />
        </TabsContent>

        <TabsContent value="services">
          <ServiceManager />
        </TabsContent>

        <TabsContent value="hours">
          <WorkingHoursEditor />
        </TabsContent>

        <TabsContent value="holidays">
          <HolidayManager />
        </TabsContent>

        <TabsContent value="roadmap">
          <Card className="border-border shadow-xs">
            <CardContent className="py-6 space-y-6">
              <div>
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Compass className="size-5 text-primary" /> Product Launchpad
                  & Next Phases
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Now that your clinic configuration is in place, the upcoming
                  modules will leverage this structure.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-border bg-card space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="size-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                      <Calendar className="size-4" />
                    </div>
                    <Badge variant="outline" className="text-[11px]">
                      Phase 4
                    </Badge>
                  </div>
                  <h4 className="font-semibold text-sm text-foreground">
                    Google Calendar Sync
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Direct two-way calendar sync for Dr. staff availability and
                    automated bookings.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-border bg-card space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="size-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                      <BookOpen className="size-4" />
                    </div>
                    <Badge variant="outline" className="text-[11px]">
                      Phase 4
                    </Badge>
                  </div>
                  <h4 className="font-semibold text-sm text-foreground">
                    Knowledge Base (RAG)
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    AI clinic knowledge ingest from PDFs, brochures, FAQ, and
                    treatment guidelines.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-border bg-card space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <Bot className="size-4" />
                    </div>
                    <Badge variant="outline" className="text-[11px]">
                      Phase 5
                    </Badge>
                  </div>
                  <h4 className="font-semibold text-sm text-foreground">
                    AI Receptionist Engine
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Voice call answering, website booking widget, and
                    conversational patient triage.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
