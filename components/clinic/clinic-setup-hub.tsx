"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useOrganization } from "@/components/organization/organization-provider";
import { ClinicProfileForm } from "./clinic-profile-form";
import { ClinicPhotoGallery } from "./clinic-photo-gallery";
import { DentistManager } from "./dentist-manager";
import { ServiceManager } from "./service-manager";
import { WorkingHoursEditor } from "./working-hours-editor";
import { HolidayManager } from "./holiday-manager";
import { ClinicSetupWizard } from "./clinic-setup-wizard";
import { KnowledgeManager } from "@/components/knowledge/knowledge-manager";
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
  const knowledgeQuery = trpc.knowledge.list.useQuery();

  const dentistsCount = dentistsQuery.data?.length ?? 0;
  const servicesCount = servicesQuery.data?.length ?? 0;
  const holidaysCount = holidaysQuery.data?.length ?? 0;
  const docsCount = knowledgeQuery.data?.length ?? 0;
  const hoursConfigured = (hoursQuery.data?.length ?? 0) > 0;
  const profileConfigured = Boolean(
    activeOrganization?.name && activeOrganization?.timezone,
  );

  // Calculate setup score out of 5 core items
  const completedCount =
    (profileConfigured ? 1 : 0) +
    (dentistsCount > 0 ? 1 : 0) +
    (servicesCount > 0 ? 1 : 0) +
    (hoursConfigured ? 1 : 0) +
    (docsCount > 0 ? 1 : 0);
  const completionPercentage = Math.round((completedCount / 5) * 100);

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
            ← Exit Guided Setup to Operations Hub
          </Button>
        </div>
        <ClinicSetupWizard onComplete={() => setIsWizardMode(false)} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Clinic Setup Status Header - Structured Clinical Console */}
      <div className="rounded-[4px] border border-border bg-card p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[2px] border border-primary/20 bg-primary/10 text-primary text-[11px] font-semibold tracking-tight">
                <Sliders className="size-3" /> Practice Configuration
              </span>
              <Badge
                variant={completionPercentage === 100 ? "success" : "secondary"}
                className="text-[10px] font-mono"
              >
                {completionPercentage}% Configured
              </Badge>
            </div>

            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
              {activeOrganization?.name} Operations Hub
            </h2>

            <p className="text-xs text-muted-foreground leading-normal">
              Manage practice identity, practitioner rosters, appointment
              services, operating hours, and grounded knowledge base for this
              clinic tenant.
            </p>

            {/* Checklist items - Flat and bordered */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[2px] text-[11px] font-medium border ${
                  profileConfigured
                    ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-600/20"
                    : "bg-muted text-muted-foreground border-border"
                }`}
              >
                <CheckCircle2 className="size-3" /> Profile
              </span>

              <span
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[2px] text-[11px] font-medium border ${
                  dentistsCount > 0
                    ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-600/20"
                    : "bg-muted text-muted-foreground border-border"
                }`}
              >
                <CheckCircle2 className="size-3" /> {dentistsCount}{" "}
                {dentistsCount === 1 ? "Dentist" : "Dentists"}
              </span>

              <span
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[2px] text-[11px] font-medium border ${
                  servicesCount > 0
                    ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-600/20"
                    : "bg-muted text-muted-foreground border-border"
                }`}
              >
                <CheckCircle2 className="size-3" /> {servicesCount} Services
              </span>

              <span
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[2px] text-[11px] font-medium border ${
                  hoursConfigured
                    ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-600/20"
                    : "bg-muted text-muted-foreground border-border"
                }`}
              >
                <CheckCircle2 className="size-3" /> Working Hours
              </span>

              <span
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[2px] text-[11px] font-medium border ${
                  holidaysCount > 0
                    ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-600/20"
                    : "bg-muted text-muted-foreground border-border"
                }`}
              >
                <CheckCircle2 className="size-3" /> {holidaysCount} Closures
              </span>

              <span
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[2px] text-[11px] font-medium border ${
                  docsCount > 0
                    ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-600/20"
                    : "bg-muted text-muted-foreground border-border"
                }`}
              >
                <CheckCircle2 className="size-3" /> {docsCount}{" "}
                {docsCount === 1 ? "Doc" : "Docs"}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end gap-2 shrink-0">
            <Button
              onClick={() => setIsWizardMode(true)}
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs font-semibold"
            >
              <Compass className="size-3.5 text-primary" /> Guided Setup Wizard
            </Button>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono">
                <Clock className="size-3 text-primary" /> Timezone:{" "}
                <code className="font-mono text-[11px] bg-muted px-1 rounded-[2px] font-semibold text-foreground border border-border">
                  {activeOrganization?.timezone || "UTC"}
                </code>
              </span>
              <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono">
                <ShieldCheck className="size-3 text-emerald-600" /> Tenant:{" "}
                <code className="font-mono text-[11px] bg-muted px-1 rounded-[2px] font-semibold text-foreground border border-border">
                  {activeOrganization?.slug}
                </code>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Structured Clinical Workspace Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start border-b border-border">
          <TabsTrigger value="profile" className="gap-1.5">
            <Building2 className="size-3.5" /> Clinic Profile
          </TabsTrigger>
          <TabsTrigger value="dentists" className="gap-1.5">
            <Stethoscope className="size-3.5" /> Dentists
            {dentistsCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-[2px] bg-muted text-[10px] font-mono border border-border">
                {dentistsCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="services" className="gap-1.5">
            <Sparkles className="size-3.5" /> Services
            {servicesCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-[2px] bg-muted text-[10px] font-mono border border-border">
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
              <span className="ml-1 px-1.5 py-0.2 rounded-[2px] bg-muted text-[10px] font-mono border border-border">
                {holidaysCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="knowledge" className="gap-1.5">
            <BookOpen className="size-3.5" /> Knowledge Base
            {docsCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-[2px] bg-muted text-[10px] font-mono border border-border">
                {docsCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="roadmap" className="gap-1.5">
            <Compass className="size-3.5" /> Launchpad
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <ClinicProfileForm />
          <ClinicPhotoGallery />
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

        <TabsContent value="knowledge">
          <KnowledgeManager />
        </TabsContent>

        <TabsContent value="roadmap">
          <Card className="border-border shadow-none">
            <CardContent className="p-6 space-y-6">
              <div className="pb-4 border-b border-border">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Compass className="size-4 text-primary" /> Autonomous Clinic
                  Launchpad
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Once your clinic configuration is complete, the following
                  autonomous capabilities activate for patient communications.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 border border-border divide-y md:divide-y-0 md:divide-x divide-border rounded-[4px] bg-card">
                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="size-7 rounded-[3px] bg-primary/10 text-primary flex items-center justify-center">
                      <Calendar className="size-3.5" />
                    </div>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      Phase 4
                    </Badge>
                  </div>
                  <h4 className="font-semibold text-xs text-foreground">
                    Google Calendar Sync
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Direct two-way calendar sync for doctor chair availability
                    and real-time appointment booking.
                  </p>
                </div>

                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="size-7 rounded-[3px] bg-amber-500/10 text-amber-700 dark:text-amber-300 flex items-center justify-center">
                      <BookOpen className="size-3.5" />
                    </div>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      Phase 4
                    </Badge>
                  </div>
                  <h4 className="font-semibold text-xs text-foreground">
                    Knowledge Base (RAG)
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Clinic policy ingest from treatment brochures, insurance
                    FAQs, and clinical protocols.
                  </p>
                </div>

                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="size-7 rounded-[3px] bg-primary/10 text-primary flex items-center justify-center">
                      <Bot className="size-3.5" />
                    </div>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      Phase 5
                    </Badge>
                  </div>
                  <h4 className="font-semibold text-xs text-foreground">
                    AI Receptionist Engine
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Voice call handling, online booking widget, and emergency
                    tooth pain qualification.
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
