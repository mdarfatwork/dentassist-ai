"use client";

import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc/client";
import { useOrganization } from "@/components/organization/organization-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { type AIStage } from "@/components/workspace/ai-activity";
import {
  Bot,
  User,
  ArrowUp,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  RotateCcw,
  CheckCircle2,
  FileText,
  ChevronDown,
  ChevronUp,
  Sliders,
  Building2,
  Clock,
  Calendar,
} from "lucide-react";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
import {
  type BookingState,
  type SourceCitation,
  type ReceptionistToolCall,
  type ReceptionistStreamEvent,
} from "@/lib/receptionist/types";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: SourceCitation[];
  toolCalls?: ReceptionistToolCall[];
  isStreaming?: boolean;
}

function MarkdownContent({ content }: Readonly<{ content: string }>) {
  const rawHtml = marked.parse(content, {
    async: false,
    breaks: true,
    gfm: true,
  }) as string;

  const cleanHtml = sanitizeHtml(rawHtml, {
    allowedTags: [
      "p",
      "br",
      "b",
      "i",
      "strong",
      "em",
      "strike",
      "code",
      "pre",
      "ul",
      "ol",
      "li",
      "h1",
      "h2",
      "h3",
      "h4",
      "blockquote",
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
      "span",
      "hr",
    ],
    allowedAttributes: {
      "*": ["class", "className"],
    },
  });

  return (
    <div
      className="text-xs leading-relaxed space-y-2 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1.5 [&_li]:leading-relaxed [&_strong]:font-semibold [&_strong]:text-foreground [&_h1]:text-sm [&_h1]:font-bold [&_h1]:text-foreground [&_h2]:text-xs [&_h2]:font-bold [&_h2]:text-foreground [&_h3]:text-xs [&_h3]:font-semibold [&_h3]:text-foreground [&_code]:font-mono [&_code]:bg-muted/80 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded-[2px] [&_blockquote]:border-l-2 [&_blockquote]:border-primary/40 [&_blockquote]:pl-3 [&_blockquote]:italic"
      dangerouslySetInnerHTML={{ __html: cleanHtml }}
    />
  );
}

const STARTER_PROMPTS = [
  {
    icon: Sparkles,
    label: "Teeth Whitening",
    prompt: "Do you offer teeth whitening?",
    hint: "Cosmetic & brightening options",
  },
  {
    icon: Clock,
    label: "Operating Hours",
    prompt: "What are your clinic operating hours?",
    hint: "Weekly schedule & holiday hours",
  },
  {
    icon: Calendar,
    label: "Book Cleaning",
    prompt: "I'd like to book a dental cleaning tomorrow.",
    hint: "Hygiene & checkup scheduling",
  },
  {
    icon: FileText,
    label: "Treatment Pricing",
    prompt: "How much does a root canal cost?",
    hint: "Procedures & estimated costs",
  },
  {
    icon: RotateCcw,
    label: "Cancel / Reschedule",
    prompt: "Can you cancel my appointment?",
    hint: "Manage existing reservations",
  },
];

const VALID_AI_STAGES = new Set<string>([
  "searching_knowledge",
  "checking_availability",
  "checking_calendar",
]);

interface StreamDispatchContext {
  assistantMessageId: string;
  setActiveStage: (stage: AIStage | null) => void;
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  setRecentToolCalls: React.Dispatch<
    React.SetStateAction<ReceptionistToolCall[]>
  >;
  setConversationId: (id: string) => void;
  setBookingState: (state: BookingState) => void;
  setIsSecurityFlagged: (flag: boolean) => void;
  setSecurityNotice: (notice: string | null) => void;
}

function handleDoneStreamEvent(
  event: Extract<ReceptionistStreamEvent, { type: "done" }>,
  ctx: StreamDispatchContext,
) {
  if (event.conversationId) {
    ctx.setConversationId(event.conversationId);
  }
  if (event.bookingState) {
    ctx.setBookingState(event.bookingState);
  }
  if (event.toolCalls && event.toolCalls.length > 0) {
    ctx.setRecentToolCalls(event.toolCalls);
  }
  if (event.isSecurityFlagged) {
    ctx.setIsSecurityFlagged(true);
    ctx.setSecurityNotice(
      event.securityNotice || "Request blocked by safety policy.",
    );
  }

  ctx.setMessages((prev) =>
    prev.map((m) =>
      m.id === ctx.assistantMessageId
        ? {
            ...m,
            content: event.reply || m.content,
            sources: event.sources,
            toolCalls: event.toolCalls,
            isStreaming: false,
          }
        : m,
    ),
  );
}

