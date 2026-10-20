"use client";

import { type VoiceState, type VoiceMessage } from "@/lib/voice/types";
import { type BookingState } from "@/lib/receptionist/types";
import { Badge } from "@/components/ui/badge";
import {
  Mic,
  Bot,
  Calendar,
  Clock,
  CheckCircle2,
  Volume2,
  Activity,
} from "lucide-react";

interface VoiceTranscriptProps {
  state: VoiceState;
  messages: VoiceMessage[];
  interimTranscript: string;
  finalTranscript: string;
  bookingState: BookingState;
  selectedTurnId?: string;
  onSelectPrompt?: (prompt: string) => void;
  onSelectTurnTrace?: (turnId?: string, traceId?: string) => void;
}

const VOICE_SAMPLE_PROMPTS = [
  "What are your opening hours?",
  "Do you offer teeth whitening?",
  "I'd like to book an appointment.",
];

export function VoiceTranscript({
  state,
  messages,
  interimTranscript,
  finalTranscript,
  bookingState,
  selectedTurnId,
  onSelectPrompt,
  onSelectTurnTrace,
}: VoiceTranscriptProps) {
  const activeSpeechText = interimTranscript || finalTranscript;

  return (
    <div className="space-y-4">
      {/* Live Audio / Speaking Active Monitor */}
      {(state === "listening" || state === "speaking" || activeSpeechText) && (
        <div className="p-4 rounded-2xl border border-primary/20 bg-primary/5 space-y-2 shadow-xs">
          <div className="flex items-center justify-between text-xs text-primary font-medium">
            <span className="flex items-center gap-2">
              {state === "speaking" ? (
                <>
                  <Volume2 className="size-4 animate-bounce" />
                  <span>Receptionist speaking</span>
                </>
              ) : (
                <>
                  <Mic className="size-4 animate-pulse text-red-500" />
                  <span>Listening to your voice</span>
                </>
              )}
            </span>
          </div>

          <div className="text-sm font-medium text-foreground min-h-6 flex items-center">
            {activeSpeechText ? (
              <p className="italic text-foreground/90 leading-relaxed">
                &ldquo;{activeSpeechText}&rdquo;
              </p>
            ) : (
              <span className="text-xs text-muted-foreground italic flex items-center gap-2">
                <span className="inline-block size-1.5 rounded-full bg-primary animate-ping" />
                Listening for speech... Speak clearly into your microphone.
              </span>
            )}
          </div>
        </div>
      )}

      {/* Active Booking State Indicator (if any booking context exists) */}
      {(bookingState.serviceName ||
        bookingState.dateDisplay ||
        bookingState.selectedTimeDisplay ||
        bookingState.confirmationPending) && (
        <div className="rounded-xl border border-border/80 bg-muted/30 p-3.5 space-y-2.5 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
            <span className="flex items-center gap-1.5 text-foreground">
              <Calendar className="size-3.5 text-primary" /> Active Booking
              Context
            </span>
            <Badge
              variant="outline"
              className="text-[10px] font-medium rounded-full uppercase border-border/80"
            >
              {bookingState.status || "In Progress"}
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            {bookingState.serviceName && (
              <div className="flex flex-col">
                <span className="text-[10px] text-muted-foreground">
                  Service
                </span>
                <span className="font-semibold text-foreground">
                  {bookingState.serviceName}
                </span>
              </div>
            )}
            {bookingState.dateDisplay && (
              <div className="flex flex-col">
                <span className="text-[10px] text-muted-foreground">Date</span>
                <span className="font-semibold text-foreground">
                  {bookingState.dateDisplay}
                </span>
              </div>
            )}
            {bookingState.selectedTimeDisplay && (
              <div className="flex flex-col">
                <span className="text-[10px] text-muted-foreground">
                  Time Slot
                </span>
                <span className="font-semibold text-foreground flex items-center gap-1">
                  <Clock className="size-3 text-primary" />
                  {bookingState.selectedTimeDisplay}
                </span>
              </div>
            )}
          </div>

          {bookingState.confirmationPending && (
            <div className="text-[11px] font-medium text-amber-800 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5">
              <span>
                Awaiting your confirmation to finalize appointment reservation.
              </span>
            </div>
          )}

          {bookingState.isConfirmed && (
            <div className="text-[11px] font-medium text-emerald-800 dark:text-emerald-300 bg-emerald-500/10 border border-emerald-600/20 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5 text-emerald-600" />
              <span>
                Appointment Confirmed! Ref:{" "}
                <code className="font-mono font-bold">
                  {bookingState.appointmentReference}
                </code>
              </span>
            </div>
          )}
        </div>
      )}

      {/* Conversation Turns Thread */}
      <div className="space-y-3 min-h-[160px] max-h-[380px] overflow-y-auto p-1 pr-2">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center space-y-3 border border-dashed border-border/80 rounded-2xl p-6 bg-muted/10">
            <div className="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
              <Mic className="size-6" />
            </div>
            <div className="space-y-1 max-w-sm">
              <p className="text-sm font-semibold text-foreground tracking-tight">
                Ready to talk?
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Start a voice conversation to ask about services, clinic hours,
                or appointments.
              </p>
            </div>

            <div className="pt-2 flex flex-wrap justify-center gap-2 max-w-md">
              {VOICE_SAMPLE_PROMPTS.map((sample) => (
                <button
                  key={sample}
                  type="button"
                  onClick={() => onSelectPrompt?.(sample)}
                  className="text-xs px-3.5 py-1.5 rounded-full bg-card hover:bg-muted text-foreground border border-border/80 hover:border-primary/40 transition-colors shadow-2xs font-medium"
                >
                  &ldquo;{sample}&rdquo;
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2.5 text-xs ${
                msg.role === "user"
                  ? "justify-end"
                  : "justify-start items-start"
              }`}
            >
              {msg.role === "assistant" && (
                <div className="size-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="size-4" />
                </div>
              )}

              <div
                className={`space-y-1.5 transition-all ${
                  msg.role === "user"
                    ? "max-w-[80%] rounded-2xl rounded-br-xs p-3.5 bg-primary text-primary-foreground shadow-xs leading-relaxed"
                    : `max-w-[85%] rounded-2xl rounded-bl-xs p-3.5 bg-card text-foreground border shadow-2xs leading-relaxed ${
                        msg.turnId && msg.turnId === selectedTurnId
                          ? "border-primary ring-1 ring-primary/30"
                          : "border-border/70"
                      }`
                }`}
              >
                <p className="leading-relaxed whitespace-pre-wrap">
                  {msg.content}
                </p>

                {msg.role === "assistant" && (msg.turnId || msg.traceId) && (
                  <div className="pt-1 border-t border-border/50 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        onSelectTurnTrace?.(msg.turnId, msg.traceId)
                      }
                      className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Activity className="size-3 text-primary" />
                      <span>Activity details</span>
                    </button>
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      {msg.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
