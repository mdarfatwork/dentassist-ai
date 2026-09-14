import { Bot, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type AIStage =
  | "searching_knowledge"
  | "checking_availability"
  | "reading_policy"
  | "checking_calendar"
  | "preparing_response"
  | "action_completed";

interface AIActivityProps {
  stage: AIStage;
  customText?: string;
  sourceRef?: string;
  timestamp?: string;
  className?: string;
}

const stageConfig: Record<AIStage, { label: string; isComplete: boolean }> = {
  searching_knowledge: {
    label: "Searching clinic knowledge base",
    isComplete: false,
  },
  checking_availability: {
    label: "Checking dentist availability",
    isComplete: false,
  },
  reading_policy: {
    label: "Reading clinic scheduling policy",
    isComplete: false,
  },
  checking_calendar: {
    label: "Verifying calendar slot conflicts",
    isComplete: false,
  },
  preparing_response: {
    label: "Preparing clinical response",
    isComplete: false,
  },
  action_completed: {
    label: "Operational action confirmed",
    isComplete: true,
  },
};

export function AIActivity({
  stage,
  customText,
  sourceRef,
  timestamp,
  className,
}: Readonly<AIActivityProps>) {
  const current = stageConfig[stage] || {
    label: "Processing clinic request",
    isComplete: false,
  };

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 px-3 py-2 rounded-[3px] border border-border/80 bg-muted/30 text-xs",
        className,
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="size-5 rounded-[2px] bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Bot className="size-3" />
        </div>

        <div className="flex items-center gap-2 min-w-0 truncate">
          {current.isComplete ? (
            <CheckCircle2 className="size-3 text-emerald-600 shrink-0" />
          ) : (
            <Loader2 className="size-3 text-primary animate-spin shrink-0" />
          )}
          <span className="font-medium text-foreground truncate">
            {customText || current.label}
          </span>
          {sourceRef && (
            <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-[2px] border border-border/60 shrink-0">
              {sourceRef}
            </span>
          )}
        </div>
      </div>

      {timestamp && (
        <span className="font-mono text-[10px] text-muted-foreground shrink-0 tabular-nums">
          {timestamp}
        </span>
      )}
    </div>
  );
}
