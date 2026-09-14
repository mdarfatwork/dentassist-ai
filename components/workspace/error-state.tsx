import type { ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  action?: ReactNode;
  className?: string;
}

export function ErrorState({
  title = "Operational Error",
  message,
  onRetry,
  action,
  className,
}: Readonly<ErrorStateProps>) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 sm:p-12 text-center border border-destructive/30 rounded-[4px] bg-destructive/5",
        className,
      )}
    >
      <div className="size-9 rounded-[3px] bg-destructive/10 text-destructive flex items-center justify-center mb-3">
        <AlertTriangle className="size-4" />
      </div>
      <h3 className="text-sm font-semibold text-destructive tracking-tight">
        {title}
      </h3>
      <p className="text-xs text-muted-foreground max-w-sm mt-1 leading-relaxed">
        {message}
      </p>

      <div className="mt-4 flex items-center gap-2">
        {onRetry && (
          <Button
            size="sm"
            variant="outline"
            onClick={onRetry}
            className="gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10"
          >
            <RotateCcw className="size-3" /> Retry Operation
          </Button>
        )}
        {action}
      </div>
    </div>
  );
}
