"use client";

import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc/client";
import {
  Credenza,
  CredenzaContent,
  CredenzaHeader,
  CredenzaTitle,
  CredenzaDescription,
  CredenzaBody,
  CredenzaFooter,
} from "@/components/ui/credenza";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Upload,
  FileText,
  FileCode,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from "lucide-react";

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (documentId: string) => void;
}

export function DocumentUploadModal({
  isOpen,
  onClose,
  onSuccess,
}: Readonly<DocumentUploadModalProps>) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = trpc.knowledge.upload.useMutation();

  const handleFileChange = (file: File) => {
    setErrorMsg(null);
    const validExtensions = [".pdf", ".docx", ".txt", ".md"];
    const lowerName = file.name.toLowerCase();
    const hasValidExt = validExtensions.some((ext) => lowerName.endsWith(ext));

    if (!hasValidExt) {
      setErrorMsg(
        "Unsupported file format. Please choose a PDF, DOCX, TXT, or MD file.",
      );
      setSelectedFile(null);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg("File size exceeds 10MB limit.");
      setSelectedFile(null);
      return;
    }

    if (file.size === 0) {
      setErrorMsg("File is empty.");
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile) return;

    setErrorMsg(null);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Content = (reader.result as string).split(",")[1];
        if (!base64Content) {
          setErrorMsg("Could not read file data.");
          return;
        }

        const getResolvedMimeType = (
          file: File,
        ):
          | "application/pdf"
          | "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          | "text/plain"
          | "text/markdown" => {
          const lower = file.name.toLowerCase();
          if (lower.endsWith(".docx")) {
            return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
          }
          if (lower.endsWith(".md") || lower.endsWith(".markdown")) {
            return "text/markdown";
          }
          if (lower.endsWith(".txt")) {
            return "text/plain";
          }
          return "application/pdf";
        };

        try {
          const result = await uploadMutation.mutateAsync({
            name: selectedFile.name,
            mimeType: getResolvedMimeType(selectedFile),
            sizeBytes: selectedFile.size,
            fileBase64: base64Content,
          });

          setSelectedFile(null);
          onClose();
          onSuccess(result.id);
        } catch (err: unknown) {
          setErrorMsg(
            err instanceof Error ? err.message : "Failed to upload document.",
          );
        }
      };

      reader.readAsDataURL(selectedFile);
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : "Failed to process file.",
      );
    }
  };

  let dropzoneStatusClasses =
    "border-border hover:border-primary/50 bg-muted/20";
  if (isDragging) {
    dropzoneStatusClasses = "border-primary bg-primary/5";
  } else if (selectedFile) {
    dropzoneStatusClasses = "border-emerald-600/50 bg-emerald-500/5";
  }

  return (
    <Credenza open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <CredenzaContent className="sm:max-w-md">
        <CredenzaHeader>
          <div className="size-8 rounded-[3px] bg-primary/10 text-primary flex items-center justify-center mb-1">
            <Upload className="size-4" />
          </div>
          <CredenzaTitle className="text-base font-bold text-foreground">
            Upload Clinic Document
          </CredenzaTitle>
          <CredenzaDescription className="text-xs text-muted-foreground">
            Ingest pricing sheets, insurance FAQs, clinical procedures, or
            clinic policies into your organization knowledge base.
          </CredenzaDescription>
        </CredenzaHeader>

        <CredenzaBody className="space-y-4 py-3">
          {errorMsg && (
            <Alert
              variant="destructive"
              className="py-2 px-3 text-xs rounded-[3px]"
            >
              <AlertCircle className="size-3.5" />
              <AlertDescription>{errorMsg}</AlertDescription>
            </Alert>
          )}

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt,.md"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                handleFileChange(e.target.files[0]);
              }
            }}
          />

          {/* Dropzone */}
          <button
            type="button"
            aria-label={
              selectedFile
                ? `Change file: ${selectedFile.name}`
                : "Upload document. Click or drag and drop a file here"
            }
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`w-full border-2 border-dashed rounded-[4px] p-6 text-center cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ${dropzoneStatusClasses}`}
          >
            {selectedFile ? (
              <div className="space-y-2">
                <div className="size-9 rounded-[3px] bg-emerald-500/10 text-emerald-600 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="size-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground truncate max-w-[260px] sm:max-w-[280px] mx-auto">
                    {selectedFile.name}
                  </p>
                  <p className="text-[11px] font-mono text-muted-foreground">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Click or tap to choose a different file
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="size-9 rounded-[3px] bg-primary/10 text-primary mx-auto flex items-center justify-center">
                  <Upload className="size-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">
                    Click or tap to browse file
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Supported: PDF, DOCX, TXT, MD (Max 10MB)
                  </p>
                </div>
              </div>
            )}
          </button>

          {/* Format Badges */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <span className="inline-flex items-center gap-1 text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded-[2px] border border-border">
              <FileText className="size-2.5 text-primary" /> PDF / DOCX
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded-[2px] border border-border">
              <FileCode className="size-2.5 text-primary" /> TXT / MD
            </span>
          </div>
        </CredenzaBody>

        <CredenzaFooter className="pt-3 border-t border-border flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={uploadMutation.isPending}
            className="text-xs w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleUploadSubmit}
            disabled={!selectedFile || uploadMutation.isPending}
            className="text-xs gap-1.5 font-semibold w-full sm:w-auto"
          >
            {uploadMutation.isPending ? (
              <>
                <Loader2 className="size-3 animate-spin" /> Ingesting &
                Extracting...
              </>
            ) : (
              <>
                <Upload className="size-3" /> Upload & Extract
              </>
            )}
          </Button>
        </CredenzaFooter>
      </CredenzaContent>
    </Credenza>
  );
}
