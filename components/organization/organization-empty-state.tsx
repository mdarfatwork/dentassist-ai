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
import {
  Building2,
  Sparkles,
  Plus,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

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
      {/* Welcome Card */}
      <Card className="w-full border-border shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-primary/15 via-primary/5 to-transparent p-6 sm:p-8 border-b border-border/80">
          <div className="size-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-xs shadow-primary/20 mb-4">
            <Building2 className="size-6" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/15 text-primary text-xs font-semibold mb-2">
            <Sparkles className="size-3.5" /> First-Time Setup
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Welcome to DentAssist AI, {userName}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            Create your first dental clinic organization to unlock your AI
            receptionist portal, schedule management, and clinic workflows.
          </p>
        </div>

        <CardContent className="p-6 sm:p-8 space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="first-org-name" className="text-sm font-semibold">
                Dental Clinic / Practice Name
              </Label>
              <Input
                id="first-org-name"
                name="name"
                placeholder="e.g. Bright Smile Dental Clinic"
                value={name}
                onChange={handleNameChange}
                disabled={createMutation.isPending}
                autoFocus
                className="h-10 text-sm"
                aria-invalid={!!fieldError}
              />
              {fieldError && (
                <p className="text-xs text-destructive font-medium mt-0.5">
                  {fieldError}
                </p>
              )}
            </div>

            {previewSlug && (
              <div className="rounded-lg bg-muted/70 border border-border/80 px-3.5 py-2.5 text-xs flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-primary" /> Generated Slug:
                </span>
                <code className="font-mono text-foreground font-semibold">
                  {previewSlug}
                </code>
              </div>
            )}

            <Button
              type="submit"
              disabled={createMutation.isPending || !name.trim()}
              className="w-full h-10 font-semibold gap-2 shadow-xs"
            >
              {createMutation.isPending ? (
                <>
                  <Spinner className="mr-2" /> Creating Practice...
                </>
              ) : (
                <>
                  <Plus className="size-4" /> Create Organization & Get Started
                </>
              )}
            </Button>
          </form>

          {/* Value checklist */}
          <div className="pt-4 border-t border-border/60 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-primary shrink-0" />
              <span>Full practice owner privileges</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-primary shrink-0" />
              <span>Multi-tenant data isolation</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-primary shrink-0" />
              <span>Switch between multiple clinics</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-primary shrink-0" />
              <span>Ready for AI receptionist tools</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
