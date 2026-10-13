"use client";

import { type VoiceState } from "@/lib/voice/types";
import { Button } from "@/components/ui/button";
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
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-[4px] border border-border bg-card">
      {/* Primary Voice Action Button */}
      <div className="flex items-center gap-3 w-full sm:w-auto">
        {!isSessionActive ? (
          <Button
            onClick={onStartSession}
            disabled={!isSupported}
            className="w-full sm:w-auto gap-2 text-xs font-semibold h-9 px-4 rounded-[3px] bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-none"
          >
            {microphonePermissionState === "denied" ? (
              <>
                <ShieldAlert className="size-3.5" />
                <span>Microphone Blocked (Retry)</span>
              </>
            ) : microphonePermissionState === "prompt" ? (
              <>
                <Mic className="size-3.5" />
                <span>Allow Mic & Start Call</span>
              </>
            ) : (
              <>
                <PhoneCall className="size-3.5" />
                <span>Start Voice Conversation</span>
              </>
            )}
          </Button>
        ) : state === "requesting_permission" ? (
          <Button
            disabled
            className="w-full sm:w-auto gap-2 text-xs font-semibold h-9 px-4 rounded-[3px] bg-muted text-muted-foreground shadow-none"
          >
            <Loader2 className="size-3.5 animate-spin" />
            <span>Requesting Microphone...</span>
          </Button>
        ) : (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {state === "speaking" && (
              <Button
                onClick={onInterrupt}
                variant="destructive"
                className="gap-1.5 text-xs font-semibold h-9 px-3 rounded-[3px] shadow-none animate-pulse"
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
                className="gap-1.5 text-xs font-semibold h-9 px-3 rounded-[3px] border-primary/40 text-primary hover:bg-primary/10 shadow-none"
                title="Finish utterance and send immediately"
              >
                <MicOff className="size-3.5" />
                <span>Done Speaking</span>
              </Button>
            )}

            <Button
              onClick={onEndSession}
              variant="outline"
              className="gap-1.5 text-xs font-semibold h-9 px-3 rounded-[3px] border-border text-muted-foreground hover:text-foreground shadow-none"
              title="Terminate voice receptionist session"
            >
              <PhoneOff className="size-3.5 text-destructive" />
              <span>End Call</span>
            </Button>
          </div>
        )}

        {state === "error" && (
          <Button
            onClick={onRetry}
            variant="outline"
            className="gap-1.5 text-xs font-semibold h-9 px-3 rounded-[3px] shadow-none"
          >
            <RotateCcw className="size-3.5" />
            <span>Retry</span>
          </Button>
        )}
      </div>

      {/* Secondary Controls: Auto-listen toggle & Text Mode toggle */}
      <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-border">
        <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-muted-foreground hover:text-foreground transition-colors">
          <input
            type="checkbox"
            checked={isAutoListen}
            onChange={(e) => onToggleAutoListen(e.target.checked)}
            className="size-3.5 rounded-[2px] border-border text-primary focus:ring-primary focus:ring-1"
          />
          <span className="text-[11px] font-medium">Continuous Mode</span>
        </label>

        <Button
          onClick={onToggleTextFallback}
          variant="ghost"
          size="sm"
          className="gap-1.5 text-xs text-muted-foreground hover:text-foreground h-8 px-2.5 rounded-[3px]"
        >
          <MessageSquare className="size-3.5 text-primary" />
          <span>{showTextFallback ? "Hide Text" : "Text Fallback"}</span>
        </Button>
      </div>
    </div>
  );
}
