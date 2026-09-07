"use client";

import { SubmitEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { createOrganizationSchema } from "@/lib/validations/organization";
import { slugify } from "@/lib/organization/slug";
import { setActiveOrgCookie } from "@/lib/organization/cookies";
import { useOrganization } from "./organization-provider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { Building2, Plus, AlertCircle, Sparkles } from "lucide-react";

interface CreateOrganizationDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
  defaultOpen?: boolean;
}

export function CreateOrganizationDialog({
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  trigger,
  defaultOpen = false,
}: Readonly<CreateOrganizationDialogProps>) {
  const router = useRouter();
  const { refetch } = useOrganization();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : uncontrolledOpen;
  const setIsOpen = isControlled ? setControlledOpen! : setUncontrolledOpen;

  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const createMutation = trpc.organization.create.useMutation();

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    if (fieldError) setFieldError(null);
    if (error) setError(null);
  };

  const previewSlug = name.trim() ? slugify(name) : "";

  const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setFieldError(null);

    const validation = createOrganizationSchema.safeParse({ name });
    if (!validation.success) {
      const issue = validation.error.issues[0];
      setFieldError(issue ? issue.message : "Invalid organization name");
      return;
    }

    try {
      const createdOrg = await createMutation.mutateAsync({
        name: validation.data.name,
      });

      // Automatically set the new organization as active
      setActiveOrgCookie(createdOrg.id);
      await refetch();

      // Reset state & close
      setName("");
      setIsOpen(false);
      router.refresh();
    } catch (err: unknown) {
      console.error("Failed to create organization:", err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to create organization. Please try again.");
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {trigger ? (
        <DialogTrigger render={trigger as React.ReactElement} />
      ) : (
        <DialogTrigger render={<Button size="sm" className="gap-1.5" />}>
          <Plus className="size-4" /> Create Organization
        </DialogTrigger>
      )}

      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2">
              <Building2 className="size-5" />
            </div>
            <DialogTitle>Create New Organization</DialogTitle>
            <DialogDescription>
              Set up a dental clinic or practice organization. You will be
              assigned as the <strong>OWNER</strong>.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <Alert variant="destructive" className="my-3">
              <AlertCircle className="size-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-4 py-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="org-name" className="text-sm font-medium">
                Organization / Clinic Name
              </Label>
              <Input
                id="org-name"
                name="name"
                placeholder="e.g. Bright Smile Dental"
                value={name}
                onChange={handleNameChange}
                disabled={createMutation.isPending}
                autoFocus
                aria-invalid={!!fieldError}
              />
              {fieldError && (
                <p className="text-xs text-destructive mt-0.5">{fieldError}</p>
              )}
            </div>

            {previewSlug && (
              <div className="rounded-lg bg-muted/60 border border-border/80 px-3 py-2 text-xs flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-primary" /> Generated Slug:
                </span>
                <code className="font-mono text-foreground font-medium">
                  {previewSlug}
                </code>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || !name.trim()}
              className="gap-1.5 font-medium"
            >
              {createMutation.isPending ? (
                <>
                  <Spinner className="mr-1.5" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="size-4" />
                  Create Practice
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
