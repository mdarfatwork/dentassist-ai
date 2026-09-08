"use client";

import {
  useState,
  useRef,
  useTransition,
  ChangeEvent,
  SubmitEvent,
} from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { useOrganization } from "@/components/organization/organization-provider";
import {
  updateClinicProfileSchema,
  IANA_TIMEZONES,
  type UpdateClinicProfileInput,
} from "@/lib/validations/clinic";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import {
  Building2,
  Globe2,
  Mail,
  Phone,
  MapPin,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Upload,
  Trash2,
  RotateCcw,
} from "lucide-react";

interface ClinicProfileFormProps {
  onSaved?: () => void;
}

export function ClinicProfileForm({
  onSaved,
}: Readonly<ClinicProfileFormProps>) {
  const router = useRouter();
  const { activeOrganization, refetch } = useOrganization();
  const [, startTransition] = useTransition();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [formData, setFormData] = useState<UpdateClinicProfileInput>({
    name: activeOrganization?.name ?? "",
    description: activeOrganization?.description ?? null,
    logoUrl: activeOrganization?.logoUrl ?? null,
    phone: activeOrganization?.phone ?? null,
    email: activeOrganization?.email ?? null,
    address: activeOrganization?.address ?? null,
    timezone: activeOrganization?.timezone ?? "UTC",
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [logoFileError, setLogoFileError] = useState<string | null>(null);

  const [prevOrgId, setPrevOrgId] = useState(activeOrganization?.id);

  // Sync state when activeOrganization changes without effect cascading render
  if (activeOrganization && activeOrganization.id !== prevOrgId) {
    setPrevOrgId(activeOrganization.id);
    setFormData({
      name: activeOrganization.name || "",
      description: activeOrganization.description || null,
      logoUrl: activeOrganization.logoUrl || null,
      phone: activeOrganization.phone || null,
      email: activeOrganization.email || null,
      address: activeOrganization.address || null,
      timezone: activeOrganization.timezone || "UTC",
    });
    setFieldErrors({});
    setErrorMessage(null);
    setSuccessMessage(null);
  }

  const updateProfileMutation = trpc.organization.updateProfile.useMutation();

  const handleInputChange = (
    field: keyof UpdateClinicProfileInput,
    value: string | null,
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
    if (errorMessage) setErrorMessage(null);
    if (successMessage) setSuccessMessage(null);
  };

  const handleLogoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    setLogoFileError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate mime type
    const validMimes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/svg+xml",
    ];
    if (!validMimes.includes(file.type)) {
      setLogoFileError(
        "Please select a valid image (PNG, JPEG, WebP, or SVG).",
      );
      return;
    }

    // Validate size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setLogoFileError("Image size must not exceed 2MB.");
      return;
    }

    // Convert to Data URL for instant preview & storage reference
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      handleInputChange("logoUrl", result);
    };
    reader.onerror = () => {
      setLogoFileError("Failed to read image file.");
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    handleInputChange("logoUrl", null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleReset = () => {
    if (activeOrganization) {
      setFormData({
        name: activeOrganization.name || "",
        description: activeOrganization.description || null,
        logoUrl: activeOrganization.logoUrl || null,
        phone: activeOrganization.phone || null,
        email: activeOrganization.email || null,
        address: activeOrganization.address || null,
        timezone: activeOrganization.timezone || "UTC",
      });
    }
    setFieldErrors({});
    setErrorMessage(null);
    setSuccessMessage(null);
    setLogoFileError(null);
  };

  const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setFieldErrors({});

    const validation = updateClinicProfileSchema.safeParse(formData);
    if (!validation.success) {
      const errors: Record<string, string> = {};
      for (const issue of validation.error.issues) {
        const path = issue.path[0] as string;
        if (path) {
          errors[path] = issue.message;
        }
      }
      setFieldErrors(errors);
      setErrorMessage("Please correct the highlighted errors before saving.");
      return;
    }

    try {
      await updateProfileMutation.mutateAsync(validation.data);
      setSuccessMessage("Clinic profile updated successfully.");
      await refetch();
      startTransition(() => {
        router.refresh();
      });
      onSaved?.();
    } catch (err: unknown) {
      console.error("Failed to update clinic profile:", err);
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Failed to update profile. Please try again.");
      }
    }
  };

  return (
    <Card className="border-border shadow-xs">
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Building2 className="size-5 text-primary" /> Clinic Information
          </CardTitle>
          <CardDescription>
            Configure your dental practice profile, contact channels, and
            timezone.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
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

          {/* Logo Section */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-xl bg-muted/40 border border-border/60">
            <div className="relative size-20 rounded-xl border border-border bg-background flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
              {formData.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={formData.logoUrl}
                  alt="Clinic Logo Preview"
                  className="size-full object-contain p-1"
                />
              ) : (
                <ImageIcon className="size-8 text-muted-foreground/60" />
              )}
            </div>

            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">
                  Clinic Logo
                </span>
                <span className="text-xs text-muted-foreground">
                  (PNG, JPEG, WebP, SVG • Max 2MB)
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Displayed across patient booking widgets and clinic
                communications.
              </p>

              {logoFileError && (
                <p className="text-xs text-destructive">{logoFileError}</p>
              )}

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleLogoUpload}
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                  id="clinic-logo-input"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={updateProfileMutation.isPending}
                >
                  <Upload className="size-3.5" />
                  {formData.logoUrl ? "Replace Logo" : "Upload Logo"}
                </Button>
                {formData.logoUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive gap-1.5"
                    onClick={handleRemoveLogo}
                    disabled={updateProfileMutation.isPending}
                  >
                    <Trash2 className="size-3.5" />
                    Remove
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Core Profile Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Clinic Name */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="clinic-name" className="text-sm font-medium">
                Clinic / Business Name{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="clinic-name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="e.g. Bright Smile Dental"
                disabled={updateProfileMutation.isPending}
                aria-invalid={!!fieldErrors.name}
              />
              {fieldErrors.name && (
                <p className="text-xs text-destructive">{fieldErrors.name}</p>
              )}
            </div>

            {/* Timezone Selection */}
            <div className="flex flex-col gap-2">
              <Label
                htmlFor="clinic-timezone"
                className="text-sm font-medium flex items-center gap-1.5"
              >
                <Globe2 className="size-3.5 text-primary" /> Clinic Timezone{" "}
                <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <select
                  id="clinic-timezone"
                  value={formData.timezone}
                  onChange={(e) =>
                    handleInputChange("timezone", e.target.value)
                  }
                  disabled={updateProfileMutation.isPending}
                  className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm shadow-xs transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {IANA_TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Determines scheduling slots and calendar event offsets.
              </p>
              {fieldErrors.timezone && (
                <p className="text-xs text-destructive">
                  {fieldErrors.timezone}
                </p>
              )}
            </div>

            {/* Business Phone */}
            <div className="flex flex-col gap-2">
              <Label
                htmlFor="clinic-phone"
                className="text-sm font-medium flex items-center gap-1.5"
              >
                <Phone className="size-3.5 text-primary" /> Phone Number
              </Label>
              <Input
                id="clinic-phone"
                type="tel"
                value={formData.phone ?? ""}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                placeholder="+1 (555) 234-5678"
                disabled={updateProfileMutation.isPending}
                aria-invalid={!!fieldErrors.phone}
              />
              {fieldErrors.phone && (
                <p className="text-xs text-destructive">{fieldErrors.phone}</p>
              )}
            </div>

            {/* Business Email */}
            <div className="flex flex-col gap-2">
              <Label
                htmlFor="clinic-email"
                className="text-sm font-medium flex items-center gap-1.5"
              >
                <Mail className="size-3.5 text-primary" /> Business Contact
                Email
              </Label>
              <Input
                id="clinic-email"
                type="email"
                value={formData.email ?? ""}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder="reception@brightsmile.com"
                disabled={updateProfileMutation.isPending}
                aria-invalid={!!fieldErrors.email}
              />
              {fieldErrors.email && (
                <p className="text-xs text-destructive">{fieldErrors.email}</p>
              )}
            </div>
          </div>

          {/* Physical Address */}
          <div className="flex flex-col gap-2">
            <Label
              htmlFor="clinic-address"
              className="text-sm font-medium flex items-center gap-1.5"
            >
              <MapPin className="size-3.5 text-primary" /> Physical Address
            </Label>
            <Input
              id="clinic-address"
              value={formData.address ?? ""}
              onChange={(e) => handleInputChange("address", e.target.value)}
              placeholder="e.g. 742 Evergreen Terrace, Suite 100, Springfield, IL"
              disabled={updateProfileMutation.isPending}
              aria-invalid={!!fieldErrors.address}
            />
            {fieldErrors.address && (
              <p className="text-xs text-destructive">{fieldErrors.address}</p>
            )}
          </div>

          {/* Description */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="clinic-description" className="text-sm font-medium">
              Clinic Description / Mission
            </Label>
            <Textarea
              id="clinic-description"
              rows={3}
              value={formData.description ?? ""}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Provide a brief overview of your practice, dental specialties, and care philosophy..."
              disabled={updateProfileMutation.isPending}
              aria-invalid={!!fieldErrors.description}
            />
            {fieldErrors.description && (
              <p className="text-xs text-destructive">
                {fieldErrors.description}
              </p>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex items-center justify-between border-t border-border pt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={updateProfileMutation.isPending}
            className="gap-1.5"
          >
            <RotateCcw className="size-3.5" /> Reset
          </Button>

          <Button
            type="submit"
            disabled={updateProfileMutation.isPending}
            className="gap-1.5 font-medium"
          >
            {updateProfileMutation.isPending ? (
              <>
                <Spinner className="mr-1.5" /> Saving Changes...
              </>
            ) : (
              <>
                <CheckCircle2 className="size-4" /> Save Clinic Profile
              </>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
