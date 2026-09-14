import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

interface LoadingStateProps {
  label?: string;
  description?: string;
  className?: string;
  rows?: number;
}

export function LoadingState({
  label = "Loading clinic data...",
  description,
  className,
  rows,
}: Readonly<LoadingStateProps>) {
  if (rows && rows > 0) {
    return (
      <div className={cn("space-y-2 w-full p-4", className)}>
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="h-8 bg-muted/60 rounded-[2px] animate-pulse border border-border/40"
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 sm:p-12 text-center",
        className,
      )}
    >
      <Spinner className="size-5 text-primary mb-2.5" />
      <span className="text-xs font-semibold text-foreground tracking-tight">
        {label}
      </span>
      {description && (
        <span className="text-[11px] text-muted-foreground mt-0.5 max-w-xs">
          {description}
        </span>
      )}
    </div>
  );
}
