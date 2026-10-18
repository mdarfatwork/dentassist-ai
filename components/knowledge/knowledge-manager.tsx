"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { StatusIndicator } from "@/components/workspace/status-indicator";
import { EmptyState } from "@/components/workspace/empty-state";
import { DocumentUploadModal } from "./document-upload-modal";
import { MarkdownEditor } from "./markdown-editor";
import {
  Credenza,
  CredenzaContent,
  CredenzaHeader,
  CredenzaTitle,
  CredenzaDescription,
  CredenzaFooter,
} from "@/components/ui/credenza";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  BookOpen,
  Upload,
  FileText,
  FileCode,
  RotateCcw,
  Trash2,
  Edit,
  Loader2,
  AlertCircle,
  MoreHorizontal,
} from "lucide-react";

export type DocumentStatus = "PROCESSING" | "REVIEW" | "READY" | "FAILED";

export interface KnowledgeDocumentItem {
  id: string;
  organizationId: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  status: DocumentStatus;
  chunkCount: number;
  errorMessage: string | null;
  processedAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export function KnowledgeManager() {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);

  const docsQuery = trpc.knowledge.list.useQuery();
  const deleteMutation = trpc.knowledge.delete.useMutation();
  const retryMutation = trpc.knowledge.retry.useMutation();

  const documents: KnowledgeDocumentItem[] =
    (docsQuery.data as KnowledgeDocumentItem[] | undefined) ?? [];

  const handleDelete = async () => {
    if (!deletingDocId) return;
    try {
      await deleteMutation.mutateAsync({ documentId: deletingDocId });
      setDeletingDocId(null);
      await docsQuery.refetch();
    } catch (err: unknown) {
      console.error("Failed to delete document:", err);
    }
  };

  const handleRetry = async (documentId: string) => {
    try {
      await retryMutation.mutateAsync({ documentId });
      await docsQuery.refetch();
    } catch (err: unknown) {
      console.error("Failed to retry document:", err);
    }
  };

  // If a document is opened for Markdown editing / review
  if (editingDocId) {
    return (
      <MarkdownEditor
        documentId={editingDocId}
        onClose={() => {
          setEditingDocId(null);
          docsQuery.refetch();
        }}
        onProcessed={() => {
          setEditingDocId(null);
          docsQuery.refetch();
        }}
      />
    );
  }

