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
        "flex flex-col items-center justify-center p-8 sm:p-12 text-center border border-dashed border-border rounded-[4px] bg-muted/20",
        className,
      )}
    >
      {icon && (
        <div className="size-10 rounded-[3px] border border-border bg-background flex items-center justify-center text-muted-foreground mb-3 shadow-none">
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