function dispatchStreamEvent(
  event: ReceptionistStreamEvent,
  ctx: StreamDispatchContext,
) {
  switch (event.type) {
    case "stage":
      ctx.setActiveStage(
        VALID_AI_STAGES.has(event.stage) ? (event.stage as AIStage) : null,
      );
      break;
    case "token":
      ctx.setMessages((prev) =>
        prev.map((m) =>
          m.id === ctx.assistantMessageId
            ? { ...m, content: m.content + event.delta }
            : m,
        ),
      );
      break;
    case "tool_end":
      ctx.setRecentToolCalls((prev) => [
        ...prev,
        {
          id: `call_${Date.now()}`,
          name: event.toolName,
          args: {},
          executionTimeMs: event.executionTimeMs,
          result: event.result,
        },
      ]);
      break;
    case "done":
      handleDoneStreamEvent(event, ctx);
      break;
    case "error":
      throw new Error(event.error || "Generation error");
    default:
      break;
  }
}

function parseSSELines(lines: string[]): ReceptionistStreamEvent[] {
  return lines
    .map((block) => block.trim())
    .filter((trimmed) => trimmed.startsWith("data:"))
    .map((trimmed) => {
      try {
        return JSON.parse(
          trimmed.replace(/^data:\s*/, ""),
        ) as ReceptionistStreamEvent;
      } catch (jsonErr) {
        console.warn("SSE event parsing warning:", jsonErr);
        return null;
      }
    })
    .filter((event): event is ReceptionistStreamEvent => event !== null);
}

async function consumeSSEStream(
  stream: ReadableStream<Uint8Array>,
  onEvent: (event: ReceptionistStreamEvent) => void,
) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n\n");
    buffer = lines.pop() || "";

    const events = parseSSELines(lines);
    for (const event of events) {
      onEvent(event);
    }
  }

  if (buffer.trim()) {
    const remainingEvents = parseSSELines([buffer]);
    for (const event of remainingEvents) {
      onEvent(event);
    }
  }
}

