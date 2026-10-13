"use client";

import { type VoiceState, type VoiceMessage } from "@/lib/voice/types";
import { type BookingState } from "@/lib/receptionist/types";
import { Badge } from "@/components/ui/badge";
import {
  Mic,
  Bot,
  User,
  Calendar,
  Clock,
  CheckCircle2,
  Volume2,
} from "lucide-react";

interface VoiceTranscriptProps {
  state: VoiceState;
  messages: VoiceMessage[];
  interimTranscript: string;
  finalTranscript: string;
  bookingState: BookingState;
  onSelectPrompt?: (prompt: string) => void;
}

const VOICE_SAMPLE_PROMPTS = [
  "What are your clinic operating hours?",
  "Do you have teeth whitening available?",
  "I'd like to book an appointment tomorrow morning.",
  "How much does a routine cleaning cost?",
  "Where is your clinic located?",
];

export function VoiceTranscript({
  state,
  messages,
  interimTranscript,
  finalTranscript,
  bookingState,
  onSelectPrompt,
}: VoiceTranscriptProps) {
  const activeSpeechText = interimTranscript || finalTranscript;

  return (
    <div className="space-y-4">
      {/* Live Audio / Speaking Active Monitor */}
      {(state === "listening" || state === "speaking" || activeSpeechText) && (
        <div className="p-3.5 rounded-[4px] border border-primary/30 bg-primary/5 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono text-primary font-semibold">
            <span className="flex items-center gap-1.5">
              {state === "speaking" ? (
                <>
                  <Volume2 className="size-3.5 animate-bounce" />
                  RECEPTIONIST AUDIO OUTPUT
                </>
              ) : (
                <>
                  <Mic className="size-3.5 animate-pulse text-red-500" />
                  PATIENT MICROPHONE INPUT
                </>
              )}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Real-time Transcribing
            </span>
          </div>

          <div className="text-sm font-medium text-foreground min-h-6 flex items-center">
            {activeSpeechText ? (
              <p className="italic text-foreground/90">
                &ldquo;{activeSpeechText}&rdquo;
              </p>
            ) : (
              <span className="text-xs text-muted-foreground italic flex items-center gap-1.5">
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
        <div className="rounded-[4px] border border-border bg-muted/40 p-3 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
            <span className="flex items-center gap-1 text-foreground">
              <Calendar className="size-3.5 text-primary" /> Active Booking
              Context
            </span>
            <Badge
              variant="outline"
              className="text-[10px] font-mono uppercase border-border"
            >
              {bookingState.status || "In Progress"}
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
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
            <div className="text-[11px] font-medium text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-[2px] flex items-center gap-1.5">
              <span>
                ⚠️ Awaiting patient confirmation to finalize appointment
                reservation.
              </span>
            </div>
          )}

          {bookingState.isConfirmed && (
            <div className="text-[11px] font-medium text-emerald-800 dark:text-emerald-300 bg-emerald-500/10 border border-emerald-600/20 px-2 py-1 rounded-[2px] flex items-center gap-1.5">
              <CheckCircle2 className="size-3 text-emerald-600" />
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
          <div className="flex flex-col items-center justify-center py-8 text-center space-y-3 border border-dashed border-border rounded-[4px] p-6">
            <div className="size-9 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <Mic className="size-4" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-foreground">
                No voice turns yet
              </p>
              <p className="text-[11px] text-muted-foreground max-w-sm">
                Click &quot;Start Voice Conversation&quot; and speak aloud to
                ask about clinic hours, prices, dentist availability, or
                booking.
              </p>
            </div>

            <div className="pt-2 flex flex-wrap justify-center gap-1.5 max-w-md">
              {VOICE_SAMPLE_PROMPTS.map((sample) => (
                <button
                  key={sample}
                  type="button"
                  onClick={() => onSelectPrompt?.(sample)}
                  className="text-[11px] px-2 py-1 rounded-[2px] bg-muted/60 hover:bg-muted text-foreground border border-border transition-colors text-left"
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
              className={`flex gap-3 text-xs ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {msg.role === "assistant" && (
                <div className="size-6 rounded-[2px] bg-primary flex items-center justify-center text-primary-foreground shrink-0 mt-0.5">
                  <Bot className="size-3.5" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-[4px] p-3 border space-y-1 ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-foreground border-border"
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-[10px] opacity-75 font-mono">
                  <span>
                    {msg.role === "user" ? "PATIENT" : "RECEPTIONIST"}
                  </span>
                  <span className="tabular-nums">
                    {msg.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="leading-relaxed whitespace-pre-wrap">
                  {msg.content}
                </p>
              </div>

              {msg.role === "user" && (
                <div className="size-6 rounded-[2px] bg-muted border border-border flex items-center justify-center text-muted-foreground shrink-0 mt-0.5">
                  <User className="size-3.5" />
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
