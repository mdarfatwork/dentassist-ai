"use client";

import { useState } from "react";
import { type AITrace, type AITraceEvent } from "@/lib/receptionist/trace";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldAlert,
  Clock,
  Layers,
  FileText,
  Wrench,
  AlertOctagon,
  ChevronDown,
  ChevronRight,
  Cpu,
  Hash,
  Copy,
  Check,
  Zap,
} from "lucide-react";

interface DebugPanelProps {
  trace: AITrace | null;
  isLoading?: boolean;
}

export function DebugPanel({ trace, isLoading }: DebugPanelProps) {
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [expandedEvents, setExpandedEvents] = useState<Record<string, boolean>>(
    {},
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const toggleEvent = (id: string) => {
    setExpandedEvents((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text: string, id: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-3 bg-card border border-border rounded-[4px]">
        <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-xs font-semibold text-foreground">
          Executing AI Receptionist Core...
        </p>
        <p className="text-[11px] text-muted-foreground font-mono">
          Measuring monotonic pipeline latencies & tracing events
        </p>
      </div>
    );
  }

  if (!trace) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-3 bg-card border border-border rounded-[4px]">
        <div className="size-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
          <Activity className="size-5" />
        </div>
        <div className="space-y-1">
          <h3 className="text-xs font-bold text-foreground">
            No Execution Trace Selected
          </h3>
          <p className="text-[11px] text-muted-foreground max-w-xs">
            Send a message or execute a voice turn to observe the real AI Core
            pipeline execution trace, retrieval metrics, and tool calls.
          </p>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: AITrace["status"]) => {
    switch (status) {
      case "success":
        return (
          <Badge variant="success" className="gap-1 text-[10px] px-2 py-0.5">
            <CheckCircle2 className="size-3" /> Success
          </Badge>
        );
      case "partial_success":
        return (
          <Badge variant="warning" className="gap-1 text-[10px] px-2 py-0.5">
            <AlertTriangle className="size-3" /> Partial Success
          </Badge>
        );
      case "blocked":
        return (
          <Badge
            variant="destructive"
            className="gap-1 text-[10px] px-2 py-0.5"
          >
            <ShieldAlert className="size-3" /> Policy Blocked
          </Badge>
        );
      case "failed":
        return (
          <Badge
            variant="destructive"
            className="gap-1 text-[10px] px-2 py-0.5"
          >
            <XCircle className="size-3" /> Failed
          </Badge>
        );
      default:
        return null;
    }
  };

  const getEventStatusIcon = (status: AITraceEvent["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />;
      case "started":
        return <Clock className="size-3.5 text-primary shrink-0" />;
      case "failed":
        return <XCircle className="size-3.5 text-red-600 shrink-0" />;
      case "blocked":
        return <ShieldAlert className="size-3.5 text-amber-600 shrink-0" />;
      case "skipped":
        return <Layers className="size-3.5 text-muted-foreground shrink-0" />;
    }
  };

  return (
    <div className="h-full flex flex-col bg-card border border-border rounded-[4px] overflow-hidden">
      {/* Trace Top Bar */}
      <div className="border-b border-border bg-muted/40 p-3 sm:px-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="size-6 rounded-[2px] bg-primary/10 text-primary flex items-center justify-center">
            <Activity className="size-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-foreground">
                AI Trace Inspector
              </span>
              <span className="font-mono text-[10px] px-1 py-0.2 rounded-[2px] bg-muted border border-border text-muted-foreground uppercase">
                {trace.channel}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
              <span>Turn: {trace.turnId}</span>
              <span>•</span>
              <button
                type="button"
                onClick={() => copyToClipboard(trace.id, "traceId")}
                className="hover:text-foreground inline-flex items-center gap-0.5"
                title="Copy Trace ID"
              >
                ID: {trace.id.slice(0, 14)}...
                {copiedId === "traceId" ? (
                  <Check className="size-2.5 text-emerald-600" />
                ) : (
                  <Copy className="size-2.5" />
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono font-semibold text-foreground">
            {trace.totalDurationMs.toFixed(1)} ms
          </span>
          {getStatusBadge(trace.status)}
        </div>
      </div>

      {/* Tabs Navigation */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex-1 flex flex-col overflow-hidden"
      >
        <div className="border-b border-border bg-card px-2">
          <TabsList className="h-9 bg-transparent p-0 justify-start gap-1">
            <TabsTrigger
              value="overview"
              className="text-xs py-1.5 px-2.5 rounded-[2px] data-[state=active]:bg-muted data-[state=active]:text-foreground"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="trace"
              className="text-xs py-1.5 px-2.5 rounded-[2px] data-[state=active]:bg-muted data-[state=active]:text-foreground gap-1"
            >
              Trace
              <span className="font-mono text-[9px] px-1 rounded-[2px] bg-muted-foreground/15">
                {trace.events.length}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="sources"
              className="text-xs py-1.5 px-2.5 rounded-[2px] data-[state=active]:bg-muted data-[state=active]:text-foreground gap-1"
            >
              Sources
              {trace.retrievedSources && trace.retrievedSources.length > 0 && (
                <span className="font-mono text-[9px] px-1 rounded-[2px] bg-muted-foreground/15">
                  {trace.retrievedSources.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="tools"
              className="text-xs py-1.5 px-2.5 rounded-[2px] data-[state=active]:bg-muted data-[state=active]:text-foreground gap-1"
            >
              Tools
              {trace.tools.length > 0 && (
                <span className="font-mono text-[9px] px-1 rounded-[2px] bg-muted-foreground/15">
                  {trace.tools.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="errors"
              className="text-xs py-1.5 px-2.5 rounded-[2px] data-[state=active]:bg-muted data-[state=active]:text-foreground gap-1"
            >
              Errors
              {trace.errors.length > 0 && (
                <span className="font-mono text-[9px] px-1 rounded-[2px] bg-red-500/20 text-red-600 font-bold">
                  {trace.errors.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab 1: Overview */}
        <TabsContent
          value="overview"
          className="flex-1 overflow-y-auto p-4 space-y-4 m-0"
        >
          {/* Metadata Cards */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-[3px] border border-border bg-muted/20 space-y-1">
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Zap className="size-3 text-primary" /> Detected Intent
              </span>
              <p className="font-mono font-semibold text-foreground text-[11px]">
                {trace.intent || "GENERAL_QUESTION"}
              </p>
            </div>

            <div className="p-2.5 rounded-[3px] border border-border bg-muted/20 space-y-1">
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Cpu className="size-3 text-primary" /> AI Provider & Model
              </span>
              <p className="font-mono font-semibold text-foreground text-[11px] truncate">
                {trace.provider || "Gemini"} /{" "}
                {trace.model || "gemini-2.5-flash-lite"}
              </p>
            </div>

            <div className="p-2.5 rounded-[3px] border border-border bg-muted/20 space-y-1">
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Clock className="size-3 text-primary" /> End-to-End Latency
              </span>
              <p className="font-mono font-semibold text-foreground text-[11px]">
                {trace.totalDurationMs.toFixed(1)} ms
              </p>
            </div>

            <div className="p-2.5 rounded-[3px] border border-border bg-muted/20 space-y-1">
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Hash className="size-3 text-primary" /> Token Usage
              </span>
              <p className="font-mono text-muted-foreground text-[11px]">
                {trace.tokenUsage?.totalTokens
                  ? `${trace.tokenUsage.totalTokens} tokens`
                  : "Not available (Heuristic/Local)"}
              </p>
            </div>
          </div>

          {/* Extracted Entities */}
          <div className="space-y-1.5">
            <h4 className="text-[11px] font-bold text-foreground uppercase tracking-tight flex items-center gap-1.5">
              Extracted Entities
            </h4>
            {trace.entities && Object.keys(trace.entities).length > 0 ? (
              <div className="rounded-[3px] border border-border bg-muted/10 p-2.5 space-y-1.5 text-xs font-mono">
                {Object.entries(trace.entities).map(([key, value]) => {
                  if (value === null || value === undefined) return null;
                  return (
                    <div
                      key={key}
                      className="flex items-start justify-between gap-2 border-b border-border/40 pb-1 last:border-0 last:pb-0"
                    >
                      <span className="text-muted-foreground">{key}:</span>
                      <span className="font-semibold text-foreground text-right max-w-[65%] truncate">
                        {typeof value === "object"
                          ? JSON.stringify(value)
                          : String(value)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground italic bg-muted/10 p-2.5 rounded-[3px] border border-border">
                No specific entities extracted for this turn.
              </p>
            )}
          </div>

          {/* Latency Breakdown Bar */}
          <div className="space-y-2">
            <h4 className="text-[11px] font-bold text-foreground uppercase tracking-tight flex items-center gap-1.5">
              Stage Latency Breakdown
            </h4>
            <div className="rounded-[3px] border border-border bg-card p-3 space-y-2 text-xs">
              {Object.entries(trace.latencies).map(([stage, durMs]) => {
                if (stage === "totalMs" || durMs === undefined || durMs === 0)
                  return null;
                const percent = Math.min(
                  100,
                  Math.round(
                    ((durMs || 0) / (trace.totalDurationMs || 1)) * 100,
                  ),
                );
                return (
                  <div key={stage} className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-muted-foreground font-mono">
                        {stage}
                      </span>
                      <span className="font-mono text-foreground font-medium">
                        {durMs.toFixed(1)} ms ({percent}%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-300"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: Chronological Execution Trace */}
        <TabsContent
          value="trace"
          className="flex-1 overflow-y-auto p-4 space-y-2 m-0"
        >
          <div className="space-y-1.5">
            {trace.events.map((evt) => {
              const isExpanded = Boolean(expandedEvents[evt.id]);
              const hasMeta =
                evt.metadata && Object.keys(evt.metadata).length > 0;

              return (
                <div
                  key={evt.id}
                  className="rounded-[3px] border border-border bg-card overflow-hidden text-xs"
                >
                  <button
                    type="button"
                    onClick={() => hasMeta && toggleEvent(evt.id)}
                    className={`w-full p-2.5 text-left flex items-center justify-between gap-2 hover:bg-muted/40 transition-colors ${
                      hasMeta ? "cursor-pointer" : "cursor-default"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {getEventStatusIcon(evt.status)}
                      <span className="font-mono text-[10px] text-muted-foreground w-4 shrink-0">
                        {evt.sequence.toString().padStart(2, "0")}
                      </span>
                      <span className="font-semibold text-foreground truncate text-[11px]">
                        {evt.stage}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {evt.durationMs !== undefined && (
                        <span className="font-mono text-[10px] text-muted-foreground font-semibold">
                          {evt.durationMs.toFixed(1)} ms
                        </span>
                      )}
                      <span className="font-mono text-[9px] uppercase px-1 rounded-[2px] bg-muted border border-border">
                        {evt.status}
                      </span>
                      {hasMeta &&
                        (isExpanded ? (
                          <ChevronDown className="size-3 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="size-3 text-muted-foreground" />
                        ))}
                    </div>
                  </button>

                  {isExpanded && hasMeta && (
                    <div className="p-2.5 border-t border-border bg-muted/20 font-mono text-[10px]">
                      <pre className="overflow-x-auto whitespace-pre-wrap leading-relaxed text-muted-foreground">
                        {JSON.stringify(evt.metadata, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* Tab 3: Retrieved Sources */}
        <TabsContent
          value="sources"
          className="flex-1 overflow-y-auto p-4 space-y-3 m-0"
        >
          {trace.retrievedSources && trace.retrievedSources.length > 0 ? (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">
                  Retrieved Knowledge Chunks ({trace.retrievedSources.length})
                </span>
                <span className="font-mono text-[11px]">
                  Tenant: {trace.organizationId}
                </span>
              </div>

              {trace.retrievedSources.map((source, idx) => (
                <div
                  key={`${source.documentId}_${idx}`}
                  className="rounded-[3px] border border-border bg-card p-3 space-y-2 text-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <p className="font-bold text-foreground flex items-center gap-1.5">
                        <FileText className="size-3.5 text-primary" />
                        {source.documentName}
                      </p>
                      <p className="font-mono text-[10px] text-muted-foreground">
                        ID: {source.documentId}
                        {source.pageNumber
                          ? ` • Page ${source.pageNumber}`
                          : ""}
                        {source.headingPath ? ` • ${source.headingPath}` : ""}
                      </p>
                    </div>

                    {source.score !== undefined && (
                      <Badge
                        variant="outline"
                        className="font-mono text-[10px]"
                      >
                        Score: {(source.score * 100).toFixed(1)}%
                      </Badge>
                    )}
                  </div>

                  {source.excerpt && (
                    <div className="p-2 rounded-[2px] bg-muted/40 border border-border/80 text-[11px] leading-relaxed italic text-muted-foreground">
                      &ldquo;{source.excerpt}&rdquo;
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center space-y-2 rounded-[4px] border border-dashed border-border bg-muted/10">
              <FileText className="size-6 mx-auto text-muted-foreground" />
              <p className="text-xs font-semibold text-foreground">
                Retrieval not performed for this turn
              </p>
              <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                Deterministic service resolution, direct clinic hours lookup, or
                fast-path booking handled this query without vector document
                search.
              </p>
            </div>
          )}
        </TabsContent>

        {/* Tab 4: Tools */}
        <TabsContent
          value="tools"
          className="flex-1 overflow-y-auto p-4 space-y-3 m-0"
        >
          {trace.tools.length > 0 ? (
            <div className="space-y-2.5">
              {trace.tools.map((tool, idx) => (
                <div
                  key={tool.id || idx}
                  className="rounded-[3px] border border-border bg-card p-3 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 font-bold text-foreground">
                      <Wrench className="size-3.5 text-primary" />
                      <span>{tool.name}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {tool.durationMs !== undefined && (
                        <span className="font-mono text-[10px] text-muted-foreground font-semibold">
                          {tool.durationMs} ms
                        </span>
                      )}
                      <Badge
                        variant={
                          tool.status === "executed"
                            ? "success"
                            : tool.status === "failed"
                              ? "destructive"
                              : "secondary"
                        }
                        className="text-[10px] font-mono uppercase"
                      >
                        {tool.status}
                      </Badge>
                    </div>
                  </div>

                  {/* Redacted Input */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-muted-foreground uppercase font-bold">
                      Input (Redacted):
                    </span>
                    <pre className="p-2 rounded-[2px] bg-muted/40 border border-border/80 font-mono text-[10px] overflow-x-auto text-foreground whitespace-pre-wrap">
                      {JSON.stringify(tool.input, null, 2)}
                    </pre>
                  </div>

                  {/* Output */}
                  {tool.output !== undefined && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono text-muted-foreground uppercase font-bold">
                        Output Summary:
                      </span>
                      <pre className="p-2 rounded-[2px] bg-muted/40 border border-border/80 font-mono text-[10px] overflow-x-auto text-foreground whitespace-pre-wrap max-h-40">
                        {typeof tool.output === "string"
                          ? tool.output
                          : JSON.stringify(tool.output, null, 2)}
                      </pre>
                    </div>
                  )}

                  {tool.error && (
                    <div className="p-2 rounded-[2px] bg-red-500/10 border border-red-500/20 text-red-600 text-[11px] font-mono">
                      Error: {tool.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center space-y-2 rounded-[4px] border border-dashed border-border bg-muted/10">
              <Wrench className="size-6 mx-auto text-muted-foreground" />
              <p className="text-xs font-semibold text-foreground">
                No tools executed for this turn
              </p>
              <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                This turn was answered directly by the conversational generator
                or greeting fast-path without tool calls.
              </p>
            </div>
          )}
        </TabsContent>

        {/* Tab 5: Errors */}
        <TabsContent
          value="errors"
          className="flex-1 overflow-y-auto p-4 space-y-3 m-0"
        >
          {trace.errors.length > 0 ? (
            <div className="space-y-2.5">
              {trace.errors.map((err, idx) => (
                <div
                  key={idx}
                  className="rounded-[3px] border border-red-500/30 bg-red-500/5 p-3 space-y-1.5 text-xs text-foreground"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-red-600 dark:text-red-400 flex items-center gap-1.5">
                      <AlertOctagon className="size-3.5" />
                      {err.code}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {err.stage}
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-muted-foreground leading-relaxed">
                    {err.message}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center space-y-2 rounded-[4px] border border-dashed border-border bg-muted/10">
              <CheckCircle2 className="size-6 mx-auto text-emerald-600" />
              <p className="text-xs font-semibold text-foreground">
                Zero Errors Recorded
              </p>
              <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                This conversation turn executed cleanly across Prompt Guard, AI
                providers, RAG retrieval, and tool executions.
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
