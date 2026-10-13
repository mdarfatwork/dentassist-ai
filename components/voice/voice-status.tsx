"use client";

import {
  type VoiceState,
  type MicrophonePermissionState,
} from "@/lib/voice/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Mic,
  MicOff,
  Volume2,
  Loader2,
  AlertCircle,
  Square,
  Sparkles,
  ShieldAlert,
  Globe,
} from "lucide-react";

interface VoiceStatusProps {
  state: VoiceState;
  isSupported: boolean;
  errorNotice: string | null;
  microphonePermissionState?: MicrophonePermissionState;
  isInsecureOrigin?: boolean;
  onRequestPermission?: () => void;
  onRetry?: () => void;
}

export function VoiceStatus({
  state,
  isSupported,
  errorNotice,
  microphonePermissionState = "checking",
  isInsecureOrigin = false,
  onRequestPermission,
  onRetry,
}: VoiceStatusProps) {
  if (!isSupported) {
    return (
      <div
        role="alert"
        className="rounded-[4px] border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-900 dark:text-amber-200 space-y-1"
      >
        <div className="flex items-center gap-2 font-semibold">
          <AlertCircle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>Browser Voice Engine Unavailable</span>
        </div>
        <p className="text-[11px] leading-relaxed text-muted-foreground pl-6">
          Your current browser does not support the Web Speech API
          (SpeechRecognition or SpeechSynthesis). For voice features, please use
          Google Chrome, Microsoft Edge, or Safari, or switch to text mode
          below.
        </p>
      </div>
    );
  }

  const getStatusBadge = () => {
    switch (state) {
      case "listening":
        return (
          <Badge
            variant="default"
            className="gap-1.5 px-2.5 py-1 text-xs font-semibold bg-primary text-primary-foreground border-transparent animate-pulse"
          >
            <span className="size-2 rounded-full bg-red-400 animate-ping inline-block" />
            <Mic className="size-3.5" />
            <span>Listening to patient...</span>
          </Badge>
        );
      case "processing":
        return (
          <Badge
            variant="secondary"
            className="gap-1.5 px-2.5 py-1 text-xs font-semibold border-primary/30 text-primary bg-primary/10"
          >
            <Loader2 className="size-3.5 animate-spin text-primary" />
            <span>Processing with AI Core & tools...</span>
          </Badge>
        );
      case "speaking":
        return (
          <Badge
            variant="default"
            className="gap-1.5 px-2.5 py-1 text-xs font-semibold bg-primary text-primary-foreground border-transparent"
          >
            <Volume2 className="size-3.5 animate-bounce" />
            <span>Receptionist speaking aloud</span>
          </Badge>
        );
      case "requesting_permission":
        return (
          <Badge
            variant="secondary"
            className="gap-1.5 px-2.5 py-1 text-xs font-semibold border-border bg-muted text-muted-foreground"
          >
            <Loader2 className="size-3.5 animate-spin" />
            <span>Requesting microphone permission...</span>
          </Badge>
        );
      case "error":
        return (
          <Badge
            variant="destructive"
            className="gap-1.5 px-2.5 py-1 text-xs font-semibold"
          >
            <AlertCircle className="size-3.5" />
            <span>Audio session error</span>
          </Badge>
        );
      case "ended":
        return (
          <Badge
            variant="outline"
            className="gap-1.5 px-2.5 py-1 text-xs font-medium text-muted-foreground"
          >
            <Square className="size-3" />
            <span>Session ended</span>
          </Badge>
        );
      case "idle":
      default:
        return (
          <Badge
            variant="outline"
            className="gap-1.5 px-2.5 py-1 text-xs font-medium text-muted-foreground border-border bg-card"
          >
            <Sparkles className="size-3 text-primary" />
            <span>Standby • Ready to start</span>
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-3">
      <div
        role="status"
        aria-live="polite"
        className="flex items-center justify-between gap-3"
      >
        <div className="flex items-center gap-2">{getStatusBadge()}</div>

        <div className="text-[11px] font-mono text-muted-foreground tabular-nums">
          STATE: {state.toUpperCase()}
        </div>
      </div>

      {/* Insecure Origin Alert */}
      {isInsecureOrigin && (
        <div className="rounded-[4px] border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-950 dark:text-amber-200 space-y-2">
          <div className="flex items-center gap-2 font-semibold text-amber-800 dark:text-amber-300">
            <Globe className="size-4 shrink-0" />
            <span>Insecure Network Origin Detected</span>
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Mobile and desktop browsers block microphone and Web Speech APIs on
            plain HTTP network IP addresses (like{" "}
            <code className="px-1 py-0.5 rounded bg-muted font-mono text-foreground">
              {typeof window !== "undefined" ? window.location.host : ""}
            </code>
            ).
          </p>
          <div className="text-[11px] space-y-1 text-muted-foreground pl-1">
            <div>
              • <strong>Recommended:</strong> Test on your PC via{" "}
              <code className="px-1 py-0.5 rounded bg-muted font-mono text-foreground">
                http://localhost:3000
              </code>{" "}
              which browsers treat as secure.
            </div>
            <div>
              • <strong>On Phone (Chrome):</strong> Navigate to{" "}
              <code className="px-1 py-0.5 rounded bg-muted font-mono text-foreground">
                chrome://flags/#unsafely-treat-insecure-origin-as-secure
              </code>
              , enable it, add your IP, and relaunch Chrome.
            </div>
          </div>
        </div>
      )}

      {/* Permission Denied Warning */}
      {microphonePermissionState === "denied" && (
        <div className="rounded-[4px] border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold">
              <MicOff className="size-4 shrink-0 text-destructive" />
              <span>Microphone Access Blocked</span>
            </div>
            {onRequestPermission && (
              <Button
                type="button"
                size="sm"
                onClick={onRequestPermission}
                variant="outline"
                className="h-6 text-[11px] px-2.5 rounded-[2px] bg-card border-destructive/40 hover:bg-destructive/10 text-destructive font-medium"
              >
                Allow Microphone
              </Button>
            )}
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Your browser blocked microphone access. Click the lock or settings
            icon (🔒 / ⚙️) next to the URL address bar, toggle{" "}
            <strong>Microphone</strong> to <strong>Allow</strong>, then click
            Retry.
          </p>
        </div>
      )}

      {/* Permission Prompt Banner */}
      {microphonePermissionState === "prompt" && state === "idle" && (
        <div className="rounded-[4px] border border-primary/20 bg-primary/5 p-3 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Mic className="size-4 text-primary shrink-0" />
            <span className="text-[11px] text-muted-foreground">
              Microphone permission is required to converse with the
              receptionist.
            </span>
          </div>
          {onRequestPermission && (
            <Button
              type="button"
              size="sm"
              onClick={onRequestPermission}
              className="h-6 text-[11px] px-2.5 rounded-[2px] bg-primary text-primary-foreground font-semibold shadow-none"
            >
              Allow Microphone
            </Button>
          )}
        </div>
      )}

      {/* General Error Notice */}
      {errorNotice && microphonePermissionState !== "denied" && (
        <div
          role="alert"
          className="rounded-[3px] border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-start justify-between gap-3"
        >
          <div className="flex items-start gap-2">
            <ShieldAlert className="size-4 shrink-0 mt-0.5" />
            <p className="leading-snug text-[11px]">{errorNotice}</p>
          </div>
          {onRetry && (
            <button
              onClick={onRetry}
              type="button"
              className="px-2 py-0.5 text-[11px] font-semibold rounded-[2px] bg-card border border-destructive/30 hover:bg-muted text-foreground shrink-0 transition-colors"
            >
              Retry
            </button>
          )}
        </div>
      )}
    </div>
  );
}
