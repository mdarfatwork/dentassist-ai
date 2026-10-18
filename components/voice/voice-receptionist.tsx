"use client";

import { useState } from "react";
import { useOrganization } from "@/components/organization/organization-provider";
import { useVoiceConversation } from "@/hooks/use-voice-conversation";
import { VoiceStatus } from "./voice-status";
import { VoiceControls } from "./voice-controls";
import { VoiceTranscript } from "./voice-transcript";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Stethoscope,
  Clock,
  Send,
  ShieldCheck,
  Languages,
  Sparkles,
} from "lucide-react";

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
  const { activeOrganization } = useOrganization();
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
    <div className="rounded-[4px] border border-border bg-card overflow-hidden space-y-0">
      {/* Clinic Header Bar */}
      <div className="border-b border-border bg-muted/30 px-5 py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[2px] border border-primary/20 bg-primary/10 text-primary text-[10px] font-semibold tracking-tight uppercase">
              <Sparkles className="size-3" /> Voice Receptionist MVP
            </span>
            <span className="text-[11px] font-mono text-muted-foreground">
              {activeOrganization?.slug}
            </span>
          </div>

          <h2 className="text-base font-bold text-foreground flex items-center gap-2 tracking-tight">
            <Stethoscope className="size-4 text-primary" />
            <span>
              {activeOrganization?.name || "Dental Clinic Receptionist"}
            </span>
          </h2>
        </div>

        <div className="flex items-center gap-3">
          {/* Language Selector */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Languages className="size-3.5 text-primary" />
            <select
              aria-label="Speech Recognition Language"
              value={speechRecognition.language}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="text-[11px] font-medium bg-card border border-border rounded-[2px] px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>

          {onBackToChat && (
            <Button
              onClick={onBackToChat}
              variant="outline"
              size="sm"
              className="h-7 text-xs px-2.5 rounded-[2px] border-border text-muted-foreground hover:text-foreground"
            >
              Switch to Chat
            </Button>
          )}
        </div>
      </div>

      {/* Main Voice Interaction Body */}
      <div className="p-5 space-y-5">
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

        {/* Fallback Text Input (Accessible for unsupported browsers or quiet environments) */}
        {showTextFallback && (
          <form
            onSubmit={handleSendText}
            className="flex items-center gap-2 pt-2 border-t border-border"
          >
            <Input
              value={fallbackText}
              onChange={(e) => setFallbackText(e.target.value)}
              placeholder="Type your message if voice input is unavailable..."
              disabled={state === "processing"}
              className="h-9 text-xs rounded-[3px] border-border focus:ring-primary"
            />
            <Button
              type="submit"
              disabled={!fallbackText.trim() || state === "processing"}
              className="h-9 px-3.5 text-xs font-semibold rounded-[3px] bg-primary text-primary-foreground hover:bg-primary/90 shadow-none"
            >
              <Send className="size-3.5" />
              <span className="sr-only sm:not-sr-only sm:ml-1.5">Send</span>
            </Button>
          </form>
        )}

        {/* Privacy & Browser Disclosure */}
        <div className="pt-2 border-t border-border/60 flex flex-col sm:flex-row items-start sm:items-center justify-between text-[11px] text-muted-foreground gap-2">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="size-3 text-primary" />
            <span>
              Voice is processed via browser Web Speech API. No audio recordings
              are retained on server storage.
            </span>
          </div>

          <div className="flex items-center gap-2 font-mono text-[10px]">
            <Clock className="size-3" />
            <span>Timezone: {activeOrganization?.timezone || "UTC"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
