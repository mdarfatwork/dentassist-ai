"use client";

import { SubmitEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { createOrganizationSchema } from "@/lib/validations/organization";
import { slugify } from "@/lib/organization/slug";
import { setActiveOrgCookie } from "@/lib/organization/cookies";
import { useOrganization } from "./organization-provider";
import {
  Credenza,
  CredenzaContent,
  CredenzaDescription,
  CredenzaFooter,
  CredenzaHeader,
  CredenzaTitle,
  CredenzaTrigger,
} from "@/components/ui/credenza";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { Building2, Plus, AlertCircle } from "lucide-react";

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
    <Credenza open={isOpen} onOpenChange={setIsOpen}>
      {trigger ? (
        <CredenzaTrigger render={trigger as React.ReactElement} />
      ) : null}

      <CredenzaContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <CredenzaHeader>
            <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-1">
              <Building2 className="size-4" />
            </div>
            <CredenzaTitle>Create Practice Organization</CredenzaTitle>
            <CredenzaDescription>
              Establish a new dental practice tenant. Your account will be
              designated as OWNER.
            </CredenzaDescription>
          </CredenzaHeader>

          {error && (
            <Alert variant="destructive" className="my-3">
              <AlertCircle className="size-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-3 py-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="org-name" className="text-xs font-semibold">
                Practice Organization Name
              </Label>
              <Input
                id="org-name"
                name="name"
                placeholder="e.g. Downtown Dental Care"
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
              <div className="rounded-md bg-muted/50 border border-border px-3 py-2 text-xs flex items-center justify-between">
                <span className="text-muted-foreground text-[11px]">
                  Generated Tenant Slug:
                </span>
                <code className="font-mono text-foreground font-semibold text-xs">
                  {previewSlug}
                </code>
              </div>
            )}
          </div>

          <CredenzaFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsOpen(false)}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={createMutation.isPending || !name.trim()}
              className="gap-1.5 font-semibold"
            >
              {createMutation.isPending ? (
                <>
                  <Spinner className="mr-1.5" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="size-3.5" />
                  Create Practice
                </>
              )}
            </Button>
          </CredenzaFooter>
        </form>
      </CredenzaContent>
    </Credenza>
  );
}
