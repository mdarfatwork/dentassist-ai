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
        className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-900 dark:text-amber-200 space-y-1.5 shadow-2xs"
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
            className="gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-primary text-primary-foreground border-transparent animate-pulse shadow-xs"
          >
            <span className="size-2 rounded-full bg-red-400 animate-ping inline-block" />
            <Mic className="size-3.5" />
            <span>Listening</span>
          </Badge>
        );
      case "processing":
        return (
          <Badge
            variant="secondary"
            className="gap-1.5 px-3 py-1 text-xs font-medium rounded-full border-primary/20 text-primary bg-primary/10 shadow-xs"
          >
            <Loader2 className="size-3.5 animate-spin text-primary" />
            <span>Thinking</span>
          </Badge>
        );
      case "speaking":
        return (
          <Badge
            variant="default"
            className="gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-primary text-primary-foreground border-transparent shadow-xs"
          >
            <Volume2 className="size-3.5 animate-bounce" />
            <span>Speaking</span>
          </Badge>
        );
      case "requesting_permission":
        return (
          <Badge
            variant="secondary"
            className="gap-1.5 px-3 py-1 text-xs font-medium rounded-full border-border bg-muted text-muted-foreground"
          >
            <Loader2 className="size-3.5 animate-spin" />
            <span>Requesting microphone</span>
          </Badge>
        );
      case "error":
        return (
          <Badge
            variant="destructive"
            className="gap-1.5 px-3 py-1 text-xs font-medium rounded-full shadow-xs"
          >
            <AlertCircle className="size-3.5" />
            <span>Error</span>
          </Badge>
        );
      case "ended":
        return (
          <Badge
            variant="outline"
            className="gap-1.5 px-3 py-1 text-xs font-medium rounded-full text-muted-foreground border-border/80 bg-muted/30"
          >
            <Square className="size-3" />
            <span>Ended</span>
          </Badge>
        );
      case "idle":
      default:
        return (
          <Badge
            variant="outline"
            className="gap-1.5 px-3 py-1 text-xs font-medium rounded-full text-foreground border-border/80 bg-muted/40 shadow-2xs"
          >
            <span className="size-2 rounded-full bg-emerald-500 inline-block" />
            <span>Ready</span>
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
      </div>

      {/* Insecure Origin Alert */}
      {isInsecureOrigin && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-950 dark:text-amber-200 space-y-2 shadow-2xs">
          <div className="flex items-center gap-2 font-semibold text-amber-800 dark:text-amber-300">
            <Globe className="size-4 shrink-0" />
            <span>Insecure Network Origin Detected</span>
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Mobile and desktop browsers block microphone and Web Speech APIs on
            plain HTTP network IP addresses (like{" "}
            <code className="px-1.5 py-0.5 rounded-md bg-muted font-mono text-foreground">
              {typeof window !== "undefined" ? window.location.host : ""}
            </code>
            ).
          </p>
          <div className="text-[11px] space-y-1 text-muted-foreground pl-1">
            <div>
              • <strong>Recommended:</strong> Test on your PC via{" "}
              <code className="px-1.5 py-0.5 rounded-md bg-muted font-mono text-foreground">
                http://localhost:3000
              </code>{" "}
              which browsers treat as secure.
            </div>
            <div>
              • <strong>On Phone (Chrome):</strong> Navigate to{" "}
              <code className="px-1.5 py-0.5 rounded-md bg-muted font-mono text-foreground">
                chrome://flags/#unsafely-treat-insecure-origin-as-secure
              </code>
              , enable it, add your IP, and relaunch Chrome.
            </div>
          </div>
        </div>
      )}

      {/* Permission Denied Warning */}
      {microphonePermissionState === "denied" && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive space-y-2 shadow-2xs">
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
                className="h-7 text-xs px-3 rounded-lg bg-card border-destructive/40 hover:bg-destructive/10 text-destructive font-medium"
              >
                Allow Microphone
              </Button>
            )}
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Your browser blocked microphone access. Click the lock or settings
            icon next to the URL address bar, toggle <strong>Microphone</strong>{" "}
            to <strong>Allow</strong>, then click Retry.
          </p>
        </div>
      )}

      {/* Permission Prompt Banner */}
      {microphonePermissionState === "prompt" && state === "idle" && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 text-xs flex items-center justify-between gap-3 shadow-2xs">
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
              className="h-7 text-xs px-3 rounded-lg bg-primary text-primary-foreground font-semibold shadow-none"
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
          className="rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive flex items-start justify-between gap-3 shadow-2xs"
        >
          <div className="flex items-start gap-2">
            <ShieldAlert className="size-4 shrink-0 mt-0.5" />
            <p className="leading-snug text-[11px]">{errorNotice}</p>
          </div>
          {onRetry && (
            <button
              onClick={onRetry}
              type="button"
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-card border border-destructive/30 hover:bg-muted text-foreground shrink-0 transition-colors"
            >
              Retry
            </button>
          )}
        </div>
      )}
    </div>
  );
}