export function ReceptionistPlayground() {
  const { activeOrganization } = useOrganization();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [inputMessage, setInputMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [bookingState, setBookingState] = useState<BookingState>({});
  const [activeStage, setActiveStage] = useState<AIStage | null>(null);
  const [recentToolCalls, setRecentToolCalls] = useState<
    ReceptionistToolCall[]
  >([]);
  const [isSecurityFlagged, setIsSecurityFlagged] = useState(false);
  const [securityNotice, setSecurityNotice] = useState<string | null>(null);
  const [expandedSources, setExpandedSources] = useState<
    Record<string, boolean>
  >({});

  const [isGenerating, setIsGenerating] = useState(false);

  const messageCounterRef = useRef(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const createConversationMutation =
    trpc.receptionist.createConversation.useMutation();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, activeStage]);

  // Auto-grow textarea on text change or Shift+Enter like ChatGPT
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    const nextHeight = Math.min(Math.max(textarea.scrollHeight, 38), 160);
    textarea.style.height = `${nextHeight}px`;
  }, [inputMessage]);

  // Start fresh conversation
  const handleReset = async () => {
    try {
      const conv = await createConversationMutation.mutateAsync();
      setConversationId(conv.id);
      setMessages([]);
      setBookingState({});
      setRecentToolCalls([]);
      setIsSecurityFlagged(false);
      setSecurityNotice(null);
    } catch {
      // Fallback local reset
      setConversationId(null);
      setMessages([]);
      setBookingState({});
      setRecentToolCalls([]);
    }
  };

  const handleSend = async (messageToSend?: string) => {
    const text = (messageToSend || inputMessage).trim();
    if (!text || isGenerating) return;

    setInputMessage("");
    setIsSecurityFlagged(false);
    setSecurityNotice(null);

    const userMessageId = `user_${++messageCounterRef.current}`;
    const assistantMessageId = `assistant_${++messageCounterRef.current}`;

    setMessages((prev) => [
      ...prev,
      { id: userMessageId, role: "user", content: text },
      {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        isStreaming: true,
      },
    ]);

    setIsGenerating(true);

    try {
      const res = await fetch("/api/receptionist/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: text,
          conversationId: conversationId || undefined,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error: ${res.status}`);
      }

      if (!res.body) {
        throw new Error("No response body received for streaming.");
      }

      await consumeSSEStream(res.body, (event) => {
        dispatchStreamEvent(event, {
          assistantMessageId,
          setActiveStage,
          setMessages,
          setRecentToolCalls,
          setConversationId,
          setBookingState,
          setIsSecurityFlagged,
          setSecurityNotice,
        });
      });
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : "Failed to communicate with receptionist.";
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessageId
            ? {
                ...m,
                content: `I'm having trouble responding right now: ${errorMsg}`,
                isStreaming: false,
              }
            : m,
        ),
      );
    } finally {
      setIsGenerating(false);
      setTimeout(() => setActiveStage(null), 1200);
    }
  };

  const toggleSourceExpand = (msgId: string) => {
    setExpandedSources((prev) => ({
      ...prev,
      [msgId]: !prev[msgId],
    }));
  };

  return (
    <div className="space-y-6">
      {/* Workspace Header Panel */}
      <div className="rounded-[4px] border border-border bg-card p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[2px] border border-primary/20 bg-primary/10 text-primary text-[11px] font-semibold tracking-tight">
                <Bot className="size-3" /> Phase 5 AI Receptionist
              </span>
              <Badge variant="success" className="text-[10px] font-mono">
                <ShieldCheck className="size-3 mr-1" /> Controlled Tool Layer
              </Badge>
            </div>
            <h2 className="text-lg font-bold tracking-tight text-foreground">
              Clinical AI Receptionist Console
            </h2>
            <p className="text-xs text-muted-foreground">
              Autonomous clinic inquiry answering, knowledge lookup, and
              verified appointment scheduling scoped to{" "}
              <span className="font-semibold text-foreground">
                {activeOrganization?.name}
              </span>
              .
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="gap-1.5 text-xs"
            >
              <RotateCcw className="size-3.5" /> Clear & New Session
            </Button>
          </div>
        </div>
      </div>

      {/* Main Workspace Split: Chat Thread + Structured State Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Chat Conversation Thread */}
        <div className="lg:col-span-8 rounded-[4px] border border-border bg-card flex flex-col h-[640px]">
          {/* Top Bar inside Chat */}
          <div className="p-3 border-b border-border bg-muted/20 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Building2 className="size-3.5 text-primary" />
              <span className="font-semibold text-foreground">
                {activeOrganization?.name}
              </span>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 sm:p-6 space-y-4 my-auto">
                <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-xs border border-primary/20">
                  <Bot className="size-6" />
                </div>
                <div className="space-y-1 max-w-md">
                  <h3 className="text-base font-semibold text-foreground tracking-tight">
                    How can I help you today?
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    I&apos;m your AI dental receptionist for{" "}
                    <span className="font-semibold text-foreground">
                      {activeOrganization?.name || "the clinic"}
                    </span>
                    {". "}
                    Choose a common question below or type your inquiry:
                  </p>
                </div>

                {/* Starter Prompts shown one by one in empty state only */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-xl w-full pt-2">
                  {STARTER_PROMPTS.map((item) => {
                    const IconComp = item.icon;
                    return (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => handleSend(item.prompt)}
                        disabled={isGenerating}
                        className="group text-left p-3 rounded-xl border border-border/80 bg-background/80 hover:bg-muted/60 hover:border-primary/50 transition-all duration-150 flex items-start gap-3 shadow-2xs cursor-pointer disabled:opacity-50"
                      >
                        <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                          <IconComp className="size-4" />
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <div className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                            {item.label}
                          </div>
                          <div className="text-[11px] text-muted-foreground line-clamp-1">
                            {item.prompt}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "assistant" && (
                    <div className="size-7 rounded-[3px] bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="size-4" />
                    </div>
                  )}

                  {msg.role === "assistant" &&
                  msg.content === "" &&
                  (msg.isStreaming || isGenerating) ? (
                    <div className="flex items-center gap-2 py-2 px-1 text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <span className="size-1.5 rounded-full bg-primary/70 animate-bounce [animation-delay:-0.32s]" />
                        <span className="size-1.5 rounded-full bg-primary/70 animate-bounce [animation-delay:-0.16s]" />
                        <span className="size-1.5 rounded-full bg-primary/70 animate-bounce" />
                      </div>
                      {activeStage && (
                        <span className="text-[11px] text-muted-foreground font-mono ml-1">
                          {activeStage === "searching_knowledge" &&
                            "Searching clinic knowledge..."}
                          {activeStage === "checking_availability" &&
                            "Checking availability..."}
                          {activeStage === "checking_calendar" &&
                            "Verifying calendar..."}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div
                      className={`max-w-[85%] rounded-[4px] p-3 text-xs leading-relaxed ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground font-medium"
                          : "bg-muted/40 border border-border text-foreground space-y-2"
                      }`}
                    >
                      {msg.role === "assistant" ? (
                        <div>
                          <MarkdownContent content={msg.content} />
                          {msg.isStreaming && (
                            <span className="inline-block w-1.5 h-3.5 bg-primary ml-1 animate-pulse align-middle" />
                          )}
                        </div>
                      ) : (
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                      )}

                      {/* Sources section if knowledge retrieval was used */}
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="pt-2 mt-2 border-t border-border/60">
                          <button
                            type="button"
                            onClick={() => toggleSourceExpand(msg.id)}
                            className="flex items-center gap-1.5 text-[11px] font-semibold text-primary hover:underline"
                          >
                            <FileText className="size-3" />
                            <span>
                              Official Clinic Knowledge Citations (
                              {msg.sources.length})
                            </span>
                            {expandedSources[msg.id] ? (
                              <ChevronUp className="size-3" />
                            ) : (
                              <ChevronDown className="size-3" />
                            )}
                          </button>

                          {expandedSources[msg.id] && (
                            <div className="mt-2 space-y-1 pl-1">
                              {msg.sources.map((src) => (
                                <div
                                  key={`${src.documentId}-${src.pageNumber ?? ""}-${src.headingPath ?? ""}`}
                                  className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground bg-muted/60 p-1.5 rounded-[2px] border border-border/40"
                                >
                                  <span className="font-semibold text-foreground">
                                    {src.documentName}
                                  </span>
                                  {src.headingPath && (
                                    <span>• {src.headingPath}</span>
                                  )}
                                  {src.pageNumber && (
                                    <span>• p. {src.pageNumber}</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {msg.role === "user" && (
                    <div className="size-7 rounded-[3px] bg-muted text-muted-foreground border border-border flex items-center justify-center shrink-0 mt-0.5">
                      <User className="size-4" />
                    </div>
                  )}
                </div>
              ))
            )}

            {/* Security Alert Banner */}
            {isSecurityFlagged && (
              <Alert variant="destructive" className="text-xs">
                <ShieldAlert className="size-4" />
                <AlertDescription>
                  {securityNotice ||
                    "Safety system flagged and contained this inquiry."}
                </AlertDescription>
              </Alert>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Bar (ChatGPT Style) */}
          <div className="p-3 border-t border-border bg-card/60 backdrop-blur-xs">
            <div className="relative flex items-end rounded-2xl border border-border/80 bg-background shadow-xs transition-all duration-200 focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/10 p-1.5 pl-3.5">
              <textarea
                ref={textareaRef}
                rows={1}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ask about dental services, clinic hours, pricing, or request an appointment..."
                className="flex-1 max-h-[160px] min-h-[38px] resize-none bg-transparent py-2 text-xs md:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none leading-relaxed"
              />

              <div className="flex items-center gap-1.5 shrink-0 pb-0.5 pr-0.5">
                {/* Secondary Action Icon: Sparkles quick suggestion */}
                <button
                  type="button"
                  title="Insert random inquiry suggestion"
                  onClick={() => {
                    // NOSONAR — Math.random() is used only to select a non-sensitive UI prompt.
                    const randomPrompt =
                      STARTER_PROMPTS[
                        Math.floor(Math.random() * STARTER_PROMPTS.length)
                      ].prompt;
                    setInputMessage(randomPrompt);
                    textareaRef.current?.focus();
                  }}
                  className="size-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors"
                >
                  <Sparkles className="size-4" />
                </button>

                {/* Primary Circular Send Button */}
                <button
                  type="button"
                  onClick={() => handleSend()}
                  disabled={!inputMessage.trim() || isGenerating}
                  title="Send message (Enter)"
                  className={`size-8 rounded-full flex items-center justify-center transition-all duration-150 ${
                    inputMessage.trim() && !isGenerating
                      ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs scale-100 active:scale-95"
                      : "bg-muted text-muted-foreground/40 cursor-not-allowed"
                  }`}
                >
                  {isGenerating ? (
                    <div className="size-3.5 rounded-xs bg-current animate-pulse" />
                  ) : (
                    <ArrowUp className="size-4 stroke-[2.5]" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between px-2 pt-1.5 text-[10px] text-muted-foreground">
              <span>
                DentAssist AI can make mistakes. Verify important appointment
                details.
              </span>
              <span className="hidden sm:inline font-mono text-[10px]">
                <span className="font-semibold">Shift + Enter</span> for new
                line
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Live Structured State & Tool Telemetry */}
        <div className="lg:col-span-4 space-y-4">
          {/* Live Structured Conversation State Card */}
          <div className="rounded-[4px] border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <div className="flex items-center gap-1.5">
                <Sliders className="size-3.5 text-primary" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                  Structured State
                </h3>
              </div>
              <Badge variant="secondary" className="text-[10px] font-mono">
                Real-Time
              </Badge>
            </div>

            <div className="space-y-2 text-xs divide-y divide-border/60">
              <div className="flex items-center justify-between pt-1">
                <span className="text-muted-foreground">Service:</span>
                <span className="font-semibold text-foreground">
                  {bookingState.serviceName || "None selected"}
                </span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-muted-foreground">Dentist:</span>
                <span className="font-semibold text-foreground">
                  {bookingState.dentistName || "Any available"}
                </span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-muted-foreground">Target Date:</span>
                <span className="font-mono text-foreground font-medium">
                  {bookingState.requestedDate || "—"}
                </span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-muted-foreground">Scheduled Time:</span>
                <span className="font-mono text-foreground font-medium">
                  {bookingState.selectedStartTime || "—"}
                </span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-muted-foreground">Patient:</span>
                <span className="font-semibold text-foreground">
                  {bookingState.patientName || "—"}
                </span>
              </div>

              {bookingState.patientEmail && (
                <div className="flex items-center justify-between pt-1">
                  <span className="text-muted-foreground">Email:</span>
                  <span className="font-mono text-[11px] text-foreground truncate max-w-[160px]">
                    {bookingState.patientEmail}
                  </span>
                </div>
              )}

              {bookingState.appointmentReference && (
                <div className="flex items-center justify-between pt-2">
                  <span className="text-muted-foreground font-bold">
                    Ref Code:
                  </span>
                  <span className="font-mono font-bold text-xs bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-[2px]">
                    {bookingState.appointmentReference}
                  </span>
                </div>
              )}
            </div>

            {bookingState.appointmentReference && (
              <div className="p-2 rounded-[2px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs flex items-center gap-2">
                <CheckCircle2 className="size-4 shrink-0" />
                <span>Appointment confirmed & synced to calendar.</span>
              </div>
            )}
          </div>

          {/* Recent Tool Activity Logs */}
          <div className="rounded-[4px] border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <div className="flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-primary" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                  Tool Telemetry
                </h3>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground">
                Zod Authorized
              </span>
            </div>

            {recentToolCalls.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-3 text-center">
                No tool calls executed in current message cycle.
              </p>
            ) : (
              <div className="space-y-2">
                {recentToolCalls.map((call) => (
                  <div
                    key={call.id}
                    className="p-2 rounded-[2px] border border-border/80 bg-muted/20 text-xs space-y-1 font-mono"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground">
                        {call.name}()
                      </span>
                      {call.executionTimeMs && (
                        <span className="text-[10px] text-muted-foreground">
                          {call.executionTimeMs}ms
                        </span>
                      )}
                    </div>
                    {call.error ? (
                      <span className="text-destructive text-[11px]">
                        Error: {call.error}
                      </span>
                    ) : (
                      <span className="text-emerald-600 text-[10px] flex items-center gap-1">
                        <CheckCircle2 className="size-3" /> Validated & Executed
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
