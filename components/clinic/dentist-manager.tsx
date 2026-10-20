"use client";

import { SubmitEvent, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import {
  createDentistSchema,
  updateDentistSchema,
} from "@/lib/validations/dentist";
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
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  UserCheck,
  Plus,
  Pencil,
  Trash2,
  AlertCircle,
  Stethoscope,
  Sparkles,
  CheckCircle2,
} from "lucide-react";

interface Dentist {
  id: string;
  name: string;
  specialization: string | null;
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

export function DentistManager() {
  const utils = trpc.useUtils();
  const dentistsQuery = trpc.dentist.list.useQuery();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingDentist, setEditingDentist] = useState<Dentist | null>(null);
  const [deletingDentist, setDeletingDentist] = useState<Dentist | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [actionError, setActionError] = useState<string | null>(null);

  const createMutation = trpc.dentist.create.useMutation({
    onSuccess: async () => {
      await utils.dentist.list.invalidate();
      closeDialogs();
    },
    onError: (err) => {
      setActionError(err.message || "Failed to create dentist.");
    },
  });

  const updateMutation = trpc.dentist.update.useMutation({
    onSuccess: async () => {
      await utils.dentist.list.invalidate();
      closeDialogs();
    },
    onError: (err) => {
      setActionError(err.message || "Failed to update dentist.");
    },
  });

  const deleteMutation = trpc.dentist.delete.useMutation({
    onSuccess: async () => {
      await utils.dentist.list.invalidate();
      closeDialogs();
    },
    onError: (err) => {
      setActionError(err.message || "Failed to delete dentist.");
    },
  });

  const closeDialogs = () => {
    setIsAddOpen(false);
    setEditingDentist(null);
    setDeletingDentist(null);
    setName("");
    setSpecialization("");
    setFieldErrors({});
    setActionError(null);
  };

  const openAddDialog = () => {
    setName("");
    setSpecialization("");
    setFieldErrors({});
    setActionError(null);
    setIsAddOpen(true);
  };

  const openEditDialog = (dentist: Dentist) => {
    setEditingDentist(dentist);
    setName(dentist.name);
    setSpecialization(dentist.specialization ?? "");
    setFieldErrors({});
    setActionError(null);
  };

  const openDeleteDialog = (dentist: Dentist) => {
    setDeletingDentist(dentist);
    setActionError(null);
  };

  const handleSave = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setActionError(null);
    setFieldErrors({});

    const basePayload = {
      name,
      specialization: specialization.trim() || null,
    };

    if (editingDentist) {
      const validation = updateDentistSchema.safeParse({
        ...basePayload,
        id: editingDentist.id,
      });
      if (!validation.success) {
        setFieldErrors(extractFieldErrors(validation.error.issues));
        return;
      }
      await updateMutation.mutateAsync(validation.data);
      return;
    }

