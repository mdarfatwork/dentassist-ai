"use client";

import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Heading1,
  Heading2,
  Heading3,
  Bold,
  Italic,
  List,
  Table,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Eye,
  Edit3,
  Cpu,
  ArrowLeft,
} from "lucide-react";

interface MarkdownEditorProps {
  documentId: string;
  onClose: () => void;
  onProcessed?: () => void;
}

export function MarkdownEditor({
  documentId,
  onClose,
  onProcessed,
}: Readonly<MarkdownEditorProps>) {
  const [markdown, setMarkdown] = useState("");
  const [syncedDoc, setSyncedDoc] = useState<{
    id: string;
    content: string;
  } | null>(null);
  const [activeView, setActiveView] = useState<"split" | "edit" | "preview">(
    "split",
  );
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const docQuery = trpc.knowledge.get.useQuery({ documentId });
  const updateMutation = trpc.knowledge.updateMarkdown.useMutation();
  const processMutation = trpc.knowledge.process.useMutation();

  if (
    docQuery.data?.markdownContent !== undefined &&
    (syncedDoc?.id !== documentId ||
      syncedDoc?.content !== docQuery.data.markdownContent)
  ) {
    setSyncedDoc({ id: documentId, content: docQuery.data.markdownContent });
    setMarkdown(docQuery.data.markdownContent);
  }

  // Insert markdown formatting at cursor position
  const insertFormatting = (prefix: string, suffix = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    const replacement = `${prefix}${selectedText || "text"}${suffix}`;

    const newMarkdown =
      textarea.value.substring(0, start) +
      replacement +
      textarea.value.substring(end);

    setMarkdown(newMarkdown);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + (selectedText.length || 4),
      );
    }, 0);
  };

  const handleSave = async () => {
    setNotification(null);
    try {
      await updateMutation.mutateAsync({
        documentId,
        markdown,
      });
      setNotification({
        type: "success",
        message: "Canonical Markdown saved successfully.",
      });
      await docQuery.refetch();
    } catch (err: unknown) {
      setNotification({
        type: "error",
        message:
          err instanceof Error ? err.message : "Failed to save Markdown.",
      });
    }
  };

  const handleSaveAndProcess = async () => {
    setNotification(null);
    try {
      // 1. Save markdown first
      await updateMutation.mutateAsync({
        documentId,
        markdown,
      });

      // 2. Trigger chunking + embedding + Pinecone indexing
      await processMutation.mutateAsync({
        documentId,
      });

      setNotification({
        type: "success",
        message:
          "Document chunked, embedded, and indexed into Pinecone successfully!",
      });

      await docQuery.refetch();
      if (onProcessed) {
        onProcessed();
      }
    } catch (err: unknown) {
      setNotification({
        type: "error",
        message: err instanceof Error ? err.message : "Processing failed.",
      });
    }
  };

  // Convert markdown to clean rendered preview
  const renderSimpleMarkdown = (content: string) => {
    if (!content.trim()) {
      return (
        <p className="text-muted-foreground italic text-xs">
          No content to preview.
        </p>
      );
    }

    const lines = content.split("\n");
    return (
      <div className="space-y-2 text-xs text-foreground leading-relaxed">
        {lines.map((line, idx) => {
          if (line.startsWith("# ")) {
            return (
              <h1
                key={idx}
                className="text-base font-bold text-foreground mt-4 pb-1 border-b border-border"
              >
                {line.replace(/^# /, "")}
              </h1>
            );
          }
          if (line.startsWith("## ")) {
            return (
              <h2
                key={idx}
                className="text-sm font-bold text-foreground mt-3 pb-0.5"
              >
                {line.replace(/^## /, "")}
              </h2>
            );
          }
          if (line.startsWith("### ")) {
            return (
              <h3
                key={idx}
                className="text-xs font-semibold text-foreground mt-2"
              >
                {line.replace(/^### /, "")}
              </h3>
            );
          }
          if (line.startsWith("- ") || line.startsWith("* ")) {
            return (
              <li key={idx} className="ml-4 list-disc text-muted-foreground">
                {line.replace(/^[-*] /, "")}
              </li>
            );
          }
          if (line.trim() === "") {
            return <div key={idx} className="h-1.5" />;
          }
          return (
            <p key={idx} className="text-muted-foreground">
              {line}
            </p>
          );
        })}
      </div>
    );
  };

  if (docQuery.isLoading) {
    return (
      <div className="rounded-[4px] border border-border bg-card p-12 flex flex-col items-center justify-center gap-3">
        <Loader2 className="size-5 text-primary animate-spin" />
        <span className="text-xs text-muted-foreground font-mono">
          Loading canonical document...
        </span>
      </div>
    );
  }

  const doc = docQuery.data;

  return (
    <div className="space-y-4">
      {/* Editor Header */}
      <div className="rounded-[4px] border border-border bg-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 px-2 text-muted-foreground hover:text-foreground gap-1"
          >
            <ArrowLeft className="size-3.5" /> Back
          </Button>

          <div className="h-4 w-px bg-border hidden sm:block" />

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-foreground truncate max-w-[280px] sm:max-w-md">
                {doc?.name}
              </h2>
              <Badge
                variant={
                  doc?.status === "READY"
                    ? "success"
                    : doc?.status === "REVIEW"
                      ? "warning"
                      : doc?.status === "FAILED"
                        ? "destructive"
                        : "secondary"
                }
                className="text-[10px] font-mono px-1.5 uppercase"
              >
                {doc?.status}
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Review and edit the extracted Markdown before it is chunked and
              embedded into Pinecone.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center border border-border rounded-[3px] bg-muted/20 p-0.5">
            <button
              type="button"
              onClick={() => setActiveView("edit")}
              className={`px-2 py-1 text-[11px] font-medium rounded-[2px] transition-colors ${
                activeView === "edit"
                  ? "bg-card text-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Edit3 className="size-3 inline mr-1" /> Source
            </button>
            <button
              type="button"
              onClick={() => setActiveView("split")}
              className={`hidden md:block px-2 py-1 text-[11px] font-medium rounded-[2px] transition-colors ${
                activeView === "split"
                  ? "bg-card text-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Split View
            </button>
            <button
              type="button"
              onClick={() => setActiveView("preview")}
              className={`px-2 py-1 text-[11px] font-medium rounded-[2px] transition-colors ${
                activeView === "preview"
                  ? "bg-card text-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Eye className="size-3 inline mr-1" /> Preview
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={updateMutation.isPending || processMutation.isPending}
            className="text-xs font-semibold h-8"
          >
            {updateMutation.isPending ? (
              <Loader2 className="size-3 animate-spin mr-1" />
            ) : null}
            Save Draft
          </Button>

          <Button
            size="sm"
            onClick={handleSaveAndProcess}
            disabled={updateMutation.isPending || processMutation.isPending}
            className="text-xs font-semibold h-8 gap-1.5"
          >
            {processMutation.isPending ? (
              <>
                <Loader2 className="size-3 animate-spin" /> Chunking &
                Indexing...
              </>
            ) : (
              <>
                <Cpu className="size-3" /> Save & Process
              </>
            )}
          </Button>
        </div>
      </div>

      {notification && (
        <Alert
          variant={notification.type === "error" ? "destructive" : "default"}
          className={`py-2 px-3 text-xs rounded-[3px] ${
            notification.type === "success"
              ? "border-emerald-600/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
              : ""
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 className="size-3.5 text-emerald-600" />
          ) : (
            <AlertCircle className="size-3.5" />
          )}
          <AlertDescription>{notification.message}</AlertDescription>
        </Alert>
      )}

      {/* Editor Body */}
      <div className="rounded-[4px] border border-border bg-card overflow-hidden">
        {/* Formatting Toolbar */}
        <div className="border-b border-border bg-muted/30 px-3 py-1.5 flex flex-wrap items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => insertFormatting("# ")}
            className="h-7 px-2 text-xs font-mono"
            title="Heading 1"
          >
            <Heading1 className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => insertFormatting("## ")}
            className="h-7 px-2 text-xs font-mono"
            title="Heading 2"
          >
            <Heading2 className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => insertFormatting("### ")}
            className="h-7 px-2 text-xs font-mono"
            title="Heading 3"
          >
            <Heading3 className="size-3.5" />
          </Button>

          <div className="h-4 w-px bg-border mx-1" />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => insertFormatting("**", "**")}
            className="h-7 px-2 text-xs"
            title="Bold"
          >
            <Bold className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => insertFormatting("*", "*")}
            className="h-7 px-2 text-xs"
            title="Italic"
          >
            <Italic className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => insertFormatting("- ")}
            className="h-7 px-2 text-xs"
            title="Unordered List"
          >
            <List className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() =>
              insertFormatting(
                "| Service | Duration | Price |\n| :--- | :--- | :--- |\n| Cleaning | 30m | ₹1,500 |\n",
              )
            }
            className="h-7 px-2 text-xs"
            title="Table Template"
          >
            <Table className="size-3.5" />
          </Button>

          <div className="ml-auto flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
            <span>{markdown.length} chars</span>
            <span>•</span>
            <span>~{Math.round(markdown.length / 4)} tokens</span>
          </div>
        </div>

        {/* Split / Single View Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border min-h-[500px]">
          {/* Editor Pane */}
          {(activeView === "split" || activeView === "edit") && (
            <div
              className={`p-4 flex flex-col ${activeView === "edit" ? "md:col-span-2" : ""}`}
            >
              <span className="text-[11px] font-mono uppercase text-muted-foreground mb-2 flex items-center justify-between">
                <span>Canonical Markdown Source</span>
                <span className="text-[10px] text-muted-foreground">UTF-8</span>
              </span>
              <textarea
                ref={textareaRef}
                value={markdown}
                onChange={(e) => setMarkdown(e.target.value)}
                placeholder="# Clinic Services..."
                className="w-full flex-1 min-h-[420px] font-mono text-xs p-3 rounded-[3px] border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-y"
                spellCheck={false}
              />
            </div>
          )}

          {/* Preview Pane */}
          {(activeView === "split" || activeView === "preview") && (
            <div
              className={`p-4 flex flex-col bg-muted/10 ${activeView === "preview" ? "md:col-span-2" : ""}`}
            >
              <span className="text-[11px] font-mono uppercase text-muted-foreground mb-2">
                Live Rendered Preview
              </span>
              <div className="w-full flex-1 min-h-[420px] p-4 rounded-[3px] border border-border bg-card overflow-y-auto max-h-[600px]">
                {renderSimpleMarkdown(markdown)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
