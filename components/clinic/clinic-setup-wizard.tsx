"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useOrganization } from "@/components/organization/organization-provider";
import { ClinicProfileForm } from "./clinic-profile-form";
import { DentistManager } from "./dentist-manager";
import { ServiceManager } from "./service-manager";
import { WorkingHoursEditor } from "./working-hours-editor";
import { HolidayManager } from "./holiday-manager";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Stethoscope,
  Sparkles,
  Clock,
  CalendarOff,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Calendar,
  BookOpen,
  Bot,
  Zap,
} from "lucide-react";

const STEPS = [
  { id: "profile", label: "Clinic Profile", icon: Building2 },
  { id: "dentists", label: "Dentists", icon: Stethoscope },
  { id: "services", label: "Services", icon: Sparkles },
  { id: "hours", label: "Working Hours", icon: Clock },
  { id: "holidays", label: "Holidays", icon: CalendarOff },
  { id: "complete", label: "Launch Status", icon: Zap },
] as const;

interface ClinicSetupWizardProps {
  onComplete?: () => void;
}

export function ClinicSetupWizard({
  onComplete,
}: Readonly<ClinicSetupWizardProps>) {
  const { activeOrganization } = useOrganization();
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);

  const dentistsQuery = trpc.dentist.list.useQuery();
  const servicesQuery = trpc.service.list.useQuery();
  const holidaysQuery = trpc.holiday.list.useQuery();

  const currentStep = STEPS[currentStepIndex] || STEPS[0];

  const handleNext = () => {
    if (currentStepIndex < STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      onComplete?.();
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const dentistsCount = dentistsQuery.data?.length ?? 0;
  const servicesCount = servicesQuery.data?.length ?? 0;
  const holidaysCount = holidaysQuery.data?.length ?? 0;

  return (
    <div className="space-y-6">
      {/* Wizard Progress Stepper */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-border/60">
          <div>
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">
              Onboarding Walkthrough
            </span>
            <h2 className="text-lg font-bold text-foreground">
              Clinic Configuration for {activeOrganization?.name}
            </h2>
          </div>
          <span className="text-xs font-mono text-muted-foreground bg-muted px-2.5 py-1 rounded-full self-start sm:self-auto">
            Step {currentStepIndex + 1} of {STEPS.length}
          </span>
        </div>

        {/* Stepper pills */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isDone = idx < currentStepIndex;
            const isCurrent = idx === currentStepIndex;

            let stepStatusClass =
              "bg-muted/40 text-muted-foreground hover:bg-muted/70";
            let iconStatusClass = "bg-muted text-muted-foreground";

            if (isCurrent) {
              stepStatusClass =
                "bg-primary text-primary-foreground font-semibold shadow-xs";
              iconStatusClass =
                "bg-primary-foreground/20 text-primary-foreground";
            } else if (isDone) {
              stepStatusClass =
                "bg-primary/10 text-primary hover:bg-primary/15";
              iconStatusClass = "bg-primary text-primary-foreground";
            }

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => setCurrentStepIndex(idx)}
                className={`flex items-center gap-2 p-2 rounded-lg text-left transition-all cursor-pointer ${stepStatusClass}`}
              >
                <div
                  className={`size-6 rounded-md flex items-center justify-center shrink-0 text-xs ${iconStatusClass}`}
                >
                  {isDone ? (
                    <CheckCircle2 className="size-3.5" />
                  ) : (
                    <Icon className="size-3.5" />
                  )}
                </div>
                <span className="text-xs truncate">{step.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="min-h-[400px]">
        {currentStep.id === "profile" && (
          <ClinicProfileForm onSaved={handleNext} />
        )}

        {currentStep.id === "dentists" && <DentistManager />}

        {currentStep.id === "services" && <ServiceManager />}

        {currentStep.id === "hours" && (
          <WorkingHoursEditor onSaved={handleNext} />
        )}

        {currentStep.id === "holidays" && <HolidayManager />}

        {currentStep.id === "complete" && (
          <Card className="border-border shadow-xs">
            <CardHeader className="text-center pb-4">
              <div className="size-14 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-2 shadow-xs">
                <CheckCircle2 className="size-8" />
              </div>
              <CardTitle className="text-2xl font-bold">
                Clinic Setup Complete!
              </CardTitle>
              <CardDescription className="max-w-md mx-auto">
                Your clinic profile, practitioners, treatment catalog, and
                weekly schedules are ready.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6 max-w-2xl mx-auto">
              {/* Setup Summary Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-muted/30 border border-border/80 text-center">
                <div className="p-2">
                  <span className="text-xs text-muted-foreground block">
                    Timezone
                  </span>
                  <span className="font-semibold text-sm text-foreground truncate block">
                    {activeOrganization?.timezone || "UTC"}
                  </span>
                </div>
                <div className="p-2 border-l border-border/60">
                  <span className="text-xs text-muted-foreground block">
                    Dentists
                  </span>
                  <span className="font-semibold text-sm text-foreground">
                    {dentistsCount} {dentistsCount === 1 ? "Doctor" : "Doctors"}
                  </span>
                </div>
                <div className="p-2 border-l border-border/60">
                  <span className="text-xs text-muted-foreground block">
                    Services
                  </span>
                  <span className="font-semibold text-sm text-foreground">
                    {servicesCount} Treatments
                  </span>
                </div>
                <div className="p-2 border-l border-border/60">
                  <span className="text-xs text-muted-foreground block">
                    Closures
                  </span>
                  <span className="font-semibold text-sm text-foreground">
                    {holidaysCount} Days
                  </span>
                </div>
              </div>

              {/* Next Phases Preview */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Upcoming System Integrations
                </h4>

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-card">
                    <div className="flex items-center gap-3">
                      <div className="size-9 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <Calendar className="size-4" />
                      </div>
                      <div>
                        <h5 className="text-sm font-semibold text-foreground">
                          Google Calendar Sync
                        </h5>
                        <p className="text-xs text-muted-foreground">
                          Connect doctor calendars for real-time slot
                          synchronization.
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className="text-xs shrink-0 text-muted-foreground"
                    >
                      Phase 4
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-card">
                    <div className="flex items-center gap-3">
                      <div className="size-9 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                        <BookOpen className="size-4" />
                      </div>
                      <div>
                        <h5 className="text-sm font-semibold text-foreground">
                          Knowledge Base & RAG
                        </h5>
                        <p className="text-xs text-muted-foreground">
                          Upload clinic documents, FAQ, and pricing for AI
                          context.
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className="text-xs shrink-0 text-muted-foreground"
                    >
                      Phase 4
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-card">
                    <div className="flex items-center gap-3">
                      <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Bot className="size-4" />
                      </div>
                      <div>
                        <h5 className="text-sm font-semibold text-foreground">
                          AI Voice & Web Receptionist
                        </h5>
                        <p className="text-xs text-muted-foreground">
                          24/7 conversational AI answering calls and booking
                          patients.
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className="text-xs shrink-0 text-muted-foreground"
                    >
                      Phase 5
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleBack}
          disabled={currentStepIndex === 0}
          className="gap-1.5"
        >
          <ArrowLeft className="size-4" /> Previous Step
        </Button>

        <div className="flex items-center gap-2">
          {currentStepIndex < STEPS.length - 1 ? (
            <Button
              type="button"
              onClick={handleNext}
              className="gap-1.5 font-medium"
            >
              Next Step <ArrowRight className="size-4" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => onComplete?.()}
              className="gap-1.5 font-medium bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <CheckCircle2 className="size-4" /> Finish Setup & Go to Dashboard
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
