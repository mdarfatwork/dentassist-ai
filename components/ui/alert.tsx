import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative w-full rounded-[2px] border border-l-3 p-3 text-xs [&>svg~*]:pl-6 [&>svg]:absolute [&>svg]:left-3 [&>svg]:top-3.5 [&>svg]:text-foreground",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground border-border border-l-primary",
        destructive:
          "border-destructive/30 border-l-destructive text-destructive bg-destructive/5 [&>svg]:text-destructive",
        success:
          "border-emerald-600/30 border-l-emerald-600 text-emerald-800 dark:text-emerald-200 bg-emerald-500/10 [&>svg]:text-emerald-600 dark:[&>svg]:text-emerald-400",
        warning:
          "border-amber-600/30 border-l-amber-600 text-amber-800 dark:text-amber-200 bg-amber-500/10 [&>svg]:text-amber-600 dark:[&>svg]:text-amber-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
));
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, children, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn(
      "mb-1 font-semibold leading-none tracking-tight text-foreground",
      className,
    )}
    {...props}
  >
    {children}
  </h5>
));
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-xs leading-relaxed text-muted-foreground", className)}
    {...props}
  />
));
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };
