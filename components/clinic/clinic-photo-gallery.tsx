"use client";

import { useState, useRef, type ChangeEvent } from "react";
import { useOrganization } from "@/components/organization/organization-provider";
import { trpc } from "@/lib/trpc/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import {
  Camera,
  Upload,
  CheckCircle2,
  AlertCircle,
  Copy,
  Trash2,
  Star,
  ExternalLink,
  FolderTree,
} from "lucide-react";

interface UploadedAsset {
  key: string;
  url: string;
  viewUrl: string;
  filename: string;
  size: number;
  uploadedAt: Date;
}

export function ClinicPhotoGallery() {
  const { activeOrganization, refetch } = useOrganization();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [selectedFolder, setSelectedFolder] = useState<
    "photos" | "logo" | "documents"
  >("photos");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [recentAssets, setRecentAssets] = useState<UploadedAsset[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const updateProfileMutation = trpc.organization.updateProfile.useMutation();
  const deleteFileMutation = trpc.storage.deleteFile.useMutation();

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    setSuccessMessage(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    // Validate mime type
    const validMimes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/svg+xml",
    ];
    if (!validMimes.includes(file.type)) {
      setUploadError("Please upload a valid image (PNG, JPEG, WebP, SVG).");
      return;
    }

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Image size must not exceed 5MB.");
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      if (activeOrganization?.id) {
        formData.append("organizationId", activeOrganization.id);
      }
      formData.append("folder", selectedFolder);

      const res = await fetch("/api/upload/clinic-photo", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error || "Unable to upload photo. Please try again.",
        );
      }

      const newAsset: UploadedAsset = {
        key: data.key,
        url: data.url,
        viewUrl: data.viewUrl,
        filename: data.filename,
        size: data.size,
        uploadedAt: new Date(),
      };

      setRecentAssets((prev) => [newAsset, ...prev]);
      setSuccessMessage(`Photo "${file.name}" uploaded successfully.`);
    } catch (err) {
      console.error("Gallery upload error:", err);
      setUploadError(
        err instanceof Error
          ? err.message
          : "Unable to upload photo. Please try again.",
      );
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleSetPrimary = async (asset: UploadedAsset) => {
    if (!activeOrganization) return;
    try {
      await updateProfileMutation.mutateAsync({
        name: activeOrganization.name,
        timezone: activeOrganization.timezone,
        description: activeOrganization.description,
        phone: activeOrganization.phone,
        email: activeOrganization.email,
        address: activeOrganization.address,
        logoUrl: asset.url,
      });
      await refetch();
      setSuccessMessage(`Set "${asset.filename}" as primary clinic photo.`);
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Unable to set primary photo.",
      );
    }
  };

  const handleDelete = async (asset: UploadedAsset) => {
    try {
      await deleteFileMutation.mutateAsync({ key: asset.key });
      setRecentAssets((prev) => prev.filter((a) => a.key !== asset.key));
      setSuccessMessage(`Removed "${asset.filename}".`);
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Unable to remove photo.",
      );
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <Card className="border-border shadow-none">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Camera className="size-4 text-primary" /> Practice Photo Gallery
            </CardTitle>
            <CardDescription className="text-xs">
              Upload and showcase photos of your clinic (reception, treatment
              operatories, doctor consultations, exterior).
            </CardDescription>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-[3px] border border-border self-start sm:self-auto capitalize">
            <FolderTree className="size-3.5 text-primary" />
            <span>Category: {selectedFolder}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {uploadError && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertDescription>{uploadError}</AlertDescription>
          </Alert>
        )}

        {successMessage && (
          <Alert variant="success">
            <CheckCircle2 className="size-4" />
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        )}

        {/* Upload Action Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-[4px] bg-muted/30 border border-border">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-foreground">
              Photo Category:
            </span>
            <div className="inline-flex rounded-[3px] border border-border bg-background p-0.5 text-xs">
              {(["photos", "logo", "documents"] as const).map((folder) => (
                <button
                  key={folder}
                  type="button"
                  onClick={() => setSelectedFolder(folder)}
                  className={`px-2.5 py-1 rounded-[2px] text-xs font-medium capitalize transition-colors ${
                    selectedFolder === folder
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {folder === "photos"
                    ? "Clinic Photos"
                    : folder === "logo"
                      ? "Branding"
                      : "Documents"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              id="gallery-file-input"
              disabled={isUploading}
            />
            <Button
              type="button"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="gap-1.5 text-xs font-semibold w-full sm:w-auto"
            >
              {isUploading ? (
                <>
                  <Spinner className="size-3.5" /> Uploading photo...
                </>
              ) : (
                <>
                  <Upload className="size-3.5" /> Upload Photo
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Photos Grid */}
        {recentAssets.length === 0 ? (
          <div className="border border-dashed border-border rounded-[4px] p-8 text-center bg-card flex flex-col items-center justify-center gap-2">
            <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <Camera className="size-5" />
            </div>
            <h4 className="text-sm font-semibold text-foreground">
              No photos uploaded yet in this session
            </h4>
            <p className="text-xs text-muted-foreground max-w-sm">
              Upload photos of your clinic (PNG, JPEG, WebP, SVG up to 5MB) to
              personalize your practice profile and patient booking page.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {recentAssets.map((asset) => {
              const isCurrentLogo = activeOrganization?.logoUrl === asset.url;
              return (
                <div
                  key={asset.key}
                  className="rounded-[4px] border border-border bg-card overflow-hidden flex flex-col transition-all hover:border-primary/40"
                >
                  <div className="relative aspect-video bg-muted/40 flex items-center justify-center overflow-hidden border-b border-border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={asset.viewUrl || asset.url}
                      alt={asset.filename}
                      className="size-full object-cover"
                    />
                    {isCurrentLogo && (
                      <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-[2px] bg-primary text-primary-foreground text-[10px] font-semibold flex items-center gap-1 shadow-sm">
                        <Star className="size-3 fill-current" /> Primary Clinic
                        Photo
                      </span>
                    )}
                  </div>

                  <div className="p-3 space-y-2 flex-1 flex flex-col justify-between">
                    <div>
                      <h5
                        className="text-xs font-semibold text-foreground truncate"
                        title={asset.filename}
                      >
                        {asset.filename}
                      </h5>
                      <span className="text-[11px] text-muted-foreground">
                        {(asset.size / 1024).toFixed(1)} KB •{" "}
                        {asset.uploadedAt.toLocaleTimeString()}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-border flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          title="Copy Photo Link"
                          onClick={() => handleCopy(asset.url, asset.key)}
                        >
                          <Copy className="size-3 text-muted-foreground" />
                        </Button>
                        {copiedKey === asset.key && (
                          <span className="text-[10px] text-primary font-medium">
                            Copied
                          </span>
                        )}

                        <a
                          href={asset.viewUrl || asset.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex size-6 items-center justify-center rounded-[2px] hover:bg-muted text-muted-foreground hover:text-foreground"
                          title="Open full photo"
                        >
                          <ExternalLink className="size-3" />
                        </a>
                      </div>

                      <div className="flex items-center gap-1">
                        {!isCurrentLogo && (
                          <Button
                            type="button"
                            variant="outline"
                            size="xs"
                            className="gap-1 text-[11px]"
                            onClick={() => handleSetPrimary(asset)}
                            disabled={updateProfileMutation.isPending}
                          >
                            <Star className="size-3" /> Set Primary
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          className="text-destructive hover:text-destructive"
                          title="Remove Photo"
                          onClick={() => handleDelete(asset)}
                          disabled={deleteFileMutation.isPending}
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
