"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Bot,
  ArrowUp,
  Square,
  RotateCcw,
  Mic,
  MessageSquare,
  FlaskConical,
  Activity,
  Plus,
  ShieldAlert,
} from "lucide-react";
import { VoiceReceptionist } from "@/components/voice/voice-receptionist";
import { DebugPanel } from "./debug-panel";
import { TestScenariosModal } from "./test-scenarios-modal";
import { type TestScenario } from "@/lib/receptionist/test-scenarios";
import {
  type BookingState,
  type SourceCitation,
  type ReceptionistToolCall,
  type ReceptionistStreamEvent,
} from "@/lib/receptionist/types";
import { type AITrace } from "@/lib/receptionist/trace";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

interface ChatMessage {
  id: string;
  turnId?: string;
  traceId?: string;
  role: "user" | "assistant";
  content: string;
  sources?: SourceCitation[];
  toolCalls?: ReceptionistToolCall[];
  trace?: AITrace;
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
      className="text-xs leading-relaxed space-y-2 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1.5 [&_li]:leading-relaxed [&_strong]:font-semibold [&_strong]:text-foreground [&_h1]:text-sm [&_h1]:font-bold [&_h1]:text-foreground [&_h2]:text-xs [&_h2]:font-bold [&_h2]:text-foreground [&_h3]:text-xs [&_h3]:font-semibold [&_h3]:text-foreground [&_code]:font-mono [&_code]:bg-muted/80 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded-md [&_blockquote]:border-l-2 [&_blockquote]:border-primary/40 [&_blockquote]:pl-3 [&_blockquote]:italic"
      dangerouslySetInnerHTML={{ __html: cleanHtml }}
    />
  );
}

const SUGGESTED_PROMPTS = [
  "What are your opening hours?",
  "Do you offer teeth whitening?",
  "I'd like to book a cleaning.",
  "Where is the clinic located?",
];

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
  signal?: AbortSignal,
) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const onAbort = () => {
    try {
      void reader.cancel();
    } catch {
      // ignore
    }
  };

  if (signal) {
    if (signal.aborted) {
      void reader.cancel();
      return;
    }
    signal.addEventListener("abort", onAbort, { once: true });
  }

  try {
    while (true) {
      if (signal?.aborted) break;
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n\n");
      buffer = lines.pop() || "";

      const events = parseSSELines(lines);
      for (const event of events) {
        if (signal?.aborted) break;
        onEvent(event);
      }
    }

    if (!signal?.aborted && buffer.trim()) {
      const remainingEvents = parseSSELines([buffer]);
      for (const event of remainingEvents) {
        if (signal?.aborted) break;
        onEvent(event);
      }
    }
  } finally {
    if (signal) {
      signal.removeEventListener("abort", onAbort);
    }
    try {
      reader.releaseLock();
    } catch {
      // ignore if already released or closed
    }
  }
}

interface ReceptionistPlaygroundProps {
  initialMode?: "chat" | "voice";
}

