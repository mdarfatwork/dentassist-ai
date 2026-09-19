"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusIndicator } from "@/components/workspace/status-indicator";
import { EmptyState } from "@/components/workspace/empty-state";
import { DocumentUploadModal } from "./document-upload-modal";
import { MarkdownEditor } from "./markdown-editor";
import { KnowledgePlayground } from "./knowledge-playground";
import {
  Credenza,
  CredenzaContent,
  CredenzaHeader,
  CredenzaTitle,
  CredenzaDescription,
  CredenzaFooter,
} from "@/components/ui/credenza";
import {
  BookOpen,
  Upload,
  Sparkles,
  FileText,
  FileCode,
  RotateCcw,
  Trash2,
  Edit,
  Loader2,
  AlertCircle,
  Database,
  Layers,
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
  const [activeTab, setActiveTab] = useState<"documents" | "playground">(
    "documents",
  );
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);

  const docsQuery = trpc.knowledge.list.useQuery();
  const deleteMutation = trpc.knowledge.delete.useMutation();
  const retryMutation = trpc.knowledge.retry.useMutation();

  const documents: KnowledgeDocumentItem[] =
    (docsQuery.data as KnowledgeDocumentItem[] | undefined) ?? [];
  const readyCount = documents.filter((d) => d.status === "READY").length;
  const reviewCount = documents.filter((d) => d.status === "REVIEW").length;
  const processingCount = documents.filter(
    (d) => d.status === "PROCESSING",
  ).length;
  const failedCount = documents.filter((d) => d.status === "FAILED").length;
  const totalChunks = documents.reduce(
    (sum, d) => sum + (d.chunkCount ?? 0),
    0,
  );

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
            title="No clinic knowledge documents yet"
            description="Upload treatment brochures, price lists, insurance FAQs, or clinic policies to ground DentAssist AI in your clinic's actual procedures."
            action={
              <Button
                size="sm"
                onClick={() => setIsUploadModalOpen(true)}
                className="gap-1.5 text-xs font-semibold"
              >
                <Upload className="size-3.5" /> Upload First Document
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
            <tr className="border-b border-border bg-muted/30 text-muted-foreground font-mono text-[11px] uppercase">
              <th className="py-2.5 px-4 font-semibold">Document</th>
              <th className="py-2.5 px-4 font-semibold">Status</th>
              <th className="py-2.5 px-4 font-semibold">Chunks</th>
              <th className="py-2.5 px-4 font-semibold">Size</th>
              <th className="py-2.5 px-4 font-semibold">Uploaded</th>
              <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
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
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="size-7 rounded-[3px] bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        {isPdf || isDocx ? (
                          <FileText className="size-3.5" />
                        ) : (
                          <FileCode className="size-3.5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="font-semibold text-foreground truncate block max-w-[240px] sm:max-w-xs">
                          {doc.name}
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground">
                          ID: {doc.id.slice(0, 10)}...
                        </span>
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    {doc.status === "PROCESSING" && (
                      <StatusIndicator
                        status="active"
                        label="Processing"
                        sublabel="Extracting"
                      />
                    )}
                    {doc.status === "REVIEW" && (
                      <StatusIndicator
                        status="warning"
                        label="In Review"
                        sublabel="Edit Markdown"
                      />
                    )}
                    {doc.status === "READY" && (
                      <StatusIndicator
                        status="success"
                        label="Ready"
                        sublabel={`${doc.chunkCount} vectors`}
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

                  <td className="py-3 px-4 font-mono text-[11px] tabular-nums">
                    {doc.status === "READY" ? (
                      <span className="font-semibold text-foreground">
                        {doc.chunkCount} chunks
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>

                  <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground tabular-nums">
                    {(doc.sizeBytes / 1024).toFixed(1)} KB
                  </td>

                  <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground">
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </td>

                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {doc.status === "REVIEW" && (
                        <Button
                          size="sm"
                          onClick={() => setEditingDocId(doc.id)}
                          className="h-7 text-[11px] font-semibold gap-1 px-2.5"
                        >
                          <Edit className="size-3" /> Review Markdown
                        </Button>
                      )}

                      {doc.status === "READY" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingDocId(doc.id)}
                          className="h-7 text-[11px] font-semibold gap-1 px-2"
                        >
                          <Edit className="size-3" /> Edit
                        </Button>
                      )}

                      {doc.status === "FAILED" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRetry(doc.id)}
                          disabled={retryMutation.isPending}
                          className="h-7 text-[11px] font-semibold gap-1 px-2"
                        >
                          <RotateCcw className="size-3" /> Retry
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeletingDocId(doc.id)}
                        className="h-7 text-[11px] text-muted-foreground hover:text-destructive px-2"
                        title="Delete document"
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
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
      <div className="rounded-[4px] border border-border bg-card p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[2px] border border-primary/20 bg-primary/10 text-primary text-[11px] font-semibold tracking-tight">
                <BookOpen className="size-3" /> Clinic Knowledge Base & RAG
              </span>
              <Badge variant="outline" className="text-[10px] font-mono">
                Pinecone Isolated
              </Badge>
            </div>

            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
              Clinic Documents & Grounded Knowledge
            </h2>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Upload practice brochures, pricing policies, insurance agreements,
              and FAQs. Extracted content is reviewed in canonical Markdown,
              chunked semantically, and embedded into isolated Pinecone vector
              namespaces.
            </p>

            {/* Status Pills */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 pt-1">
              <span className="inline-flex items-center gap-1 text-[11px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded-[2px] border border-border">
                <Database className="size-3 text-primary" /> {documents.length}{" "}
                Docs
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-800 dark:text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-[2px] border border-emerald-600/20">
                <Layers className="size-3" /> {totalChunks} Chunks ({readyCount}{" "}
                Ready)
              </span>
              {reviewCount > 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] font-mono text-amber-800 dark:text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-[2px] border border-amber-600/20">
                  {reviewCount} In Review
                </span>
              )}
              {processingCount > 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] font-mono text-primary bg-primary/10 px-2 py-0.5 rounded-[2px] border border-primary/20">
                  {processingCount} Processing
                </span>
              )}
              {failedCount > 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] font-mono text-destructive bg-destructive/10 px-2 py-0.5 rounded-[2px] border border-destructive/20">
                  {failedCount} Failed
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto shrink-0">
            {/* View switcher: Documents vs Playground */}
            <div className="grid grid-cols-2 sm:flex sm:items-center border border-border rounded-[3px] bg-muted/20 p-0.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setActiveTab("documents")}
                className={`px-3 py-1.5 text-xs font-medium rounded-[2px] transition-colors flex items-center justify-center ${
                  activeTab === "documents"
                    ? "bg-card text-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Documents ({documents.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("playground")}
                className={`px-3 py-1.5 text-xs font-medium rounded-[2px] transition-colors gap-1.5 flex items-center justify-center ${
                  activeTab === "playground"
                    ? "bg-card text-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Sparkles className="size-3 text-primary" /> RAG Playground
              </button>
            </div>

            <Button
              size="sm"
              onClick={() => setIsUploadModalOpen(true)}
              className="h-8.5 px-3.5 text-xs font-semibold gap-1.5 w-full sm:w-auto justify-center"
            >
              <Upload className="size-3.5" /> Upload Document
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content: Documents Table OR Playground */}
      {activeTab === "playground" ? (
        <KnowledgePlayground />
      ) : (
        <div className="rounded-[4px] border border-border bg-card overflow-hidden">
          {renderDocumentsContent()}
        </div>
      )}

      {/* Upload Modal */}
      <DocumentUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={(documentId) => {
          docsQuery.refetch();
          // Immediately open document for review/editing!
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
            <div className="size-8 rounded-[3px] bg-destructive/10 text-destructive flex items-center justify-center mb-1">
              <AlertCircle className="size-4" />
            </div>
            <CredenzaTitle className="text-sm font-bold text-foreground">
              Delete Document
            </CredenzaTitle>
            <CredenzaDescription className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to delete this document? This will purge the
              original file from S3, remove canonical Markdown, delete
              relational chunks from PostgreSQL, and remove all indexed vectors
              from Pinecone.
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
