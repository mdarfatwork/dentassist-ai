import * as React from "react";
import { cn } from "@/lib/utils";

interface WorkspacePanelProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "inset" | "bordered";
}

export function WorkspacePanel({
  className,
  variant = "default",
  children,
  ...props
}: Readonly<WorkspacePanelProps>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border transition-colors shadow-xs overflow-hidden",
        variant === "default" && "bg-card text-card-foreground",
        variant === "inset" && "bg-muted/40 text-foreground",
        variant === "bordered" && "bg-background border-dashed",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function WorkspacePanelHeader({
  className,
  children,
  ...props
}: Readonly<React.HTMLAttributes<HTMLDivElement>>) {
  return (
    <div
      className={cn(
        "flex items-center justify-between px-4 py-3 border-b border-border/60 bg-muted/20",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function WorkspacePanelContent({
  className,
  children,
  ...props
}: Readonly<React.HTMLAttributes<HTMLDivElement>>) {
  return (
    <div className={cn("p-4 sm:p-5", className)} {...props}>
      {children}
    </div>
  );
}

export function WorkspacePanelFooter({
  className,
  children,
  ...props
}: Readonly<React.HTMLAttributes<HTMLDivElement>>) {
  return (
    <div
      className={cn(
        "flex items-center justify-between px-4 py-2.5 border-t border-border/60 bg-muted/10 text-xs text-muted-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
