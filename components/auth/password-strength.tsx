"use client";

import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PasswordStrengthProps {
  password: string;
}

export function PasswordStrength({
  password,
}: Readonly<PasswordStrengthProps>) {
  const requirements = [
    { label: "8+ characters", met: password.length >= 8 },
    { label: "Uppercase letter", met: /[A-Z]/.test(password) },
    { label: "Number", met: /\d/.test(password) },
    { label: "Special character", met: /[^A-Za-z0-9]/.test(password) },
  ];

  const score = requirements.filter((r) => r.met).length;

  const getStrengthColor = () => {
    if (score === 0) return "bg-muted";
    if (score <= 1) return "bg-destructive";
    if (score <= 2) return "bg-amber-500";
    if (score <= 3) return "bg-primary";
    return "bg-emerald-600";
  };

  const getStrengthText = () => {
    if (!password) return "";
    if (score <= 1) return "Weak";
    if (score === 2) return "Fair";
    if (score === 3) return "Good";
    return "Strong";
  };

  if (!password) return null;

  return (
    <div className="flex flex-col gap-2 mt-1.5 animate-fadeIn">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Password strength</span>
        <span
          className={cn("font-semibold text-[11px]", {
            "text-destructive": score <= 1,
            "text-amber-600": score === 2,
            "text-primary": score === 3,
            "text-emerald-700 dark:text-emerald-400": score === 4,
          })}
        >
          {getStrengthText()}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-1 h-1 w-full bg-muted rounded-[2px] overflow-hidden">
        {[1, 2, 3, 4].map((step) => (
          <div
            key={step}
            className={cn(
              "h-full rounded-[2px] transition-all duration-200",
              step <= score ? getStrengthColor() : "bg-transparent",
            )}
          />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-1">
        {requirements.map((req) => (
          <div
            key={req.label}
            className={cn(
              "flex items-center gap-1.5 text-[11px] transition-colors",
              req.met
                ? "text-emerald-800 dark:text-emerald-300 font-medium"
                : "text-muted-foreground",
            )}
          >
            {req.met ? (
              <Check className="size-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <X className="size-3 text-muted-foreground/60 shrink-0" />
            )}
            <span>{req.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
