"use client";

import { SubmitEvent, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import {
  createServiceSchema,
  updateServiceSchema,
} from "@/lib/validations/service";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Sparkles,
  Plus,
  Pencil,
  Trash2,
  AlertCircle,
  Clock,
  CheckCircle2,
  FileText,
} from "lucide-react";

interface Service {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  createdAt: Date;
  updatedAt: Date;
}

const DURATION_PRESETS = [15, 30, 45, 60, 90, 120];

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

export function ServiceManager() {
  const utils = trpc.useUtils();
  const servicesQuery = trpc.service.list.useQuery();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [deletingService, setDeletingService] = useState<Service | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [actionError, setActionError] = useState<string | null>(null);

  const createMutation = trpc.service.create.useMutation({
    onSuccess: async () => {
      await utils.service.list.invalidate();
      closeDialogs();
    },
    onError: (err) => {
      setActionError(err.message || "Failed to create service.");
    },
  });

  const updateMutation = trpc.service.update.useMutation({
    onSuccess: async () => {
      await utils.service.list.invalidate();
      closeDialogs();
    },
    onError: (err) => {
      setActionError(err.message || "Failed to update service.");
    },
  });

  const deleteMutation = trpc.service.delete.useMutation({
    onSuccess: async () => {
      await utils.service.list.invalidate();
      closeDialogs();
    },
    onError: (err) => {
      setActionError(err.message || "Failed to delete service.");
    },
  });

  const closeDialogs = () => {
    setIsAddOpen(false);
    setEditingService(null);
    setDeletingService(null);
    setName("");
    setDescription("");
    setDurationMinutes(30);
    setFieldErrors({});
    setActionError(null);
  };

  const openAddDialog = () => {
    setName("");
    setDescription("");
    setDurationMinutes(30);
    setFieldErrors({});
    setActionError(null);
    setIsAddOpen(true);
  };

  const openEditDialog = (service: Service) => {
    setEditingService(service);
    setName(service.name);
    setDescription(service.description ?? "");
    setDurationMinutes(service.durationMinutes);
    setFieldErrors({});
    setActionError(null);
  };

  const openDeleteDialog = (service: Service) => {
    setDeletingService(service);
    setActionError(null);
  };

  const handleSave = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setActionError(null);
    setFieldErrors({});

    const basePayload = {
      name,
      description: description.trim() || null,
      durationMinutes: Number(durationMinutes),
    };

    if (editingService) {
      const validation = updateServiceSchema.safeParse({
        ...basePayload,
        id: editingService.id,
      });
      if (!validation.success) {
        setFieldErrors(extractFieldErrors(validation.error.issues));
        return;
      }
      await updateMutation.mutateAsync(validation.data);
      return;
    }

    const validation = createServiceSchema.safeParse(basePayload);
    if (!validation.success) {
      setFieldErrors(extractFieldErrors(validation.error.issues));
      return;
    }
    await createMutation.mutateAsync(validation.data);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingService) return;
    await deleteMutation.mutateAsync({ id: deletingService.id });
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const services = servicesQuery.data || [];

  const renderContent = () => {
    if (servicesQuery.isLoading) {
      return (
        <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
          <Spinner /> Loading services...
        </div>
      );
    }

    if (services.length === 0) {
      return (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center rounded-xl border border-dashed border-border bg-muted/20">
          <div className="size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3">
            <Sparkles className="size-6" />
          </div>
          <h3 className="text-base font-semibold text-foreground">
            No services yet
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm mt-1 mb-4">
            Add the dental procedures and treatments your clinic provides to
            enable automated slot allocation.
          </p>
          <Button onClick={openAddDialog} size="sm" className="gap-1.5">
            <Plus className="size-4" /> Add First Service
          </Button>
        </div>
      );
    }

    return (
      /* Services Grid */
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((service) => (
          <div
            key={service.id}
            className="group relative flex flex-col justify-between p-4 rounded-xl border border-border bg-card hover:border-primary/40 hover:shadow-xs transition-all"
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-semibold text-sm text-foreground">
                  {service.name}
                </h4>
                <Badge
                  variant="secondary"
                  className="font-mono text-xs shrink-0 gap-1 font-medium"
                >
                  <Clock className="size-3 text-primary" />{" "}
                  {service.durationMinutes} min
                </Badge>
              </div>

              {service.description ? (
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {service.description}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  No description provided.
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-1.5 mt-4 pt-3 border-t border-border/60">
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => openEditDialog(service)}
                className="text-muted-foreground hover:text-foreground"
                title="Edit Service"
              >
                <Pencil className="size-3.5" />
                <span className="sr-only">Edit {service.name}</span>
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => openDeleteDialog(service)}
                className="text-muted-foreground hover:text-destructive"
                title="Delete Service"
              >
                <Trash2 className="size-3.5" />
                <span className="sr-only">Delete {service.name}</span>
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
            <Sparkles className="size-5 text-primary" /> Treatments & Services
          </CardTitle>
          <CardDescription>
            Define procedures, standard durations, and treatments offered by
            your clinic.
          </CardDescription>
        </div>

        <Button
          onClick={openAddDialog}
          size="sm"
          className="gap-1.5 self-start sm:self-auto"
        >
          <Plus className="size-4" /> Add Service
        </Button>
      </CardHeader>

      <CardContent>{renderContent()}</CardContent>

      {/* Add / Edit Dialog */}
      <Dialog
        open={isAddOpen || editingService !== null}
        onOpenChange={(open) => {
          if (!open) closeDialogs();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2">
                <Sparkles className="size-5" />
              </div>
              <DialogTitle>
                {editingService ? "Edit Service" : "Add Dental Service"}
              </DialogTitle>
              <DialogDescription>
                Configure service duration and patient description.
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
                <Label htmlFor="service-name" className="text-sm font-medium">
                  Service Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="service-name"
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
                  placeholder="e.g. Dental Cleaning, Root Canal, Teeth Whitening"
                  disabled={isSaving}
                  autoFocus
                  aria-invalid={!!fieldErrors.name}
                />
                {fieldErrors.name && (
                  <p className="text-xs text-destructive">{fieldErrors.name}</p>
                )}
              </div>

              {/* Duration with presets */}
              <div className="flex flex-col gap-2">
                <Label
                  htmlFor="service-duration"
                  className="text-sm font-medium flex items-center justify-between"
                >
                  <span className="flex items-center gap-1.5">
                    <Clock className="size-3.5 text-primary" /> Duration
                    (Minutes) <span className="text-destructive">*</span>
                  </span>
                  <span className="font-mono text-xs text-primary font-semibold">
                    {durationMinutes} minutes
                  </span>
                </Label>

                <div className="flex flex-wrap gap-1.5 mb-1">
                  {DURATION_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setDurationMinutes(preset)}
                      className={`text-xs px-2.5 py-1 rounded-md border font-medium transition-colors cursor-pointer ${
                        durationMinutes === preset
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted/60 text-muted-foreground border-border hover:bg-muted"
                      }`}
                    >
                      {preset}m
                    </button>
                  ))}
                </div>

                <Input
                  id="service-duration"
                  type="number"
                  min={5}
                  max={480}
                  step={5}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  disabled={isSaving}
                  aria-invalid={!!fieldErrors.durationMinutes}
                />
                {fieldErrors.durationMinutes && (
                  <p className="text-xs text-destructive">
                    {fieldErrors.durationMinutes}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <Label
                  htmlFor="service-description"
                  className="text-sm font-medium flex items-center gap-1.5"
                >
                  <FileText className="size-3.5 text-primary" /> Description
                  (Optional)
                </Label>
                <Textarea
                  id="service-description"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Standard 6-month preventive cleaning and polishing."
                  disabled={isSaving}
                />
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
                    {editingService ? "Update Service" : "Add Service"}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deletingService !== null}
        onOpenChange={(open) => {
          if (!open) closeDialogs();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="size-10 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center mb-2">
              <Trash2 className="size-5" />
            </div>
            <DialogTitle>Delete {deletingService?.name}?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this treatment? This action cannot
              be undone.
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
                  <Trash2 className="size-4" /> Delete Service
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
