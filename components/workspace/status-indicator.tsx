import { cn } from "@/lib/utils";

export type StatusType =
  "active" | "success" | "warning" | "destructive" | "idle" | "info";

interface StatusIndicatorProps {
  status: StatusType;
  label: string;
  sublabel?: string;
  size?: "sm" | "md";
  className?: string;
}

export function StatusIndicator({
  status,
  label,
  sublabel,
  size = "sm",
  className,
}: Readonly<StatusIndicatorProps>) {
  const dotColorClasses: Record<StatusType, string> = {
    active: "bg-primary",
    success: "bg-emerald-600",
    warning: "bg-amber-600",
    destructive: "bg-destructive",
    idle: "bg-muted-foreground/40",
    info: "bg-primary",
  };

  const badgeBgClasses: Record<StatusType, string> = {
    active: "border-primary/20 bg-primary/5 text-primary",
    success:
      "border-emerald-600/20 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
    warning:
      "border-amber-600/20 bg-amber-500/10 text-amber-800 dark:text-amber-300",
    destructive: "border-destructive/20 bg-destructive/10 text-destructive",
    idle: "border-border bg-muted/50 text-muted-foreground",
    info: "border-primary/20 bg-primary/10 text-primary",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[2px] border px-2 py-0.5 text-[11px] font-medium tracking-tight select-none",
        badgeBgClasses[status],
        className,
      )}
    >
      <span
        className={cn(
          "rounded-full shrink-0",
          size === "sm" ? "size-1.5" : "size-2",
          dotColorClasses[status],
        )}
        aria-hidden="true"
      />
      <span>{label}</span>
      {sublabel && <span className="text-[10px] opacity-70">({sublabel})</span>}
    </span>
  );
}
