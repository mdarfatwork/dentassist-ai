"use client";

import { SubmitEvent, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import {
  DAYS_OF_WEEK,
  DEFAULT_WORKING_HOURS,
  updateWorkingHoursSchema,
  type DayScheduleInput,
  type DayOfWeekValue,
} from "@/lib/validations/working-hours";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Copy,
  RotateCcw,
  CalendarCheck,
} from "lucide-react";

const DAY_LABELS: Record<DayOfWeekValue, string> = {
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
  SATURDAY: "Saturday",
  SUNDAY: "Sunday",
};

interface WorkingHoursEditorProps {
  onSaved?: () => void;
}

export function WorkingHoursEditor({
  onSaved,
}: Readonly<WorkingHoursEditorProps>) {
  const utils = trpc.useUtils();
  const hoursQuery = trpc.workingHours.get.useQuery();

  const [schedules, setSchedules] = useState<DayScheduleInput[]>(
    DEFAULT_WORKING_HOURS,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [prevQueryData, setPrevQueryData] = useState(hoursQuery.data);

  if (hoursQuery.data && hoursQuery.data !== prevQueryData) {
    setPrevQueryData(hoursQuery.data);
    setSchedules(hoursQuery.data);
  }

  const updateMutation = trpc.workingHours.update.useMutation({
    onSuccess: async () => {
      setSuccessMessage("Working hours saved successfully.");
      await utils.workingHours.get.invalidate();
      onSaved?.();
    },
    onError: (err) => {
      setErrorMessage(err.message || "Failed to update working hours.");
    },
  });

  const handleToggleDay = (day: DayOfWeekValue, isOpen: boolean) => {
    setSchedules((prev) =>
      prev.map((s) => {
        if (s.dayOfWeek === day) {
          return {
            ...s,
            isOpen,
            startTime: isOpen ? s.startTime || "09:00" : null,
            endTime: isOpen ? s.endTime || "17:00" : null,
          };
        }
        return s;
      }),
    );
    if (errorMessage) setErrorMessage(null);
    if (successMessage) setSuccessMessage(null);
  };

  const handleTimeChange = (
    day: DayOfWeekValue,
    field: "startTime" | "endTime",
    val: string,
  ) => {
    setSchedules((prev) =>
      prev.map((s) => {
        if (s.dayOfWeek === day) {
          return { ...s, [field]: val };
        }
        return s;
      }),
    );
    if (fieldErrors[`${day}_${field}`]) {
      setFieldErrors((prev) => {
        const updated = { ...prev };
        delete updated[`${day}_${field}`];
        return updated;
      });
    }
    if (errorMessage) setErrorMessage(null);
    if (successMessage) setSuccessMessage(null);
  };

  const handleCopyMondayToWeekdays = () => {
    const monday = schedules.find((s) => s.dayOfWeek === "MONDAY");
    if (!monday) return;

    setSchedules((prev) =>
      prev.map((s) => {
        if (
          ["TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"].includes(s.dayOfWeek)
        ) {
          return {
            ...s,
            isOpen: monday.isOpen,
            startTime: monday.isOpen ? monday.startTime : null,
            endTime: monday.isOpen ? monday.endTime : null,
          };
        }
        return s;
      }),
    );
    setSuccessMessage("Copied Monday hours across Tuesday to Friday.");
  };

  const handleReset = () => {
    if (hoursQuery.data) {
      setSchedules(hoursQuery.data);
    } else {
      setSchedules(DEFAULT_WORKING_HOURS);
    }
    setFieldErrors({});
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleSave = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setFieldErrors({});

    const validation = updateWorkingHoursSchema.safeParse({ schedules });
    if (!validation.success) {
      const errors: Record<string, string> = {};
      for (const issue of validation.error.issues) {
        // e.g. path ['schedules', 0, 'endTime']
        if (
          issue.path[0] === "schedules" &&
          typeof issue.path[1] === "number"
        ) {
          const day = schedules[issue.path[1]]?.dayOfWeek;
          const field = issue.path[2] as string;
          if (day && field) {
            errors[`${day}_${field}`] = issue.message;
          }
        }
      }
      setFieldErrors(errors);
      setErrorMessage(
        validation.error.issues[0]?.message ||
          "Please verify that opening hours are valid and opening time is before closing time.",
      );
      return;
    }

    await updateMutation.mutateAsync(validation.data);
  };

  return (
    <Card className="border-border shadow-none">
      <form onSubmit={handleSave}>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Clock className="size-4 text-primary" /> Regular Working Hours
            </CardTitle>
            <CardDescription>
              Set weekly recurring opening hours. Used by the AI to offer valid
              appointment slots.
            </CardDescription>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopyMondayToWeekdays}
            className="gap-1.5 self-start sm:self-auto text-xs"
          >
            <Copy className="size-3.5" /> Copy Mon to Weekdays
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          {errorMessage && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          {successMessage && (
            <Alert variant="success">
              <CheckCircle2 className="size-4" />
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          )}

          {hoursQuery.isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
              <Spinner /> Loading working hours...
            </div>
          ) : (
            <div className="divide-y divide-border rounded-[4px] border border-border bg-card overflow-hidden">
              {DAYS_OF_WEEK.map((day) => {
                const daySchedule = schedules.find(
                  (s) => s.dayOfWeek === day,
                ) || {
                  dayOfWeek: day,
                  isOpen: false,
                  startTime: null,
                  endTime: null,
                };
                const hasError = !!fieldErrors[`${day}_endTime`];

                return (
                  <div
                    key={day}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:px-4 gap-3 transition-colors ${
                      daySchedule.isOpen ? "bg-background" : "bg-muted/30"
                    }`}
                  >
                    {/* Day label and toggle */}
                    <div className="flex items-center justify-between sm:justify-start gap-4 min-w-[160px]">
                      <div className="flex items-center gap-2.5">
                        <Switch
                          id={`toggle-${day}`}
                          checked={daySchedule.isOpen}
                          onCheckedChange={(checked) =>
                            handleToggleDay(day, checked)
                          }
                          disabled={updateMutation.isPending}
                        />
                        <label
                          htmlFor={`toggle-${day}`}
                          className="font-medium text-sm text-foreground cursor-pointer select-none"
                        >
                          {DAY_LABELS[day]}
                        </label>
                      </div>

                      <Badge
                        variant={daySchedule.isOpen ? "default" : "secondary"}
                        className="text-[11px] px-2 py-0.5 uppercase tracking-wider font-semibold sm:hidden"
                      >
                        {daySchedule.isOpen ? "Open" : "Closed"}
                      </Badge>
                    </div>

                    {/* Time selection or Closed indicator */}
                    <div className="flex items-center justify-end gap-3 flex-1">
                      {daySchedule.isOpen ? (
                        <div className="flex items-center gap-2 w-full sm:w-auto justify-start sm:justify-end">
                          <div className="flex flex-col">
                            <Input
                              type="time"
                              value={daySchedule.startTime || "09:00"}
                              onChange={(e) =>
                                handleTimeChange(
                                  day,
                                  "startTime",
                                  e.target.value,
                                )
                              }
                              disabled={updateMutation.isPending}
                              className="h-8 w-28 text-xs font-mono"
                              aria-label={`${DAY_LABELS[day]} Opening Time`}
                            />
                          </div>

                          <span className="text-muted-foreground text-xs font-medium">
                            to
                          </span>

                          <div className="flex flex-col">
                            <Input
                              type="time"
                              value={daySchedule.endTime || "17:00"}
                              onChange={(e) =>
                                handleTimeChange(day, "endTime", e.target.value)
                              }
                              disabled={updateMutation.isPending}
                              aria-invalid={hasError}
                              className="h-8 w-28 text-xs font-mono"
                              aria-label={`${DAY_LABELS[day]} Closing Time`}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="hidden sm:inline-flex items-center text-xs text-muted-foreground font-medium py-1">
                          Clinic Closed
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>

        <CardFooter className="flex items-center justify-between border-t border-border pt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={updateMutation.isPending}
            className="gap-1.5"
          >
            <RotateCcw className="size-3.5" /> Reset Schedule
          </Button>

          <Button
            type="submit"
            disabled={updateMutation.isPending || hoursQuery.isLoading}
            className="gap-1.5 font-medium"
          >
            {updateMutation.isPending ? (
              <>
                <Spinner className="mr-1.5" /> Saving Hours...
              </>
            ) : (
              <>
                <CalendarCheck className="size-4" /> Save Working Hours
              </>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
