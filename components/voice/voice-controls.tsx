"use client";

import { type VoiceState } from "@/lib/voice/types";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  MicOff,
  PhoneCall,
  PhoneOff,
  VolumeX,
  RotateCcw,
  MessageSquare,
  Loader2,
  Mic,
  ShieldAlert,
} from "lucide-react";
import { type MicrophonePermissionState } from "@/lib/voice/types";

interface VoiceControlsProps {
  state: VoiceState;
  isSupported: boolean;
  isAutoListen: boolean;
  microphonePermissionState?: MicrophonePermissionState;
  onToggleAutoListen: (enabled: boolean) => void;
  onStartSession: () => void;
  onEndSession: () => void;
  onStopListening: () => void;
  onInterrupt: () => void;
  onRetry: () => void;
  onToggleTextFallback: () => void;
  showTextFallback: boolean;
}

export function VoiceControls({
  state,
  isSupported,
  isAutoListen,
  microphonePermissionState,
  onToggleAutoListen,
  onStartSession,
  onEndSession,
  onStopListening,
  onInterrupt,
  onRetry,
  onToggleTextFallback,
  showTextFallback,
}: VoiceControlsProps) {
  const isSessionActive =
    state === "listening" ||
    state === "processing" ||
    state === "speaking" ||
    state === "requesting_permission";

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl border border-border/80 bg-muted/20 shadow-xs">
      {/* Dominant Voice Action Button */}
      <div className="flex items-center gap-2.5 w-full sm:w-auto">
        {!isSessionActive ? (
          <Button
            onClick={onStartSession}
            disabled={!isSupported}
            className="w-full sm:w-auto gap-2 text-xs font-semibold h-10 px-5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xs"
          >
            {microphonePermissionState === "denied" ? (
              <>
                <ShieldAlert className="size-4" />
                <span>Microphone Blocked (Retry)</span>
              </>
            ) : microphonePermissionState === "prompt" ? (
              <>
                <Mic className="size-4" />
                <span>Allow Mic & Start</span>
              </>
            ) : (
              <>
                <PhoneCall className="size-4" />
                <span>Start Voice Conversation</span>
              </>
            )}
          </Button>
        ) : state === "requesting_permission" ? (
          <Button
            disabled
            className="w-full sm:w-auto gap-2 text-xs font-semibold h-10 px-5 rounded-xl bg-muted text-muted-foreground shadow-none"
          >
            <Loader2 className="size-4 animate-spin" />
            <span>Requesting Microphone...</span>
          </Button>
        ) : (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {state === "speaking" && (
              <Button
                onClick={onInterrupt}
                variant="destructive"
                className="gap-1.5 text-xs font-semibold h-10 px-3.5 rounded-xl shadow-xs animate-pulse"
                title="Interrupt assistant speaking and talk now"
              >
                <VolumeX className="size-3.5" />
                <span>Interrupt Speaking</span>
              </Button>
            )}

            {state === "listening" && (
              <Button
                onClick={onStopListening}
                variant="outline"
                className="gap-1.5 text-xs font-semibold h-10 px-3.5 rounded-xl border-primary/40 text-primary hover:bg-primary/10 shadow-xs"
                title="Finish utterance and send immediately"
              >
                <MicOff className="size-3.5" />
                <span>Done Speaking</span>
              </Button>
            )}

            <Button
              onClick={onEndSession}
              variant="outline"
              className="gap-1.5 text-xs font-semibold h-10 px-3.5 rounded-xl border-border/80 text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive/30 shadow-xs"
              title="Terminate voice receptionist session"
            >
              <PhoneOff className="size-3.5 text-destructive" />
              <span>End Conversation</span>
            </Button>
          </div>
        )}

        {state === "error" && (
          <Button
            onClick={onRetry}
            variant="outline"
            className="gap-1.5 text-xs font-semibold h-10 px-3.5 rounded-xl shadow-xs"
          >
            <RotateCcw className="size-3.5" />
            <span>Retry</span>
          </Button>
        )}
      </div>

      {/* Secondary Settings: Continuous Mode & Text Mode toggle */}
      <div className="flex items-center gap-5 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-border/60">
        <div className="flex items-center gap-2">
          <Switch
            id="voice-continuous-mode"
            checked={isAutoListen}
            onCheckedChange={onToggleAutoListen}
          />
          <label
            htmlFor="voice-continuous-mode"
            className="text-xs font-medium text-foreground cursor-pointer select-none"
          >
            Continuous Mode
          </label>
        </div>

        <Button
          onClick={onToggleTextFallback}
          variant="ghost"
          size="sm"
          className="rounded-xl gap-1.5 text-xs text-muted-foreground hover:text-foreground h-8 px-2.5"
        >
          <MessageSquare className="size-3.5 text-primary" />
          <span>{showTextFallback ? "Hide Text" : "Text Fallback"}</span>
        </Button>
      </div>
    </div>
  );
}
