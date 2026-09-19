"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AIActivity } from "@/components/workspace/ai-activity";
import {
  Sparkles,
  Send,
  ShieldCheck,
  ShieldAlert,
  BookOpen,
  FileText,
  ChevronDown,
  ChevronUp,
  RotateCcw,
} from "lucide-react";

const SUGGESTED_QUERIES = [
  "How long does a dental cleaning take?",
  "What are the clinic's operating hours?",
  "What is the cost for root canal treatment?",
  "Do you accept emergency dental walk-ins?",
];

export function KnowledgePlayground() {
  const [query, setQuery] = useState("");
  const [activeStage, setActiveStage] = useState<
    | "searching_knowledge"
    | "reading_policy"
    | "preparing_response"
    | "action_completed"
    | null
  >(null);
  const [result, setResult] = useState<{
    answer: string;
    sources: Array<{
      documentId: string;
      documentName: string;
      headingPath: string | null;
      pageNumber: number | null;
    }>;
    isSafe: boolean;
    securityNotice?: string;
  } | null>(null);
  const [expandedSources, setExpandedSources] = useState(false);

  const queryMutation = trpc.knowledge.query.useMutation();

  const handleRunQuery = async (questionToRun?: string) => {
    const q = (questionToRun || query).trim();
    if (!q) return;

    setResult(null);
    setActiveStage("searching_knowledge");

    try {
      setTimeout(() => setActiveStage("reading_policy"), 300);
      setTimeout(() => setActiveStage("preparing_response"), 600);

      const response = await queryMutation.mutateAsync({
        query: q,
        topK: 5,
      });

      setActiveStage("action_completed");
      setResult(response);
    } catch (err: unknown) {
      setActiveStage(null);
      setResult({
        answer:
          err instanceof Error
            ? err.message
            : "Failed to query the knowledge base.",
        sources: [],
        isSafe: true,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Playground Header */}
      <div className="rounded-[4px] border border-border bg-card p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[2px] border border-primary/20 bg-primary/10 text-primary text-[11px] font-semibold tracking-tight">
                <Sparkles className="size-3" /> RAG Knowledge Playground
              </span>
              <Badge variant="outline" className="text-[10px] font-mono">
                Llama 3.3 • Prompt Guard 2
              </Badge>
            </div>
            <h3 className="text-base font-bold text-foreground">
              Simulate Clinical AI Retrieval & Responses
            </h3>
            <p className="text-xs text-muted-foreground max-w-2xl">
              Ask questions to test the grounded clinic knowledge base. Queries
              are protected by Meta Llama Prompt Guard 2 and retrieved via
              organization-isolated Pinecone namespaces.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground font-mono bg-muted/50 border border-border px-2 py-1 rounded-[3px]">
              <ShieldCheck className="size-3 text-emerald-600" /> Tenant Scoped
            </span>
          </div>
        </div>

        {/* Query Input Section */}
        <div className="mt-5 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !queryMutation.isPending) {
                    handleRunQuery();
                  }
                }}
                placeholder="Ask about dental procedures, fees, hours, or policies..."
                className="w-full h-9 px-3 text-xs rounded-[3px] border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-sans"
              />
            </div>

            <Button
              size="sm"
              onClick={() => handleRunQuery()}
              disabled={!query.trim() || queryMutation.isPending}
              className="h-9 px-4 text-xs font-semibold gap-1.5 shrink-0"
            >
              <Send className="size-3" /> Run Query
            </Button>
          </div>

          {/* Preset Queries */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] text-muted-foreground mr-1">
              Suggestions:
            </span>
            {SUGGESTED_QUERIES.map((sq) => (
              <button
                key={sq}
                type="button"
                onClick={() => {
                  setQuery(sq);
                  handleRunQuery(sq);
                }}
                className="text-[11px] font-sans px-2 py-0.5 rounded-[2px] border border-border bg-muted/30 hover:bg-muted/60 text-foreground transition-colors"
              >
                {sq}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Real-time AI Activity Stage */}
      {activeStage && (
        <AIActivity
          stage={activeStage}
          timestamp={new Date().toLocaleTimeString()}
        />
      )}

      {/* Answer & Source Citations Display */}
      {result && (
        <div className="rounded-[4px] border border-border bg-card overflow-hidden">
          {/* Security Notice Banner if flagged */}
          {!result.isSafe && (
            <Alert
              variant="destructive"
              className="rounded-none border-b border-destructive/30 py-2.5 px-4"
            >
              <ShieldAlert className="size-4" />
              <AlertDescription className="text-xs">
                <strong>Safety Alert:</strong>{" "}
                {result.securityNotice ||
                  "Input was flagged by Meta Llama Prompt Guard 2 as a potential prompt injection."}
              </AlertDescription>
            </Alert>
          )}

          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="size-6 rounded-[3px] bg-primary/10 text-primary flex items-center justify-center">
                  <BookOpen className="size-3.5" />
                </div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Clinical AI Answer
                </h4>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setResult(null);
                  setQuery("");
                }}
                className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1"
              >
                <RotateCcw className="size-3" /> Clear
              </Button>
            </div>

            {/* Answer Content */}
            <div className="text-xs leading-relaxed text-foreground whitespace-pre-wrap font-sans bg-muted/10 p-4 rounded-[3px] border border-border/60">
              {result.answer}
            </div>

            {/* Source Citations Section */}
            {result.sources.length > 0 && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <FileText className="size-3.5 text-primary" />
                    <span>
                      Verified Knowledge Sources ({result.sources.length})
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setExpandedSources(!expandedSources)}
                    className="text-[11px] text-primary hover:underline flex items-center gap-1 font-medium"
                  >
                    {expandedSources ? (
                      <>
                        Hide Details <ChevronUp className="size-3" />
                      </>
                    ) : (
                      <>
                        Inspect Sources <ChevronDown className="size-3" />
                      </>
                    )}
                  </button>
                </div>

                {/* Source Badges */}
                <div className="flex flex-wrap gap-1.5">
                  {result.sources.map((src) => (
                    <span
                      key={`${src.documentId}:${src.headingPath ?? ""}:${src.pageNumber ?? ""}`}
                      className="inline-flex items-center gap-1.5 text-[11px] font-mono px-2 py-0.5 rounded-[2px] bg-muted border border-border text-foreground"
                    >
                      <span className="size-1 rounded-full bg-primary" />
                      <span className="font-semibold">{src.documentName}</span>
                      {src.headingPath && (
                        <span className="text-muted-foreground font-sans">
                          • {src.headingPath}
                        </span>
                      )}
                      {Boolean(src.pageNumber) && (
                        <span className="text-muted-foreground">
                          (p. {src.pageNumber})
                        </span>
                      )}
                    </span>
                  ))}
                </div>

                {/* Detailed Source Breakdown */}
                {expandedSources && (
                  <div className="border border-border divide-y divide-border rounded-[3px] bg-muted/20 mt-2">
                    {result.sources.map((src) => (
                      <div
                        key={`${src.documentId}:${src.headingPath ?? ""}:${src.pageNumber ?? ""}`}
                        className="p-3 space-y-1 text-xs"
                      >
                        <div className="flex items-center justify-between font-mono text-[11px]">
                          <span className="font-semibold text-foreground">
                            {src.documentName}
                          </span>
                          <span className="text-muted-foreground">
                            {src.pageNumber
                              ? `Page ${src.pageNumber}`
                              : "Single Page"}
                          </span>
                        </div>
                        {src.headingPath && (
                          <p className="text-[11px] text-primary font-medium">
                            Section: {src.headingPath}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
