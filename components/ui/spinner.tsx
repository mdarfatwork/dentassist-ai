import * as React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export interface SpinnerProps extends React.SVGAttributes<SVGSVGElement> {
  size?: "sm" | "default" | "lg";
}

export function Spinner({
  className,
  size = "default",
  ...props
}: Readonly<SpinnerProps>) {
  const sizeClasses = {
    sm: "size-3.5",
    default: "size-4",
    lg: "size-6",
  };

  return (
    <Loader2
      className={cn("animate-spin text-current", sizeClasses[size], className)}
      {...props}
    />
  );
}
