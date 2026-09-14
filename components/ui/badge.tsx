import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-[2px] border px-1.5 py-0.5 text-[11px] font-medium tracking-tight transition-colors focus:outline-none focus:ring-1 focus:ring-ring select-none",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-border/80 bg-secondary text-secondary-foreground",
        destructive: "border-destructive/20 bg-destructive/10 text-destructive",
        outline: "border-border text-foreground bg-transparent",
        success:
          "border-emerald-600/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
        warning:
          "border-amber-600/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
        info: "border-primary/20 bg-primary/10 text-primary",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: Readonly<BadgeProps>) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
