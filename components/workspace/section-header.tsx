import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  counter?: number | string;
  className?: string;
}

export function SectionHeader({
  title,
  description,
  action,
  counter,
  className,
}: Readonly<SectionHeaderProps>) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-border/60",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-bold tracking-tight text-foreground">
          {title}
        </h2>
        {counter !== undefined && (
          <span className="font-mono text-[11px] font-semibold px-1.5 py-0.5 rounded-[2px] bg-muted text-muted-foreground border border-border/60">
            {counter}
          </span>
        )}
        {description && (
          <span className="text-xs text-muted-foreground hidden md:inline ml-2 border-l border-border pl-2">
            {description}
          </span>
        )}
      </div>

      {action && (
        <div className="flex items-center gap-2 shrink-0">{action}</div>
      )}
    </div>
  );
}
