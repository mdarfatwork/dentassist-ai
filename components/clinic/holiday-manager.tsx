"use client";

import { SubmitEvent, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import {
  createHolidaySchema,
  updateHolidaySchema,
} from "@/lib/validations/holiday";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Credenza,
  CredenzaContent,
  CredenzaDescription,
  CredenzaFooter,
  CredenzaHeader,
  CredenzaTitle,
} from "@/components/ui/credenza";
import {
  CalendarOff,
  Plus,
  Pencil,
  Trash2,
  AlertCircle,
  Calendar as CalendarIcon,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Holiday {
  id: string;
  name: string;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

function extractFieldErrors(
  issues: readonly { path: readonly unknown[]; message: string }[],
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const path = issue.path[0];
    if (typeof path === "string") {
      errors[path] = issue.message;
    }
  }
  return errors;
}

export function HolidayManager() {
  const utils = trpc.useUtils();
  const holidaysQuery = trpc.holiday.list.useQuery();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [deletingHoliday, setDeletingHoliday] = useState<Holiday | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [dateStr, setDateStr] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [actionError, setActionError] = useState<string | null>(null);

  const createMutation = trpc.holiday.create.useMutation({
    onSuccess: async () => {
      await utils.holiday.list.invalidate();
      closeDialogs();
    },
    onError: (err) => {
      setActionError(err.message || "Failed to add holiday.");
    },
  });

  const updateMutation = trpc.holiday.update.useMutation({
    onSuccess: async () => {
      await utils.holiday.list.invalidate();
      closeDialogs();
    },
    onError: (err) => {
      setActionError(err.message || "Failed to update holiday.");
    },
  });

  const deleteMutation = trpc.holiday.delete.useMutation({
    onSuccess: async () => {
      await utils.holiday.list.invalidate();
      closeDialogs();
    },
    onError: (err) => {
      setActionError(err.message || "Failed to delete holiday.");
    },
  });

  const closeDialogs = () => {
    setIsAddOpen(false);
    setEditingHoliday(null);
    setDeletingHoliday(null);
    setName("");
    setDateStr("");
    setFieldErrors({});
    setActionError(null);
  };

  const openAddDialog = () => {
    setName("");
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setDateStr(tomorrow.toISOString().split("T")[0] || "");
    setFieldErrors({});
    setActionError(null);
    setIsAddOpen(true);
  };

  const openEditDialog = (holiday: Holiday) => {
    setEditingHoliday(holiday);
    setName(holiday.name);
    const dateObj = new Date(holiday.date);
    setDateStr(dateObj.toISOString().split("T")[0] || "");
    setFieldErrors({});
    setActionError(null);
  };

  const openDeleteDialog = (holiday: Holiday) => {
    setDeletingHoliday(holiday);
    setActionError(null);
  };

  const handleSave = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setActionError(null);
    setFieldErrors({});

    const basePayload = {
      name,
      date: dateStr as unknown as Date,
    };

    if (editingHoliday) {
      const validation = updateHolidaySchema.safeParse({
        ...basePayload,
        id: editingHoliday.id,
      });
      if (!validation.success) {
        setFieldErrors(extractFieldErrors(validation.error.issues));
        return;
      }
      await updateMutation.mutateAsync(validation.data);
      return;
    }

    const validation = createHolidaySchema.safeParse(basePayload);
    if (!validation.success) {
      setFieldErrors(extractFieldErrors(validation.error.issues));
      return;
    }
    await createMutation.mutateAsync(validation.data);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingHoliday) return;
    await deleteMutation.mutateAsync({ id: deletingHoliday.id });
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const holidays = holidaysQuery.data || [];

  const renderContent = () => {
    if (holidaysQuery.isLoading) {
      return (
        <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
          <Spinner /> Loading holidays...
        </div>
      );
    }

    if (holidays.length === 0) {
      return (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-10 px-4 text-center rounded-[4px] border border-dashed border-border bg-muted/20">
          <div className="size-9 rounded-[3px] bg-primary/10 text-primary flex items-center justify-center mb-2.5">
            <CalendarOff className="size-4" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">
            No planned closures
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4 leading-relaxed">
            Add upcoming practice closures and public holidays when your clinic
            will be unavailable.
          </p>
          <Button
            onClick={openAddDialog}
            size="sm"
            className="gap-1.5 font-semibold"
          >
            <Plus className="size-3.5" /> Add First Holiday
          </Button>
        </div>
      );
    }

    return (
      /* Holidays List */
      <div className="divide-y divide-border rounded-[4px] border border-border bg-card overflow-hidden">
        {holidays.map((holiday) => {
          const dateObj = new Date(holiday.date);
          const formattedDate = dateObj.toLocaleDateString("en-US", {
            weekday: "short",
            year: "numeric",
            month: "short",
            day: "numeric",
            timeZone: "UTC",
          });

          return (
            <div
              key={holiday.id}
              className="flex items-center justify-between p-3 sm:px-4 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="size-7.5 rounded-[3px] bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <CalendarIcon className="size-3.5" />
                </div>
                <div>
                  <h4 className="font-semibold text-xs text-foreground">
                    {holiday.name}
                  </h4>
                  <p className="text-[11px] text-muted-foreground font-mono">
                    {formattedDate}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => openEditDialog(holiday)}
                  className="text-muted-foreground hover:text-foreground"
                  title="Edit Holiday"
                >
                  <Pencil className="size-3.5" />
                  <span className="sr-only">Edit {holiday.name}</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => openDeleteDialog(holiday)}
                  className="text-muted-foreground hover:text-destructive"
                  title="Delete Holiday"
                >
                  <Trash2 className="size-3.5" />
                  <span className="sr-only">Delete {holiday.name}</span>
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Card className="border-border shadow-xs">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <CalendarOff className="size-5 text-primary" /> Clinic Closures &
            Holidays
          </CardTitle>
          <CardDescription>
            Configure dates when the clinic will be closed. Appointments cannot
            be booked on these dates.
          </CardDescription>
        </div>

        <Button
          onClick={openAddDialog}
          size="sm"
          className="gap-1.5 self-start sm:self-auto"
        >
          <Plus className="size-4" /> Add Holiday
        </Button>
      </CardHeader>

      <CardContent>{renderContent()}</CardContent>

      {/* Add / Edit Dialog */}
      <Credenza
        open={isAddOpen || editingHoliday !== null}
        onOpenChange={(open) => {
          if (!open) closeDialogs();
        }}
      >
        <CredenzaContent className="sm:max-w-md">
          <form onSubmit={handleSave}>
            <CredenzaHeader>
              <div className="size-8 rounded-[3px] bg-primary/10 text-primary flex items-center justify-center mb-1">
                <CalendarIcon className="size-4" />
              </div>
              <CredenzaTitle>
                {editingHoliday
                  ? "Edit Holiday / Closure"
                  : "Add Holiday Closure"}
              </CredenzaTitle>
              <CredenzaDescription>
                Specify the date and closure reason (e.g. Christmas Day, Clinic
                Renovation).
              </CredenzaDescription>
            </CredenzaHeader>

            {actionError && (
              <Alert variant="destructive" className="my-3">
                <AlertCircle className="size-4" />
                <AlertDescription>{actionError}</AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col gap-4 py-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="holiday-name" className="text-sm font-medium">
                  Holiday / Reason <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="holiday-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Christmas Day"
                  disabled={isSaving}
                  aria-invalid={!!fieldErrors.name}
                  autoFocus
                />
                {fieldErrors.name && (
                  <p className="text-xs text-destructive">{fieldErrors.name}</p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-sm font-medium">
                  Closure Date <span className="text-destructive">*</span>
                </Label>
                <DatePicker
                  value={dateStr}
                  onChange={(val) => {
                    setDateStr(val);
                    if (fieldErrors.date) {
                      setFieldErrors((prev) => {
                        const next = { ...prev };
                        delete next.date;
                        return next;
                      });
                    }
                  }}
                  formatString="EEEE, MMMM d, yyyy"
                  placeholder="Select closure date..."
                  disabled={isSaving}
                  aria-invalid={Boolean(fieldErrors.date)}
                  triggerClassName={cn(
                    fieldErrors.date && "border-destructive",
                  )}
                />
                {fieldErrors.date && (
                  <p className="text-xs text-destructive">{fieldErrors.date}</p>
                )}
              </div>
            </div>

            <CredenzaFooter>
              <Button
                type="button"
                variant="outline"
                onClick={closeDialogs}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving || !name.trim() || !dateStr}
                className="gap-1.5"
              >
                {isSaving ? (
                  <>
                    <Spinner className="mr-1.5" /> Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-4" />
                    {editingHoliday ? "Update Closure" : "Add Closure"}
                  </>
                )}
              </Button>
            </CredenzaFooter>
          </form>
        </CredenzaContent>
      </Credenza>

      {/* Delete Confirmation Dialog */}
      <Credenza
        open={deletingHoliday !== null}
        onOpenChange={(open) => {
          if (!open) closeDialogs();
        }}
      >
        <CredenzaContent className="sm:max-w-md">
          <CredenzaHeader>
            <div className="size-8 rounded-[3px] bg-destructive/10 text-destructive flex items-center justify-center mb-1">
              <AlertCircle className="size-4" />
            </div>
            <CredenzaTitle>Delete {deletingHoliday?.name}?</CredenzaTitle>
            <CredenzaDescription>
              Are you sure you want to remove this closure? The date will become
              available for appointments again.
            </CredenzaDescription>
          </CredenzaHeader>

          {actionError && (
            <Alert variant="destructive" className="my-2">
              <AlertCircle className="size-4" />
              <AlertDescription>{actionError}</AlertDescription>
            </Alert>
          )}

          <CredenzaFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={closeDialogs}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
              className="gap-1.5"
            >
              {deleteMutation.isPending ? (
                <>
                  <Spinner className="mr-1.5" /> Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="size-4" /> Delete Holiday
                </>
              )}
            </Button>
          </CredenzaFooter>
        </CredenzaContent>
      </Credenza>
    </Card>
  );
}
