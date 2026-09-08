"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SwitchProps extends Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "onChange"
> {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  (
    {
      className,
      checked: controlledChecked,
      defaultChecked = false,
      onCheckedChange,
      disabled,
      ...props
    },
    ref,
  ) => {
    const [uncontrolledChecked, setUncontrolledChecked] =
      React.useState(defaultChecked);
    const isControlled = controlledChecked !== undefined;
    const isChecked = isControlled ? controlledChecked : uncontrolledChecked;

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled) return;
      props.onClick?.(e);
      if (!isControlled) {
        setUncontrolledChecked(!isChecked);
      }
      onCheckedChange?.(!isChecked);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (disabled) return;
      props.onKeyDown?.(e);
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (!isControlled) {
          setUncontrolledChecked(!isChecked);
        }
        onCheckedChange?.(!isChecked);
      }
    };

    return (
      <button
        type="button"
        role="switch"
        aria-checked={isChecked}
        disabled={disabled}
        ref={ref}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={cn(
          "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
          isChecked ? "bg-primary" : "bg-muted-foreground/30",
          className,
        )}
        {...props}
      >
        <span
          className={cn(
            "pointer-events-none block size-4 rounded-full bg-background shadow-lg ring-0 transition-transform",
            isChecked ? "translate-x-4" : "translate-x-0",
          )}
        />
      </button>
    );
  },
);

Switch.displayName = "Switch";

export { Switch };
