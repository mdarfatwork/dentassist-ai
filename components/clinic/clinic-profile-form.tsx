"use client";

import {
  useState,
  useRef,
  useMemo,
  useTransition,
  type ChangeEvent,
  type SubmitEvent,
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
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
} from "@/components/ui/combobox";
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
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const timezoneOptions = useMemo(() => {
    const list = [...IANA_TIMEZONES];
    if (formData.timezone && !list.includes(formData.timezone)) {
      list.unshift(formData.timezone);
    }
    return list;
  }, [formData.timezone]);

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

  const handleLogoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
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

    // Validate size (max 5MB for S3 upload)
    if (file.size > 5 * 1024 * 1024) {
      setLogoFileError("Image size must not exceed 5MB.");
      return;
    }

    try {
      setIsUploadingLogo(true);
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);
      if (activeOrganization?.id) {
        uploadFormData.append("organizationId", activeOrganization.id);
      }
      uploadFormData.append("folder", "photos");

      const res = await fetch("/api/upload/clinic-photo", {
        method: "POST",
        body: uploadFormData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error ||
            "Unable to upload photo. Please check the image and try again.",
        );
      }

      // Persist the permanent storage URL in the form state
      handleInputChange("logoUrl", data.url);
      setSuccessMessage(
        "Photo uploaded successfully! Click 'Save Clinic Profile' below to apply changes.",
      );
    } catch (err) {
      console.error("Photo upload failed:", err);
      setLogoFileError(
        err instanceof Error
          ? err.message
          : "Unable to upload photo. Please try again.",
      );
    } finally {
      setIsUploadingLogo(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
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

  let logoPreviewContent = (
    <ImageIcon className="size-6 text-muted-foreground/60" />
  );

  if (isUploadingLogo) {
    logoPreviewContent = <Spinner className="size-5 text-primary" />;
  } else if (formData.logoUrl) {
    logoPreviewContent = (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={formData.logoUrl}
        alt="Clinic Logo Preview"
        className="size-full object-contain p-1"
      />
    );
  }

  let submitButtonContent = (
    <>
      <CheckCircle2 className="size-4" /> Save Clinic Profile
    </>
  );

  if (updateProfileMutation.isPending) {
    submitButtonContent = (
      <>
        <Spinner className="mr-1.5" /> Saving Changes...
      </>
    );
  } else if (isUploadingLogo) {
    submitButtonContent = (
      <>
        <Spinner className="mr-1.5" /> Uploading Photo...
      </>
    );
  }

  return (
    <Card className="border-border shadow-none">
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Building2 className="size-4 text-primary" /> Clinic Information
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

          {/* Logo & Clinic Photo Section */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-[4px] bg-muted/30 border border-border">
            <div className="relative size-16 rounded-[3px] border border-border bg-background flex items-center justify-center overflow-hidden shrink-0 shadow-none">
              {logoPreviewContent}
            </div>

            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">
                  Clinic Logo / Primary Photo
                </span>
                <span className="text-xs text-muted-foreground">
                  (PNG, JPEG, WebP, SVG • Max 5MB)
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Displayed across patient booking widgets, appointment
                confirmations, and clinic records.
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
                  disabled={isUploadingLogo || updateProfileMutation.isPending}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingLogo || updateProfileMutation.isPending}
                >
                  {isUploadingLogo ? (
                    <>
                      <Spinner className="size-3.5" />
                      Uploading photo...
                    </>
                  ) : (
                    <>
                      <Upload className="size-3.5" />
                      {formData.logoUrl ? "Replace Photo" : "Upload Photo"}
                    </>
                  )}
                </Button>
                {formData.logoUrl && !isUploadingLogo && (
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
                <Combobox
                  items={timezoneOptions}
                  value={formData.timezone || "UTC"}
                  onValueChange={(val) => {
                    if (val) {
                      handleInputChange("timezone", val);
                    }
                  }}
                  disabled={updateProfileMutation.isPending}
                >
                  <ComboboxInput
                    id="clinic-timezone"
                    placeholder="Search & select timezone (e.g. New York, London, Kolkata)..."
                    className="w-full"
                    showClear
                  />
                  <ComboboxContent className="max-h-72 w-(--anchor-width) overflow-y-auto">
                    <ComboboxEmpty className="py-3 text-xs text-muted-foreground text-center">
                      No matching timezone found.
                    </ComboboxEmpty>
                    <ComboboxList className="max-h-60 overflow-y-auto">
                      {(tz: string) => (
                        <ComboboxItem key={tz} value={tz}>
                          {tz}
                        </ComboboxItem>
                      )}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
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
            disabled={updateProfileMutation.isPending || isUploadingLogo}
            className="gap-1.5"
          >
            <RotateCcw className="size-3.5" /> Reset
          </Button>

          <Button
            type="submit"
            disabled={updateProfileMutation.isPending || isUploadingLogo}
            className="gap-1.5 font-medium"
          >
            {submitButtonContent}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