  const renderDocumentsContent = () => {
    if (docsQuery.isLoading) {
      return (
        <div className="p-12 flex flex-col items-center justify-center gap-3">
          <Loader2 className="size-5 text-primary animate-spin" />
          <span className="text-xs text-muted-foreground font-mono">
            Loading knowledge documents...
          </span>
        </div>
      );
    }

    if (documents.length === 0) {
      return (
        <div className="p-8">
          <EmptyState
            icon={<BookOpen className="size-6 text-primary" />}
            title="No clinic documents uploaded"
            description="Upload practice brochures, price lists, insurance FAQs, or clinic policies to ground DentAssist AI in your clinic's actual procedures."
            action={
              <Button
                size="sm"
                onClick={() => setIsUploadModalOpen(true)}
                className="gap-2 text-xs font-semibold"
              >
                <Upload className="size-3.5" /> Upload Document
              </Button>
            }
          />
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">
              <th className="py-3 px-4 font-semibold">Document</th>
              <th className="py-3 px-4 font-semibold">Status</th>
              <th className="py-3 px-4 font-semibold">Uploaded</th>
              <th className="py-3 px-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {documents.map((doc) => {
              const isPdf = doc.name.toLowerCase().endsWith(".pdf");
              const isDocx = doc.name.toLowerCase().endsWith(".docx");

              return (
                <tr
                  key={doc.id}
                  className="hover:bg-muted/20 transition-colors"
                >
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        {isPdf || isDocx ? (
                          <FileText className="size-4" />
                        ) : (
                          <FileCode className="size-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="font-semibold text-foreground truncate block max-w-[260px] sm:max-w-md">
                          {doc.name}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {isPdf
                            ? "PDF Document"
                            : isDocx
                              ? "Word Document"
                              : "Text Document"}
                        </span>
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {doc.status === "PROCESSING" && (
                      <StatusIndicator
                        status="active"
                        label="Processing"
                        sublabel="Extracting content"
                      />
                    )}
                    {doc.status === "REVIEW" && (
                      <StatusIndicator
                        status="warning"
                        label="In Review"
                        sublabel="Markdown ready"
                      />
                    )}
                    {doc.status === "READY" && (
                      <StatusIndicator
                        status="success"
                        label="Ready"
                        sublabel="Grounded in AI"
                      />
                    )}
                    {doc.status === "FAILED" && (
                      <div className="flex flex-col gap-0.5">
                        <StatusIndicator status="destructive" label="Failed" />
                        {doc.errorMessage && (
                          <span
                            className="text-[10px] text-destructive truncate max-w-[180px]"
                            title={doc.errorMessage}
                          >
                            {doc.errorMessage}
                          </span>
                        )}
                      </div>
                    )}
                  </td>

                  <td className="py-3.5 px-4 font-mono text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(doc.createdAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>

                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label="Document actions"
                            className="size-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                          />
                        }
                      >
                        <MoreHorizontal className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="w-44 p-1 shadow-md"
                      >
                        {(doc.status === "READY" ||
                          doc.status === "REVIEW") && (
                          <DropdownMenuItem
                            onClick={() => setEditingDocId(doc.id)}
                            className="gap-2 text-xs cursor-pointer"
                          >
                            <Edit className="size-3.5 text-primary" />
                            <span>
                              {doc.status === "REVIEW"
                                ? "Review Content"
                                : "Edit Content"}
                            </span>
                          </DropdownMenuItem>
                        )}

                        {doc.status === "FAILED" && (
                          <DropdownMenuItem
                            onClick={() => handleRetry(doc.id)}
                            disabled={retryMutation.isPending}
                            className="gap-2 text-xs cursor-pointer"
                          >
                            <RotateCcw className="size-3.5 text-primary" />
                            <span>Reprocess Document</span>
                          </DropdownMenuItem>
                        )}

                        <DropdownMenuSeparator className="my-1" />

                        <DropdownMenuItem
                          onClick={() => setDeletingDocId(doc.id)}
                          className="gap-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                        >
                          <Trash2 className="size-3.5" />
                          <span>Delete Document</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Knowledge Base Header Bar */}
      <div className="rounded-xl border border-border bg-card p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1 max-w-2xl">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Knowledge Base
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Manage the documents your AI receptionist uses to answer
            clinic-specific questions.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setIsUploadModalOpen(true)}
          className="gap-2 text-xs font-semibold shrink-0 shadow-xs"
        >
          <Upload className="size-4" /> Upload Document
        </Button>
      </div>

      {/* Main Content: Documents Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
        {renderDocumentsContent()}
      </div>

      {/* Upload Modal */}
      <DocumentUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={(documentId) => {
          docsQuery.refetch();
          setEditingDocId(documentId);
        }}
      />

      {/* Delete Confirmation Credenza */}
      <Credenza
        open={Boolean(deletingDocId)}
        onOpenChange={(open) => !open && setDeletingDocId(null)}
      >
        <CredenzaContent className="sm:max-w-md">
          <CredenzaHeader>
            <div className="size-8 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center mb-1">
              <AlertCircle className="size-4" />
            </div>
            <CredenzaTitle className="text-sm font-bold text-foreground">
              Delete Document
            </CredenzaTitle>
            <CredenzaDescription className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to delete this document? This will remove
              the file, canonical Markdown, and all vector embeddings from the
              Knowledge Base.
            </CredenzaDescription>
          </CredenzaHeader>

          <CredenzaFooter className="pt-3 border-t border-border flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeletingDocId(null)}
              className="text-xs w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="text-xs font-semibold gap-1.5 w-full sm:w-auto"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <Trash2 className="size-3" />
              )}
              Confirm Delete
            </Button>
          </CredenzaFooter>
        </CredenzaContent>
      </Credenza>
    </div>
  );
}
