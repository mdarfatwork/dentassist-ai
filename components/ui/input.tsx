import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-8.5 w-full rounded-[3px] border border-input bg-background px-3 py-1.5 text-xs text-foreground transition-colors",
          "file:border-0 file:bg-transparent file:text-xs file:font-medium file:text-foreground",
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
  },
);
Input.displayName = "Input";

export { Input };
