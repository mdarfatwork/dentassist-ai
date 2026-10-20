"use client";

import { useState } from "react";
import {
  TEST_SCENARIOS,
  type TestScenario,
} from "@/lib/receptionist/test-scenarios";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FlaskConical,
  Clock,
  BookOpen,
  Sparkles,
  Calendar,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

interface TestScenariosModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectScenario: (scenario: TestScenario) => void;
}

const CATEGORY_ICONS: Record<
  TestScenario["category"],
  React.ComponentType<{ className?: string }>
> = {
  Information: Clock,
  Retrieval: BookOpen,
  Pricing: Sparkles,
  Scheduling: Calendar,
  "Multi-Turn": ArrowRight,
  Safety: ShieldCheck,
};

export function TestScenariosModal({
  isOpen,
  onClose,
  onSelectScenario,
}: TestScenariosModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const categories = ["All", ...new Set(TEST_SCENARIOS.map((s) => s.category))];

  const filteredScenarios =
    selectedCategory === "All"
      ? TEST_SCENARIOS
      : TEST_SCENARIOS.filter((s) => s.category === selectedCategory);

  const handleInsert = (scenario: TestScenario) => {
    onSelectScenario(scenario);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden rounded-2xl">
        <DialogHeader className="p-5 border-b border-border/80 bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <FlaskConical className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-sm sm:text-base font-semibold text-foreground">
                Predefined Test Scenarios
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Validate receptionist behaviors across clinic hours, service
                questions, scheduling, and safety guardrails.
              </DialogDescription>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-1.5 pt-3">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`text-xs font-medium px-3 py-1 rounded-full border transition-all ${
                  selectedCategory === cat
                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                    : "bg-background text-muted-foreground hover:text-foreground border-border/80"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </DialogHeader>

        {/* Scenarios List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {filteredScenarios.map((scenario) => {
            const Icon = CATEGORY_ICONS[scenario.category] || FlaskConical;

            return (
              <div
                key={scenario.id}
                className="rounded-xl border border-border/80 bg-card p-4 space-y-2.5 hover:border-primary/40 transition-colors shadow-2xs"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                        <Icon className="size-3" />
                        {scenario.category}
                      </span>
                      <h4 className="text-xs font-semibold text-foreground">
                        {scenario.title}
                      </h4>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {scenario.testPurpose}
                    </p>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => handleInsert(scenario)}
                    className="shrink-0 text-xs gap-1.5 h-8 px-3 rounded-xl"
                  >
                    <span>Insert Prompt</span>
                    <ArrowRight className="size-3" />
                  </Button>
                </div>

                {/* Prompt Preview */}
                <div className="p-2.5 rounded-lg bg-muted/40 border border-border/60 text-xs text-foreground flex items-center justify-between gap-2">
                  <span className="truncate italic">
                    &ldquo;{scenario.patientPrompt}&rdquo;
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[10px] font-medium shrink-0 rounded-full"
                  >
                    Expected: {scenario.expectedIntent}
                  </Badge>
                </div>

                {/* Guidance */}
                <div className="text-[11px] text-muted-foreground flex items-start gap-1.5 bg-muted/20 p-2.5 rounded-lg">
                  <span className="font-medium text-foreground shrink-0">
                    Validation:
                  </span>
                  <span>{scenario.guidance}</span>
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
