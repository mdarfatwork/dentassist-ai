import * as React from "react";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[72px] w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground transition-colors",
        "placeholder:text-muted-foreground/70",
        "focus-visible:border-ring focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/40",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/30",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
