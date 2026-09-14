"use client";

import { SubmitEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { createOrganizationSchema } from "@/lib/validations/organization";
import { slugify } from "@/lib/organization/slug";
import { setActiveOrgCookie } from "@/lib/organization/cookies";
import { useOrganization } from "./organization-provider";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { Building2, Plus, AlertCircle, CheckCircle2 } from "lucide-react";

interface OrganizationEmptyStateProps {
  userName: string;
}

export function OrganizationEmptyState({
  userName,
}: Readonly<OrganizationEmptyStateProps>) {
  const router = useRouter();
  const { refetch } = useOrganization();
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

      setActiveOrgCookie(createdOrg.id);
      await refetch();
      router.refresh();
    } catch (err: unknown) {
      console.error("Failed to create first organization:", err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to create organization. Please try again.");
      }
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 sm:py-12 flex flex-col items-center">
      {/* Welcome Card - Clean Clinical Workspace Initializer */}
      <Card className="w-full border-border shadow-none overflow-hidden">
        <div className="p-6 sm:p-8 border-b border-border bg-card">
          <div className="size-9 rounded-[3px] bg-primary text-primary-foreground flex items-center justify-center mb-3">
            <Building2 className="size-4.5" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[2px] border border-primary/20 bg-primary/10 text-primary text-[11px] font-semibold mb-2">
            Practice Initializer
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Welcome to DentAssist AI, {userName}
          </h2>
          <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Create your primary dental clinic organization to unlock your
            receptionist portal, practitioner schedule, and appointment
            workflows.
          </p>
        </div>

        <CardContent className="p-6 sm:p-8 space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="first-org-name" className="text-xs font-semibold">
                Dental Clinic / Practice Legal Name
              </Label>
              <Input
                id="first-org-name"
                name="name"
                placeholder="e.g. Metro Dental Associates"
                value={name}
                onChange={handleNameChange}
                disabled={createMutation.isPending}
                autoFocus
                className="h-9 text-xs"
                aria-invalid={!!fieldError}
              />
              {fieldError && (
                <p className="text-xs text-destructive font-medium mt-0.5">
                  {fieldError}
                </p>
              )}
            </div>

            {previewSlug && (
              <div className="rounded-[3px] bg-muted/50 border border-border px-3 py-2 text-xs flex items-center justify-between">
                <span className="text-muted-foreground text-[11px]">
                  Generated Practice Identifier:
                </span>
                <code className="font-mono text-foreground font-semibold text-xs">
                  {previewSlug}
                </code>
              </div>
            )}

            <Button
              type="submit"
              disabled={createMutation.isPending || !name.trim()}
              className="w-full h-9 font-semibold gap-2 mt-1"
            >
              {createMutation.isPending ? (
                <>
                  <Spinner className="mr-2" /> Initializing Workspace...
                </>
              ) : (
                <>
                  <Plus className="size-3.5" /> Initialize Clinic Organization
                </>
              )}
            </Button>
          </form>

          {/* Value checklist */}
          <div className="pt-4 border-t border-border grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-3.5 text-primary shrink-0" />
              <span>Full practice owner privileges</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-3.5 text-primary shrink-0" />
              <span>Multi-tenant data isolation</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-3.5 text-primary shrink-0" />
              <span>Multiple clinic branch switching</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-3.5 text-primary shrink-0" />
              <span>Autonomous AI receptionist ready</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