    const validation = createDentistSchema.safeParse(basePayload);
    if (!validation.success) {
      setFieldErrors(extractFieldErrors(validation.error.issues));
      return;
    }
    await createMutation.mutateAsync(validation.data);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingDentist) return;
    await deleteMutation.mutateAsync({ id: deletingDentist.id });
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const dentists = dentistsQuery.data || [];

  const renderContent = () => {
    if (dentistsQuery.isLoading) {
      return (
        <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
          <Spinner /> Loading dentists...
        </div>
      );
    }

    if (dentists.length === 0) {
      return (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center rounded-2xl border border-dashed border-border/80 bg-muted/20">
          <div className="size-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center mb-3">
            <Stethoscope className="size-5" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">
            No practitioners registered
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4 leading-relaxed">
            Add your clinic&apos;s dentists to configure chair availability,
            specialized treatments, and appointment booking.
          </p>
          <Button
            onClick={openAddDialog}
            size="sm"
            className="gap-1.5 rounded-xl font-semibold"
          >
            <Plus className="size-3.5" /> Add First Dentist
          </Button>
        </div>
      );
    }

    return (
      /* Dentists Grid */
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {dentists.map((dentist) => (
          <div
            key={dentist.id}
            className="group relative flex flex-col justify-between p-4 rounded-xl border border-border/80 bg-card hover:border-primary/40 hover:shadow-xs transition-all"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="size-8.5 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 font-bold text-xs">
                    {dentist.name.replace(/^Dr\.\s*/i, "").charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-semibold text-xs text-foreground leading-snug group-hover:text-primary transition-colors">
                      {dentist.name}
                    </h4>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      Practitioner
                    </span>
                  </div>
                </div>
              </div>

              <div>
                {dentist.specialization ? (
                  <Badge
                    variant="secondary"
                    className="rounded-full px-2.5 py-0.5 text-[11px] font-normal"
                  >
                    <Sparkles className="size-3 mr-1 text-primary shrink-0" />
                    {dentist.specialization}
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="rounded-full px-2.5 py-0.5 text-[11px] font-normal text-muted-foreground border-border/70"
                  >
                    General Dentistry
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-1.5 mt-4 pt-3 border-t border-border/60">
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => openEditDialog(dentist)}
                className="rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                title="Edit Dentist"
              >
                <Pencil className="size-3.5" />
                <span className="sr-only">Edit {dentist.name}</span>
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => openDeleteDialog(dentist)}
                className="rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                title="Delete Dentist"
              >
                <Trash2 className="size-3.5" />
                <span className="sr-only">Delete {dentist.name}</span>
              </Button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card className="rounded-2xl border-border/80 shadow-xs">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 border-b border-border/50">
        <div>
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <UserCheck className="size-5 text-primary" /> Practicing Dentists
          </CardTitle>
          <CardDescription>
            Manage dental practitioners available for patient appointments and
            treatments.
          </CardDescription>
        </div>

        <Button
          onClick={openAddDialog}
          size="sm"
          className="gap-1.5 self-start sm:self-auto rounded-xl font-semibold"
        >
          <Plus className="size-4" /> Add Dentist
        </Button>
      </CardHeader>

      <CardContent className="p-5 sm:p-6">{renderContent()}</CardContent>

      {/* Add / Edit Dialog */}
      <Dialog
        open={isAddOpen || editingDentist !== null}
        onOpenChange={(open) => {
          if (!open && !isSaving) closeDialogs();
        }}
      >
        <DialogContent className="max-w-[460px] rounded-2xl p-6 gap-4">
          <form onSubmit={handleSave} className="space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="size-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                <Stethoscope className="size-5" />
              </div>
              <DialogHeader className="gap-1 flex-1 pr-4">
                <DialogTitle className="text-base font-semibold text-foreground leading-snug">
                  {editingDentist ? "Edit Dentist" : "Add New Dentist"}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
                  {editingDentist
                    ? "Update dentist information and clinical specialization."
                    : "Add a dentist to your clinic for appointment routing."}
                </DialogDescription>
              </DialogHeader>
            </div>

            {actionError && (
              <Alert variant="destructive" className="rounded-xl my-2">
                <AlertCircle className="size-4" />
                <AlertDescription>{actionError}</AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col gap-3.5 py-1">
              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor="dentist-name"
                  className="text-xs font-semibold text-foreground"
                >
                  Dentist Full Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="dentist-name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (fieldErrors.name) {
                      setFieldErrors((prev) => {
                        const updated = { ...prev };
                        delete updated.name;
                        return updated;
                      });
                    }
                  }}
                  placeholder="e.g. Dr. Sarah Jenkins, DDS"
                  disabled={isSaving}
                  autoFocus
                  aria-invalid={!!fieldErrors.name}
                  className="rounded-xl"
                />
                {fieldErrors.name && (
                  <p className="text-xs text-destructive">{fieldErrors.name}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor="dentist-specialization"
                  className="text-xs font-semibold text-foreground"
                >
                  Specialization (Optional)
                </Label>
                <Input
                  id="dentist-specialization"
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  placeholder="e.g. Orthodontics, Cosmetic Dentistry, Periodontics"
                  disabled={isSaving}
                  className="rounded-xl"
                />
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Helps the AI receptionist match patient symptoms to the right
                  doctor.
                </p>
              </div>
            </div>

            <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={closeDialogs}
                disabled={isSaving}
                className="rounded-xl font-medium"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving || !name.trim()}
                className="gap-1.5 rounded-xl font-medium"
              >
                {isSaving ? (
                  <>
                    <Spinner className="mr-1.5" /> Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-4" />
                    {editingDentist ? "Update Dentist" : "Add Dentist"}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Safe Delete Confirmation Dialog */}
      <Dialog
        open={deletingDentist !== null}
        onOpenChange={(open) => {
          if (!open && !deleteMutation.isPending) closeDialogs();
        }}
      >
        <DialogContent className="max-w-[460px] rounded-2xl p-6 gap-4">
          <div className="flex items-start gap-3.5">
            <div className="size-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center shrink-0 mt-0.5">
              <AlertCircle className="size-5" />
            </div>
            <DialogHeader className="gap-1 flex-1 pr-4">
              <DialogTitle className="text-base font-semibold text-foreground leading-snug">
                Delete {deletingDentist?.name}?
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
                This action cannot be undone. Removing this dentist will detach
                them from future appointment availability.
              </DialogDescription>
            </DialogHeader>
          </div>

          {actionError && (
            <Alert variant="destructive" className="rounded-xl my-1">
              <AlertCircle className="size-4" />
              <AlertDescription>{actionError}</AlertDescription>
            </Alert>
          )}

          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={closeDialogs}
              disabled={deleteMutation.isPending}
              className="rounded-xl font-medium"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
              className="gap-1.5 rounded-xl font-medium"
            >
              {deleteMutation.isPending ? (
                <>
                  <Spinner className="mr-1.5" /> Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="size-3.5" /> Delete Dentist
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
