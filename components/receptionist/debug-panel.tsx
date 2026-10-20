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

  const toggleEvent = (id: string) => {
    setExpandedEvents((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-3 bg-card border border-border/80 rounded-2xl shadow-xs">
        <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <div className="space-y-1">
          <p className="text-xs font-semibold text-foreground">
            Processing request...
          </p>
          <p className="text-[11px] text-muted-foreground">
            Evaluating intent, retrieving clinic knowledge, and preparing
            response.
          </p>
        </div>
      </div>
    );
  }

  if (!trace) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-3 bg-card border border-border/80 rounded-2xl shadow-xs">
        <div className="size-12 rounded-full bg-muted/80 flex items-center justify-center text-muted-foreground">
          <Activity className="size-6" />
        </div>
        <div className="space-y-1 max-w-xs">
          <h3 className="text-sm font-semibold text-foreground tracking-tight">
            Activity details
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Send a message to see how the receptionist handled your request.
          </p>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: AITrace["status"]) => {
    switch (status) {
      case "success":
        return (
          <Badge
            variant="success"
            className="gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full"
          >
            <CheckCircle2 className="size-3" /> Success
          </Badge>
        );
      case "partial_success":
        return (
          <Badge
            variant="warning"
            className="gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full"
          >
            <AlertTriangle className="size-3" /> Partial
          </Badge>
        );
      case "blocked":
        return (
          <Badge
            variant="destructive"
            className="gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full"
          >
            <ShieldAlert className="size-3" /> Blocked
          </Badge>
        );
      case "failed":
        return (
          <Badge
            variant="destructive"
            className="gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full"
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
    <div className="h-full flex flex-col bg-card border border-border/80 rounded-2xl overflow-hidden shadow-xs">
      {/* Activity Details Header Bar */}
      <div className="border-b border-border/80 bg-muted/20 px-4 py-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="size-7 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <Activity className="size-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-foreground">
                Activity details
              </span>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted border border-border/80 text-muted-foreground capitalize">
                {trace.channel}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-foreground">
            {trace.totalDurationMs.toFixed(0)} ms
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
        <div className="border-b border-border/60 bg-card px-3">
          <TabsList className="h-9 bg-transparent p-0 justify-start gap-1">
            <TabsTrigger
              value="overview"
              className="text-xs py-1.5 px-3 rounded-lg data-[state=active]:bg-muted/70 data-[state=active]:text-foreground font-medium"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="trace"
              className="text-xs py-1.5 px-3 rounded-lg data-[state=active]:bg-muted/70 data-[state=active]:text-foreground font-medium gap-1.5"
            >
              Steps
              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-muted-foreground/15">
                {trace.events.length}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="sources"
              className="text-xs py-1.5 px-3 rounded-lg data-[state=active]:bg-muted/70 data-[state=active]:text-foreground font-medium gap-1.5"
            >
              Sources
              {trace.retrievedSources && trace.retrievedSources.length > 0 && (
                <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-muted-foreground/15">
                  {trace.retrievedSources.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="tools"
              className="text-xs py-1.5 px-3 rounded-lg data-[state=active]:bg-muted/70 data-[state=active]:text-foreground font-medium gap-1.5"
            >
              Tools
              {trace.tools.length > 0 && (
                <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-muted-foreground/15">
                  {trace.tools.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="errors"
              className="text-xs py-1.5 px-3 rounded-lg data-[state=active]:bg-muted/70 data-[state=active]:text-foreground font-medium gap-1.5"
            >
              Errors
              {trace.errors.length > 0 && (
                <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-destructive/15 text-destructive font-semibold">
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
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 gap-2.5 text-xs">
            <div className="p-3 rounded-xl border border-border/80 bg-muted/20 space-y-1">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <Zap className="size-3 text-primary" /> Detected Intent
              </span>
              <p className="font-semibold text-foreground text-xs">
                {trace.intent || "General Question"}
              </p>
            </div>

            <div className="p-3 rounded-xl border border-border/80 bg-muted/20 space-y-1">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <Cpu className="size-3 text-primary" /> AI Model
              </span>
              <p className="font-semibold text-foreground text-xs truncate">
                {trace.provider || "Gemini"} /{" "}
                {trace.model || "gemini-2.5-flash-lite"}
              </p>
            </div>

            <div className="p-3 rounded-xl border border-border/80 bg-muted/20 space-y-1">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <Clock className="size-3 text-primary" /> Duration
              </span>
              <p className="font-semibold text-foreground text-xs">
                {trace.totalDurationMs.toFixed(0)} ms
              </p>
            </div>

            <div className="p-3 rounded-xl border border-border/80 bg-muted/20 space-y-1">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <Hash className="size-3 text-primary" /> Token Usage
              </span>
              <p className="text-muted-foreground text-xs truncate">
                {trace.tokenUsage?.totalTokens
                  ? `${trace.tokenUsage.totalTokens} tokens`
                  : "Deterministic / Local"}
              </p>
            </div>
          </div>

          {/* Extracted Entities */}
          <div className="space-y-1.5">
            <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              Extracted Information
            </h4>
            {trace.entities && Object.keys(trace.entities).length > 0 ? (
              <div className="rounded-xl border border-border/80 bg-muted/10 p-3 space-y-2 text-xs">
                {Object.entries(trace.entities).map(([key, value]) => {
                  if (value === null || value === undefined) return null;
                  return (
                    <div
                      key={key}
                      className="flex items-start justify-between gap-2 border-b border-border/40 pb-1.5 last:border-0 last:pb-0"
                    >
                      <span className="text-muted-foreground">{key}:</span>
                      <span className="font-medium text-foreground text-right max-w-[65%] truncate">
                        {typeof value === "object"
                          ? JSON.stringify(value)
                          : String(value)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic bg-muted/10 p-3 rounded-xl border border-border/80">
                No specific booking entities needed for this request.
              </p>
            )}
          </div>

          {/* Latency Breakdown Bar */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              Stage Duration Breakdown
            </h4>
            <div className="rounded-xl border border-border/80 bg-card p-3.5 space-y-2.5 text-xs">
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
                      <span className="text-muted-foreground font-medium">
                        {stage}
                      </span>
                      <span className="font-medium text-foreground">
                        {durMs.toFixed(0)} ms ({percent}%)
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
          className="flex-1 overflow-y-auto p-4 space-y-2.5 m-0"
        >
          <div className="space-y-2">
            {trace.events.map((evt) => {
              const isExpanded = Boolean(expandedEvents[evt.id]);
              const hasMeta =
                evt.metadata && Object.keys(evt.metadata).length > 0;

              return (
                <div
                  key={evt.id}
                  className="rounded-xl border border-border/80 bg-card overflow-hidden text-xs shadow-2xs"
                >
                  <button
                    type="button"
                    onClick={() => hasMeta && toggleEvent(evt.id)}
                    className={`w-full p-3 text-left flex items-center justify-between gap-2 hover:bg-muted/40 transition-colors ${
                      hasMeta ? "cursor-pointer" : "cursor-default"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {getEventStatusIcon(evt.status)}
                      <span className="font-semibold text-foreground truncate text-xs">
                        {evt.stage}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {evt.durationMs !== undefined && (
                        <span className="text-[11px] text-muted-foreground font-medium">
                          {evt.durationMs.toFixed(0)} ms
                        </span>
                      )}
                      <span className="text-[10px] capitalize px-2 py-0.5 rounded-full bg-muted border border-border/80 text-muted-foreground">
                        {evt.status}
                      </span>
                      {hasMeta &&
                        (isExpanded ? (
                          <ChevronDown className="size-3.5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="size-3.5 text-muted-foreground" />
                        ))}
                    </div>
                  </button>

                  {isExpanded && hasMeta && (
                    <div className="p-3 border-t border-border/60 bg-muted/20 font-mono text-[11px]">
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
            <div className="space-y-3">
              <div className="text-xs font-semibold text-foreground">
                Retrieved Knowledge ({trace.retrievedSources.length})
              </div>

              {trace.retrievedSources.map((source, idx) => (
                <div
                  key={`${source.documentId}_${idx}`}
                  className="rounded-xl border border-border/80 bg-card p-3.5 space-y-2 text-xs shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <p className="font-semibold text-foreground flex items-center gap-1.5">
                        <FileText className="size-3.5 text-primary" />
                        {source.documentName}
                      </p>
                      {(source.pageNumber || source.headingPath) && (
                        <p className="text-[11px] text-muted-foreground">
                          {source.pageNumber ? `Page ${source.pageNumber}` : ""}
                          {source.headingPath ? ` • ${source.headingPath}` : ""}
                        </p>
                      )}
                    </div>

                    {source.score !== undefined && (
                      <Badge
                        variant="outline"
                        className="text-[10px] font-medium rounded-full"
                      >
                        Score: {(source.score * 100).toFixed(0)}%
                      </Badge>
                    )}
                  </div>

                  {source.excerpt && (
                    <div className="p-2.5 rounded-lg bg-muted/40 border border-border/60 text-xs leading-relaxed italic text-muted-foreground">
                      &ldquo;{source.excerpt}&rdquo;
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center space-y-2 rounded-2xl border border-dashed border-border/80 bg-muted/10">
              <FileText className="size-6 mx-auto text-muted-foreground" />
              <p className="text-xs font-semibold text-foreground">
                Knowledge retrieval not required
              </p>
              <p className="text-[11px] text-muted-foreground max-w-sm mx-auto leading-relaxed">
                Clinic hours, service listings, or fast-path conversational
                replies handled this request directly without vector search.
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
            <div className="space-y-3">
              {trace.tools.map((tool, idx) => (
                <div
                  key={tool.id || idx}
                  className="rounded-xl border border-border/80 bg-card p-3.5 space-y-2.5 text-xs shadow-2xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 font-semibold text-foreground">
                      <Wrench className="size-3.5 text-primary" />
                      <span>{tool.name}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {tool.durationMs !== undefined && (
                        <span className="text-[11px] text-muted-foreground font-medium">
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
                        className="text-[10px] font-medium rounded-full capitalize"
                      >
                        {tool.status}
                      </Badge>
                    </div>
                  </div>

                  {/* Redacted Input */}
                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground font-medium">
                      Input parameters:
                    </span>
                    <pre className="p-2.5 rounded-lg bg-muted/40 border border-border/60 font-mono text-[11px] overflow-x-auto text-foreground whitespace-pre-wrap">
                      {JSON.stringify(tool.input, null, 2)}
                    </pre>
                  </div>

                  {/* Output */}
                  {tool.output !== undefined && (
                    <div className="space-y-1">
                      <span className="text-[10px] text-muted-foreground font-medium">
                        Output result:
                      </span>
                      <pre className="p-2.5 rounded-lg bg-muted/40 border border-border/60 font-mono text-[11px] overflow-x-auto text-foreground whitespace-pre-wrap max-h-40">
                        {typeof tool.output === "string"
                          ? tool.output
                          : JSON.stringify(tool.output, null, 2)}
                      </pre>
                    </div>
                  )}

                  {tool.error && (
                    <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium">
                      Error: {tool.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center space-y-2 rounded-2xl border border-dashed border-border/80 bg-muted/10">
              <Wrench className="size-6 mx-auto text-muted-foreground" />
              <p className="text-xs font-semibold text-foreground">
                No tools executed for this request
              </p>
              <p className="text-[11px] text-muted-foreground max-w-sm mx-auto leading-relaxed">
                This inquiry was answered directly by the conversational
                generator without requiring clinic tool execution.
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
                  className="rounded-xl border border-destructive/30 bg-destructive/5 p-3.5 space-y-1.5 text-xs text-foreground shadow-2xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-destructive flex items-center gap-1.5">
                      <AlertOctagon className="size-3.5" />
                      {err.code}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {err.stage}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {err.message}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center space-y-2 rounded-2xl border border-dashed border-border/80 bg-muted/10">
              <CheckCircle2 className="size-6 mx-auto text-emerald-600" />
              <p className="text-xs font-semibold text-foreground">
                Zero errors recorded
              </p>
              <p className="text-[11px] text-muted-foreground max-w-sm mx-auto leading-relaxed">
                All safety checks, provider calls, and tool operations executed
                smoothly.
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
