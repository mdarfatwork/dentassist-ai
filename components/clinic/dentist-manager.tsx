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
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center rounded-xl border border-dashed border-border bg-muted/20">
          <div className="size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3">
            <Stethoscope className="size-6" />
          </div>
          <h3 className="text-base font-semibold text-foreground">
            No dentists yet
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm mt-1 mb-4">
            Add your clinic&apos;s dentists to prepare for appointment
            scheduling and AI consultation.
          </p>
          <Button onClick={openAddDialog} size="sm" className="gap-1.5">
            <Plus className="size-4" /> Add First Dentist
          </Button>
        </div>
      );
    }

    return (
      /* Dentists Grid */
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {dentists.map((dentist) => (
          <div
            key={dentist.id}
            className="group relative flex flex-col justify-between p-4 rounded-xl border border-border bg-card hover:border-primary/40 hover:shadow-xs transition-all"
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold text-sm">
                    {dentist.name.replace(/^Dr\.\s*/i, "").charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-foreground leading-snug">
                      {dentist.name}
                    </h4>
                    <span className="text-[11px] text-muted-foreground">
                      Clinic Practitioner
                    </span>
                  </div>
                </div>
              </div>

              {dentist.specialization ? (
                <Badge variant="secondary" className="text-xs font-normal">
                  <Sparkles className="size-3 mr-1 text-primary" />
                  {dentist.specialization}
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="text-xs font-normal text-muted-foreground"
                >
                  General Dentistry
                </Badge>
              )}
            </div>

            <div className="flex items-center justify-end gap-1.5 mt-4 pt-3 border-t border-border/60">
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => openEditDialog(dentist)}
                className="text-muted-foreground hover:text-foreground"
                title="Edit Dentist"
              >
                <Pencil className="size-3.5" />
                <span className="sr-only">Edit {dentist.name}</span>
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => openDeleteDialog(dentist)}
                className="text-muted-foreground hover:text-destructive"
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
    <Card className="border-border shadow-xs">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
          className="gap-1.5 self-start sm:self-auto"
        >
          <Plus className="size-4" /> Add Dentist
        </Button>
      </CardHeader>

      <CardContent>{renderContent()}</CardContent>

      {/* Add / Edit Dialog */}
      <Dialog
        open={isAddOpen || editingDentist !== null}
        onOpenChange={(open) => {
          if (!open) closeDialogs();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2">
                <Stethoscope className="size-5" />
              </div>
              <DialogTitle>
                {editingDentist ? "Edit Dentist" : "Add New Dentist"}
              </DialogTitle>
              <DialogDescription>
                {editingDentist
                  ? "Update dentist information and clinical specialization."
                  : "Add a dentist to your clinic for appointment routing."}
              </DialogDescription>
            </DialogHeader>

            {actionError && (
              <Alert variant="destructive" className="my-3">
                <AlertCircle className="size-4" />
                <AlertDescription>{actionError}</AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col gap-4 py-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="dentist-name" className="text-sm font-medium">
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
                />
                {fieldErrors.name && (
                  <p className="text-xs text-destructive">{fieldErrors.name}</p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <Label
                  htmlFor="dentist-specialization"
                  className="text-sm font-medium"
                >
                  Specialization (Optional)
                </Label>
                <Input
                  id="dentist-specialization"
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  placeholder="e.g. Orthodontics, Cosmetic Dentistry, Periodontics"
                  disabled={isSaving}
                />
                <p className="text-[11px] text-muted-foreground">
                  Helps the AI receptionist match patient symptoms to the right
                  doctor.
                </p>
              </div>
            </div>

            <DialogFooter>
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
                disabled={isSaving || !name.trim()}
                className="gap-1.5"
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
          if (!open) closeDialogs();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="size-10 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center mb-2">
              <Trash2 className="size-5" />
            </div>
            <DialogTitle>Delete {deletingDentist?.name}?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. Removing this dentist will detach
              them from future appointment availability.
            </DialogDescription>
          </DialogHeader>

          {actionError && (
            <Alert variant="destructive" className="my-2">
              <AlertCircle className="size-4" />
              <AlertDescription>{actionError}</AlertDescription>
            </Alert>
          )}

          <DialogFooter className="mt-4">
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
                  <Trash2 className="size-4" /> Delete Dentist
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
