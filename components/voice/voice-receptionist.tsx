"use client";

import { useState } from "react";
import { useVoiceConversation } from "@/hooks/use-voice-conversation";
import { VoiceStatus } from "./voice-status";
import { VoiceControls } from "./voice-controls";
import { VoiceTranscript } from "./voice-transcript";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Send, ShieldCheck, Languages, Mic } from "lucide-react";

import { type VoiceTurnResponse } from "@/lib/voice/types";

interface VoiceReceptionistProps {
  onBackToChat?: () => void;
  onTurnComplete?: (response: VoiceTurnResponse) => void;
  onSelectTurnTrace?: (turnId?: string, traceId?: string) => void;
  selectedTurnId?: string;
}

const SUPPORTED_LANGUAGES = [
  { code: "en-US", label: "English (US)" },
  { code: "en-GB", label: "English (UK)" },
  { code: "en-IN", label: "English (India)" },
  { code: "hi-IN", label: "Hindi (हिन्दी)" },
];

export function VoiceReceptionist({
  onBackToChat,
  onTurnComplete,
  onSelectTurnTrace,
  selectedTurnId,
}: VoiceReceptionistProps) {
  const [showTextFallback, setShowTextFallback] = useState<boolean>(false);
  const [fallbackText, setFallbackText] = useState<string>("");

  const {
    state,
    messages,
    bookingState,
    errorNotice,
    isAutoListen,
    setIsAutoListen,
    isSupported,
    interimTranscript,
    finalTranscript,
    microphonePermissionState,
    isInsecureOrigin,
    requestMicrophonePermission,
    startSession,
    endSession,
    interruptPlayback,
    stopListeningAndSend,
    retry,
    sendTextMessage,
    speechRecognition,
  } = useVoiceConversation({
    autoListenAfterSpeech: true,
    onTurnComplete,
  });

  const handleSendText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fallbackText.trim() || state === "processing") return;
    const textToSend = fallbackText;
    setFallbackText("");
    await sendTextMessage(textToSend);
  };

  const handleLanguageChange = (newLang: string) => {
    speechRecognition.setLanguage(newLang);
  };

  const handleSelectSamplePrompt = (prompt: string) => {
    void sendTextMessage(prompt);
  };

  return (
    <div className="flex flex-col h-full bg-card overflow-hidden">
      {/* Compact Voice Header Bar */}
      <div className="border-b border-border/80 bg-muted/20 px-5 py-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="size-7 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <Mic className="size-3.5" />
          </div>
          <h3 className="text-sm sm:text-base font-semibold text-foreground tracking-tight">
            Voice Receptionist
          </h3>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Language Selector */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Languages className="size-3.5 text-primary shrink-0" />
            <Select
              value={speechRecognition.language}
              onValueChange={(val) => {
                if (val) handleLanguageChange(val);
              }}
            >
              <SelectTrigger
                aria-label="Speech Recognition Language"
                className="h-8 text-xs font-medium bg-background border-border/80 rounded-xl px-2.5 py-1 min-w-[130px] focus:ring-1 focus:ring-primary"
              >
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <SelectItem
                    key={lang.code}
                    value={lang.code}
                    className="rounded-lg text-xs"
                  >
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {onBackToChat && (
            <Button
              onClick={onBackToChat}
              variant="outline"
              size="sm"
              className="h-8 text-xs px-3 rounded-xl border-border/80 text-muted-foreground hover:text-foreground"
            >
              Switch to Chat
            </Button>
          )}
        </div>
      </div>

      {/* Main Voice Interaction Body */}
      <div className="p-5 space-y-5 flex-1 overflow-y-auto">
        {/* Live Status and Error Reporting */}
        <VoiceStatus
          state={state}
          isSupported={isSupported}
          errorNotice={errorNotice}
          microphonePermissionState={microphonePermissionState}
          isInsecureOrigin={isInsecureOrigin}
          onRequestPermission={requestMicrophonePermission}
          onRetry={retry}
        />

        {/* Live Audio Transcript Display & Conversation History */}
        <VoiceTranscript
          state={state}
          messages={messages}
          interimTranscript={interimTranscript}
          finalTranscript={finalTranscript}
          bookingState={bookingState}
          selectedTurnId={selectedTurnId}
          onSelectPrompt={handleSelectSamplePrompt}
          onSelectTurnTrace={onSelectTurnTrace}
        />

        {/* Interactive Controls (Start / Stop / Interrupt / End Call) */}
        <VoiceControls
          state={state}
          isSupported={isSupported}
          isAutoListen={isAutoListen}
          microphonePermissionState={microphonePermissionState}
          onToggleAutoListen={setIsAutoListen}
          onStartSession={startSession}
          onEndSession={endSession}
          onStopListening={stopListeningAndSend}
          onInterrupt={interruptPlayback}
          onRetry={retry}
          onToggleTextFallback={() => setShowTextFallback((prev) => !prev)}
          showTextFallback={showTextFallback}
        />

        {/* Fallback Text Input (Accessible for quiet environments) */}
        {showTextFallback && (
          <form
            onSubmit={handleSendText}
            className="flex items-center gap-2 pt-2 border-t border-border/60"
          >
            <Input
              value={fallbackText}
              onChange={(e) => setFallbackText(e.target.value)}
              placeholder="Type your message if voice input is unavailable..."
              disabled={state === "processing"}
              className="h-9 text-xs rounded-xl border-border/80 focus:ring-primary"
            />
            <Button
              type="submit"
              disabled={!fallbackText.trim() || state === "processing"}
              className="h-9 px-3.5 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-none"
            >
              <Send className="size-3.5" />
              <span className="sr-only sm:not-sr-only sm:ml-1.5">Send</span>
            </Button>
          </form>
        )}

        {/* Concise Privacy Disclosure */}
        <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="size-3.5 text-primary" />
            <span>
              Voice audio is processed locally via browser Web Speech API. No
              audio recordings are retained on servers.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
