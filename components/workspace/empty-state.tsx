import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  hint?: string;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  hint,
  className,
}: Readonly<EmptyStateProps>) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 sm:p-12 text-center border border-dashed border-border rounded-xl bg-muted/20",
        className,
      )}
    >
      {icon && (
        <div className="size-11 rounded-xl border border-border bg-card flex items-center justify-center text-primary mb-3 shadow-xs">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-semibold text-foreground tracking-tight">
        {title}
      </h3>
      <p className="text-xs text-muted-foreground max-w-sm mt-1 leading-relaxed">
        {description}
      </p>
      {hint && (
        <p className="text-[11px] text-muted-foreground/80 mt-2 font-mono bg-muted px-2 py-0.5 rounded-[2px]">
          {hint}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
