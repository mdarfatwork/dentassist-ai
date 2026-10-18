"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface DatePickerProps {
  value?: string | Date;
  onChange?: (dateString: string, date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  minDate?: Date | string;
  maxDate?: Date | string;
  disabledDays?: (date: Date) => boolean;
  className?: string;
  triggerClassName?: string;
  clearable?: boolean;
  formatString?: string;
  id?: string;
  "aria-label"?: string;
  "aria-invalid"?: boolean;
  size?: "sm" | "default";
}

/**
 * Safely parse a date-only string (e.g. "YYYY-MM-DD") or Date object
 * without introducing UTC offset shifts or off-by-one errors.
 */
function parseLocalDate(
  val: string | Date | undefined | null,
): Date | undefined {
  if (!val) return undefined;
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? undefined : val;
  }
  if (typeof val === "string") {
    // If it's a YYYY-MM-DD formatted string, parse using local year, month, day
    const parts = val.split("-");
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        return new Date(year, month, day);
      }
    }
    const parsed = new Date(val);
    return isNaN(parsed.getTime()) ? undefined : parsed;
  }
  return undefined;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Select date...",
  disabled = false,
  minDate,
  maxDate,
  disabledDays,
  className,
  triggerClassName,
  clearable = false,
  formatString = "MMM d, yyyy",
  id,
  "aria-label": ariaLabel,
  "aria-invalid": ariaInvalid,
  size = "default",
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  const selectedDate = React.useMemo(() => parseLocalDate(value), [value]);
  const parsedMinDate = React.useMemo(() => parseLocalDate(minDate), [minDate]);
  const parsedMaxDate = React.useMemo(() => parseLocalDate(maxDate), [maxDate]);

  const formattedDisplay = React.useMemo(() => {
    if (!selectedDate) return null;
    try {
      return format(selectedDate, formatString);
    } catch {
      return null;
    }
  }, [selectedDate, formatString]);

  const handleSelect = (day: Date | undefined) => {
    if (!day) {
      if (clearable) {
        onChange?.("", undefined);
      }
      setOpen(false);
      return;
    }
    const formatted = format(day, "yyyy-MM-dd");
    onChange?.(formatted, day);
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange?.("", undefined);
  };

  // Determine disabled days for react-day-picker
  const isDateDisabled = (day: Date): boolean => {
    if (parsedMinDate && day < parsedMinDate) return true;
    if (parsedMaxDate && day > parsedMaxDate) return true;
    if (disabledDays && disabledDays(day)) return true;
    return false;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            type="button"
            variant="outline"
            aria-label={ariaLabel || placeholder}
            aria-invalid={ariaInvalid}
            disabled={disabled}
            className={cn(
              "w-full justify-start text-left font-normal border-input bg-background transition-colors",
              size === "sm" ? "h-7.5 px-2.5 text-xs" : "h-8.5 px-3 text-xs",
              !selectedDate && "text-muted-foreground",
              ariaInvalid && "border-destructive text-destructive",
              triggerClassName,
            )}
          />
        }
      >
        <CalendarIcon className="mr-2 size-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate flex-1 font-mono text-xs text-foreground">
          {formattedDisplay ?? (
            <span className="text-muted-foreground font-sans">
              {placeholder}
            </span>
          )}
        </span>
        {clearable && selectedDate && !disabled && (
          <span
            role="button"
            tabIndex={0}
            onClick={handleClear}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onChange?.("", undefined);
              }
            }}
            className="ml-auto mr-1 p-0.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
            aria-label="Clear date"
          >
            <X className="size-3" />
          </span>
        )}
        <ChevronDown className="size-3 shrink-0 opacity-50" />
      </PopoverTrigger>

      <PopoverContent
        className={cn(
          "w-auto p-0 z-[70] shadow-xl border-border bg-popover rounded-[4px]",
          className,
        )}
        align="start"
        sideOffset={4}
      >
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleSelect}
          disabled={isDateDisabled}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}
