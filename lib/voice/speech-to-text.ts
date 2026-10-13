import {
  type SpeechToTextAdapter,
  type SpeechToTextCallbacks,
  type SpeechRecognitionErrorDetails,
} from "./types";

interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: {
    length: number;
    item(index: number): {
      isFinal: boolean;
      length: number;
      item(index: number): { transcript: string; confidence: number };
      [index: number]: { transcript: string; confidence: number };
    };
    [index: number]: {
      isFinal: boolean;
      length: number;
      item(index: number): { transcript: string; confidence: number };
      [index: number]: { transcript: string; confidence: number };
    };
  };
}

interface SpeechRecognitionErrorEventLike extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionInstanceLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onstart: ((ev: Event) => void) | null;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  onerror: ((ev: SpeechRecognitionErrorEventLike) => void) | null;
  onend: ((ev: Event) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstanceLike;

function getSpeechRecognitionClass(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const win = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return win.SpeechRecognition || win.webkitSpeechRecognition || null;
}

export function isSecureOrigin(): boolean {
  if (typeof window === "undefined") return true;
  if (window.isSecureContext) return true;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
}

export class WebSpeechToTextAdapter implements SpeechToTextAdapter {
  private recognition: SpeechRecognitionInstanceLike | null = null;
  private language: string = "en-US";
  private isRunning: boolean = false;
  private isExplicitStop: boolean = false;
  private currentCallbacks: SpeechToTextCallbacks | null = null;
  private restartTimeout: NodeJS.Timeout | null = null;
  private silenceTimer: NodeJS.Timeout | null = null;
  private accumulatedFinalTranscript: string = "";
  private lastInterimTranscript: string = "";

  public isSupported(): boolean {
    return getSpeechRecognitionClass() !== null;
  }

  public setLanguage(lang: string): void {
    this.language = lang;
    if (this.recognition) {
      this.recognition.lang = lang;
    }
  }

  public getLanguage(): string {
    return this.language;
  }

  public start(callbacks: SpeechToTextCallbacks): void {
    if (typeof window !== "undefined" && !isSecureOrigin()) {
      callbacks.onError?.({
        code: "insecure-origin",
        message: `Voice recognition is blocked by browser security policy on non-secure origins (http://${window.location.host}). Please access via http://localhost:3000, HTTPS, or enable Chrome's insecure origin flag for this IP.`,
        isFatal: true,
      });
      return;
    }

    const RecognitionClass = getSpeechRecognitionClass();
    if (!RecognitionClass) {
      callbacks.onError?.({
        code: "not-supported",
        message:
          "Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari, or switch to text mode.",
        isFatal: true,
      });
      return;
    }

    this.clearTimers();
    this.isExplicitStop = false;
    this.accumulatedFinalTranscript = "";
    this.lastInterimTranscript = "";

    // If already running, abort previous instance before starting anew
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch {
        // ignore abort errors
      }
    }

    this.currentCallbacks = callbacks;
    this.initAndStart(RecognitionClass);
  }

  private initAndStart(RecognitionClass: SpeechRecognitionConstructor): void {
    try {
      const recognition = new RecognitionClass();
      recognition.continuous = true; // Keep listening through pauses
      recognition.interimResults = true;
      recognition.lang = this.language;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        this.isRunning = true;
        this.currentCallbacks?.onStart?.();
      };

      recognition.onresult = (event: SpeechRecognitionEventLike) => {
        let interimTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          if (res.isFinal) {
            const finalChunk = res[0].transcript.trim();
            if (finalChunk) {
              this.accumulatedFinalTranscript = this.accumulatedFinalTranscript
                ? `${this.accumulatedFinalTranscript} ${finalChunk}`
                : finalChunk;
            }
          } else {
            interimTranscript += res[0].transcript;
          }
        }

        this.lastInterimTranscript = interimTranscript.trim();

        // Emit live interim feedback for UI
        const currentDisplay = [
          this.accumulatedFinalTranscript,
          this.lastInterimTranscript,
        ]
          .filter(Boolean)
          .join(" ");

        if (currentDisplay) {
          this.currentCallbacks?.onResult?.(currentDisplay, false);
        }

        // Reset silence timer on every spoken word
        if (this.silenceTimer) {
          clearTimeout(this.silenceTimer);
        }

        // If user spoke something and pauses for 1.8s, automatically commit turn
        if (this.accumulatedFinalTranscript || this.lastInterimTranscript) {
          this.silenceTimer = setTimeout(() => {
            if (this.isRunning && !this.isExplicitStop) {
              this.flushAndCommit();
            }
          }, 1800);
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
        const errorDetails = this.formatError(event.error);

        // 'no-speech' happens when user pauses or waits before speaking
        if (event.error === "no-speech") {
          // Non-fatal, keep listening
          return;
        }

        if (event.error !== "aborted") {
          if (errorDetails.isFatal) {
            this.isExplicitStop = true;
            this.isRunning = false;
          }
          this.currentCallbacks?.onError?.(errorDetails);
        }
      };

      recognition.onend = () => {
        // If recognition closed unexpectedly while we are still supposed to be listening:
        if (this.isRunning && !this.isExplicitStop) {
          // If we had buffered speech, commit it
          if (this.accumulatedFinalTranscript || this.lastInterimTranscript) {
            this.flushAndCommit();
            return;
          }

          // Otherwise automatically restart listening so the mic doesn't go dead
          this.restartTimeout = setTimeout(() => {
            if (this.isRunning && !this.isExplicitStop) {
              const CurrentClass = getSpeechRecognitionClass();
              if (CurrentClass) {
                this.initAndStart(CurrentClass);
              }
            }
          }, 200);
          return;
        }

        this.isRunning = false;
        this.currentCallbacks?.onEnd?.();
      };

      this.recognition = recognition;
      recognition.start();
    } catch (err: unknown) {
      this.isRunning = false;
      const msg = err instanceof Error ? err.message : String(err);
      this.currentCallbacks?.onError?.({
        code: "start-failed",
        message: `Failed to initiate microphone capture: ${msg}`,
        isFatal: true,
      });
    }
  }

  private flushAndCommit(): void {
    const fullText = [
      this.accumulatedFinalTranscript,
      this.lastInterimTranscript,
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

    this.accumulatedFinalTranscript = "";
    this.lastInterimTranscript = "";
    this.clearTimers();

    if (fullText) {
      this.currentCallbacks?.onResult?.(fullText, true);
    }
  }

  private clearTimers(): void {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }
  }

  public stop(): void {
    this.isExplicitStop = true;
    this.clearTimers();
    this.flushAndCommit();

    if (this.recognition && this.isRunning) {
      try {
        this.recognition.stop();
      } catch {
        // ignore
      }
    }
    this.isRunning = false;
  }

  public abort(): void {
    this.isExplicitStop = true;
    this.clearTimers();
    this.accumulatedFinalTranscript = "";
    this.lastInterimTranscript = "";

    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch {
        // ignore
      }
    }
    this.isRunning = false;
    this.currentCallbacks = null;
  }

  private formatError(errorCode: string): SpeechRecognitionErrorDetails {
    switch (errorCode) {
      case "not-allowed":
      case "service-not-allowed":
        return {
          code: "permission-denied",
          message:
            "Microphone permission was denied. Please grant microphone access in your browser settings or URL bar to talk with the receptionist.",
          isFatal: true,
        };
      case "no-speech":
        return {
          code: "no-speech",
          message:
            "No voice input was detected. Please verify your microphone and speak clearly.",
          isFatal: false,
        };
      case "audio-capture":
        return {
          code: "audio-capture",
          message:
            "No functional microphone was detected on your device. Please ensure a microphone is connected.",
          isFatal: true,
        };
      case "network":
        return {
          code: "network",
          message:
            "Network connectivity issue with the browser speech recognition service.",
          isFatal: false,
        };
      case "language-not-supported":
        return {
          code: "language-not-supported",
          message: `The selected language (${this.language}) is not supported by your browser's speech recognition engine.`,
          isFatal: true,
        };
      default:
        return {
          code: errorCode,
          message: `Speech recognition encountered an issue: ${errorCode}`,
          isFatal: false,
        };
    }
  }
}