export function ReceptionistPlayground({
  initialMode = "chat",
}: ReceptionistPlaygroundProps = {}) {
  // Mode: chat or voice
  const [mode, setMode] = useState<"chat" | "voice">(initialMode);
  const [prevInitialMode, setPrevInitialMode] = useState(initialMode);

  if (prevInitialMode !== initialMode) {
    setPrevInitialMode(initialMode);
    setMode(initialMode);
  }

  // Conversation & turn state
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [inputMessage, setInputMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [, setBookingState] = useState<BookingState>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSecurityFlagged, setIsSecurityFlagged] = useState(false);
  const [securityNotice, setSecurityNotice] = useState<string | null>(null);

  // Debug trace inspection
  const [selectedTurnId, setSelectedTurnId] = useState<string | null>(null);
  const [selectedTrace, setSelectedTrace] = useState<AITrace | null>(null);
  const [showMobileDebug, setShowMobileDebug] = useState(false);

  // Modals
  const [isScenariosModalOpen, setIsScenariosModalOpen] = useState(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);

  const messageCounterRef = useRef(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // tRPC mutations & queries
  const createConversationMutation =
    trpc.receptionist.createConversation.useMutation();
  const clearConversationMutation =
    trpc.receptionist.clearConversation.useMutation();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Cancel generation on component unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Auto-grow composer textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    const nextHeight = Math.min(Math.max(textarea.scrollHeight, 24), 160);
    textarea.style.height = `${nextHeight}px`;
  }, [inputMessage]);

  // Start fresh conversation thread
  const handleNewConversation = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);

    try {
      const conv = await createConversationMutation.mutateAsync();
      setConversationId(conv.id);
      setMessages([]);
      setBookingState({});
      setSelectedTurnId(null);
      setSelectedTrace(null);
      setIsSecurityFlagged(false);
      setSecurityNotice(null);
    } catch {
      setConversationId(null);
      setMessages([]);
      setBookingState({});
      setSelectedTurnId(null);
      setSelectedTrace(null);
    }
  };

  // Clear conversation with server reset
  const handleConfirmClear = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);

    if (conversationId) {
      try {
        await clearConversationMutation.mutateAsync({ conversationId });
      } catch (err) {
        console.warn("Failed to clear server conversation:", err);
      }
    }
    setMessages([]);
    setBookingState({});
    setSelectedTurnId(null);
    setSelectedTrace(null);
    setIsSecurityFlagged(false);
    setSecurityNotice(null);
    setIsClearConfirmOpen(false);
  };

  // Inspect specific turn trace
  const handleSelectTurnTrace = useCallback(
    (turnId?: string, traceId?: string) => {
      if (!turnId) return;
      setSelectedTurnId(turnId);

      // Check if already in messages cache
      const cachedMsg = messages.find(
        (m) => m.turnId === turnId || m.traceId === traceId,
      );
      if (cachedMsg?.trace) {
        setSelectedTrace(cachedMsg.trace);
        setShowMobileDebug(true);
      }
    },
    [messages],
  );

  // Stop ongoing AI response generation immediately
  const handleStop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
  }, []);

  // Send message through real AI Core
  const handleSend = async (messageToSend?: string) => {
    const text = (messageToSend || inputMessage).trim();
    if (!text || isGenerating) return;

    // Reset abort controller for this new turn
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

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
        signal: abortController.signal,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error: ${res.status}`);
      }

      if (!res.body) {
        throw new Error("No response body received for streaming.");
      }

      await consumeSSEStream(
        res.body,
        (event) => {
          if (event.type === "token") {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMessageId
                  ? { ...m, content: m.content + event.delta }
                  : m,
              ),
            );
          } else if (event.type === "done") {
            if (event.conversationId) {
              setConversationId(event.conversationId);
            }
            if (event.bookingState) {
              setBookingState(event.bookingState);
            }
            if (event.isSecurityFlagged) {
              setIsSecurityFlagged(true);
              setSecurityNotice(
                event.securityNotice || "Request blocked by safety policy.",
              );
            }

            // Attach trace to message & select it
            if (event.trace) {
              setSelectedTrace(event.trace);
              setSelectedTurnId(event.turnId || event.trace.turnId);
            }

            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMessageId
                  ? {
                      ...m,
                      content: event.reply || m.content,
                      sources: event.sources,
                      toolCalls: event.toolCalls,
                      traceId: event.traceId,
                      turnId: event.turnId,
                      trace: event.trace,
                      isStreaming: false,
                    }
                  : m,
              ),
            );
          } else if (event.type === "error") {
            throw new Error(event.error || "Generation error");
          }
        },
        abortController.signal,
      );
    } catch (err: unknown) {
      const isAbort =
        abortController.signal.aborted ||
        (err instanceof DOMException && err.name === "AbortError") ||
        (typeof err === "object" &&
          err !== null &&
          "name" in err &&
          (err as { name: string }).name === "AbortError");

      if (isAbort) {
        // User stopped generation - finalize assistant message gracefully without an error banner
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId
              ? {
                  ...m,
                  content:
                    m.content.trim() || "Response generation stopped.",
                  isStreaming: false,
                }
              : m,
          ),
        );
        return;
      }

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
      abortControllerRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleSelectScenario = (scenario: TestScenario) => {
    setMode("chat");
    setInputMessage(scenario.patientPrompt);
    textareaRef.current?.focus();
  };

  return (
    <div className="space-y-5">
      {/* Refined Page Header */}
      <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            AI Receptionist
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Test how your receptionist answers questions and handles
            appointments.
          </p>
        </div>

        {/* Global Controls & Mode Switch */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Segmented Mode Switcher */}
          <div className="inline-flex items-center rounded-xl border border-border/80 bg-muted/50 p-1">
            <button
              type="button"
              onClick={() => setMode("chat")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-all ${mode === "chat"
                  ? "bg-card text-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground font-medium"
                }`}
            >
              <MessageSquare className="size-3.5 text-primary" />
              <span>Chat</span>
            </button>
            <button
              type="button"
              onClick={() => setMode("voice")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-all ${mode === "voice"
                  ? "bg-card text-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground font-medium"
                }`}
            >
              <Mic className="size-3.5 text-primary" />
              <span>Voice</span>
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsScenariosModalOpen(true)}
            className="rounded-xl text-xs gap-1.5 h-8 px-3 border-border/80 hover:bg-muted/60"
          >
            <FlaskConical className="size-3.5 text-primary" />
            <span>Test Scenarios</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleNewConversation}
            className="rounded-xl text-xs gap-1.5 h-8 px-3 border-border/80 hover:bg-muted/60"
          >
            <Plus className="size-3.5 text-primary" />
            <span>New Conversation</span>
          </Button>

          {messages.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsClearConfirmOpen(true)}
              className="rounded-xl text-xs gap-1.5 h-8 px-3 border-border/80 text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive/30"
            >
              <RotateCcw className="size-3.5" />
              <span>Clear</span>
            </Button>
          )}

          {/* Mobile Trace Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowMobileDebug(!showMobileDebug)}
            className="lg:hidden rounded-xl text-xs gap-1.5 h-8 px-3 border-border/80"
          >
            <Activity className="size-3.5 text-primary" />
            <span>
              {showMobileDebug ? "View Conversation" : "Activity Details"}
            </span>
          </Button>
        </div>
      </div>

      {/* Security Alert Banner if Triggered */}
      {isSecurityFlagged && securityNotice && (
        <Alert variant="destructive" className="rounded-xl py-3 px-4 text-xs">
          <ShieldAlert className="size-4" />
          <AlertDescription className="text-xs">
            {securityNotice}
          </AlertDescription>
        </Alert>
      )}

      {/* Main Dual-Panel Workspace: Left = Conversation (Chat or Voice), Right = Activity Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left Panel: Conversation Thread (Chat or Voice) */}
        <div
          className={`lg:col-span-7 xl:col-span-8 rounded-2xl border border-border/80 bg-card flex flex-col h-[680px] overflow-hidden shadow-xs ${showMobileDebug ? "hidden lg:flex" : "flex"
            }`}
        >
          {mode === "voice" ? (
            <div className="flex-1 overflow-y-auto">
              <VoiceReceptionist
                onBackToChat={() => setMode("chat")}
                selectedTurnId={selectedTurnId || undefined}
                onSelectTurnTrace={(turnId, traceId) =>
                  handleSelectTurnTrace(turnId, traceId)
                }
                onTurnComplete={(res) => {
                  if (res.trace) {
                    setSelectedTrace(res.trace);
                    setSelectedTurnId(res.turnId || res.trace.turnId);
                  }
                }}
              />
            </div>
          ) : (
            <>
              {/* Chat Status Header */}
              <div className="px-4 py-3 border-b border-border/60 bg-muted/20 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className={`size-2 rounded-full ${isGenerating
                        ? "bg-primary animate-pulse"
                        : "bg-emerald-500"
                      }`}
                  />
                  <span className="font-medium text-foreground">
                    {isGenerating
                      ? "Receptionist is thinking..."
                      : "Receptionist Ready"}
                  </span>
                </div>

                {messages.length > 0 && (
                  <span className="text-[11px] text-muted-foreground">
                    {messages.filter((m) => m.role === "user").length}{" "}
                    {messages.filter((m) => m.role === "user").length === 1
                      ? "question"
                      : "questions"}
                  </span>
                )}
              </div>

              {/* Chat Message Stream */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4 my-auto">
                    <div className="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                      <Bot className="size-6" />
                    </div>
                    <div className="space-y-1.5 max-w-sm">
                      <h3 className="text-base font-semibold text-foreground tracking-tight">
                        Start a conversation
                      </h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Ask about clinic services, opening hours, or appointment
                        availability.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-2 max-w-md pt-2">
                      {SUGGESTED_PROMPTS.map((prompt) => (
                        <button
                          key={prompt}
                          type="button"
                          onClick={() => void handleSend(prompt)}
                          className="text-xs px-3.5 py-1.5 rounded-full bg-muted/60 hover:bg-muted text-foreground border border-border/80 hover:border-primary/40 transition-colors shadow-2xs font-medium"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isAssistant = msg.role === "assistant";
                    const isSelected =
                      isAssistant && msg.turnId === selectedTurnId;

                    return (
                      <div
                        key={msg.id}
                        className={`flex gap-2.5 text-xs ${msg.role === "user"
                            ? "justify-end"
                            : "justify-start items-start"
                          }`}
                      >
                        {isAssistant && (
                          <div className="size-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                            <Bot className="size-4" />
                          </div>
                        )}

                        <div
                          className={`space-y-2 transition-all ${msg.role === "user"
                              ? "max-w-[80%] rounded-2xl rounded-br-xs p-3.5 bg-primary text-primary-foreground shadow-xs leading-relaxed"
                              : `max-w-[85%] rounded-2xl rounded-bl-xs p-4 bg-card text-foreground border shadow-2xs leading-relaxed ${isSelected
                                ? "border-primary ring-1 ring-primary/30"
                                : "border-border/70"
                              }`
                            }`}
                        >
                          <div className="leading-relaxed">
                            {msg.content ? (
                              <MarkdownContent content={msg.content} />
                            ) : msg.isStreaming ? (
                              <span className="inline-flex items-center gap-2 text-muted-foreground">
                                <span className="size-1.5 rounded-full bg-primary animate-pulse" />
                                Receptionist is thinking...
                              </span>
                            ) : null}
                          </div>

                          {isAssistant && (msg.turnId || msg.trace) && (
                            <div className="pt-1.5 border-t border-border/50 flex items-center justify-between gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  handleSelectTurnTrace(msg.turnId, msg.traceId)
                                }
                                className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-primary transition-colors"
                              >
                                <Activity className="size-3 text-primary" />
                                <span>View activity details</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Composer - ChatGPT Style Unified Container */}
              <div className="p-3 sm:p-4 border-t border-border/60 bg-card/60 backdrop-blur-xs">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void handleSend();
                  }}
                  className="relative flex items-end gap-2 rounded-2xl sm:rounded-[24px] border border-border/80 bg-background p-1.5 pl-4 shadow-2xs transition-all duration-200 focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/15"
                >
                  <textarea
                    ref={textareaRef}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={
                      isGenerating
                        ? "Receptionist is responding..."
                        : "Ask about opening hours, services, or appointments..."
                    }
                    disabled={isGenerating}
                    rows={1}
                    className="flex-1 resize-none border-0 bg-transparent py-1.5 pr-1 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0 leading-relaxed min-h-[24px] max-h-[160px] overflow-y-auto scrollbar-hide disabled:opacity-60 disabled:cursor-not-allowed"
                  />

                  <div className="flex items-center shrink-0 mb-0.5">
                    {isGenerating ? (
                      <button
                        type="button"
                        onClick={handleStop}
                        aria-label="Stop generation"
                        title="Stop generation"
                        className="size-8 rounded-full bg-foreground text-background hover:bg-foreground/85 flex items-center justify-center transition-all duration-150 shadow-xs hover:scale-105 active:scale-95 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <Square className="size-3 fill-current" />
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={!inputMessage.trim()}
                        aria-label="Send message"
                        title="Send message"
                        className={`size-8 rounded-full flex items-center justify-center transition-all duration-150 shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                          inputMessage.trim()
                            ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105 active:scale-95 cursor-pointer shadow-primary/20"
                            : "bg-muted text-muted-foreground/35 cursor-not-allowed"
                        }`}
                      >
                        <ArrowUp className="size-4 stroke-[2.5]" />
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </>
          )}
        </div>

        {/* Right Panel: Activity Details */}
        <div
          className={`lg:col-span-5 xl:col-span-4 h-[680px] rounded-2xl flex flex-col overflow-hidden ${showMobileDebug ? "flex flex-col" : "hidden lg:flex lg:flex-col"
            }`}
        >
          <DebugPanel trace={selectedTrace} isLoading={isGenerating} />
        </div>
      </div>

      {/* Predefined Test Scenarios Modal */}
      <TestScenariosModal
        isOpen={isScenariosModalOpen}
        onClose={() => setIsScenariosModalOpen(false)}
        onSelectScenario={handleSelectScenario}
      />

      {/* Reset / Clear Confirmation Dialog */}
      <Dialog open={isClearConfirmOpen} onOpenChange={setIsClearConfirmOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Clear Conversation?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              This will reset the conversation messages and current session
              state. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsClearConfirmOpen(false)}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmClear}
              className="rounded-xl text-xs"
            >
              Clear Conversation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
