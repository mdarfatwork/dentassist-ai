import {
  type BookingState,
  type ReceptionistToolCall,
  type SourceCitation,
  type ReceptionistTelemetry,
} from "@/lib/receptionist/types";

export type VoiceState =
  | "idle"
  | "requesting_permission"
  | "listening"
  | "processing"
  | "speaking"
  | "error"
  | "ended";

export type MicrophonePermissionState =
  "checking" | "granted" | "prompt" | "denied" | "unsupported";

export interface SpeechRecognitionErrorDetails {
  code: string;
  message: string;
  isFatal: boolean;
}

export interface SpeechToTextCallbacks {
  onStart?: () => void;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: SpeechRecognitionErrorDetails) => void;
  onEnd?: () => void;
}

export interface SpeechToTextAdapter {
  isSupported(): boolean;
  start(callbacks: SpeechToTextCallbacks): void;
  stop(): void;
  abort(): void;
  setLanguage(lang: string): void;
  getLanguage(): string;
}

export interface SpeakOptions {
  voice?: SpeechSynthesisVoice;
  rate?: number;
  pitch?: number;
  language?: string;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: Error) => void;
}

export interface TextToSpeechAdapter {
  isSupported(): boolean;
  speak(text: string, options?: SpeakOptions): Promise<void>;
  stop(): void;
  pause(): void;
  resume(): void;
  getVoices(): SpeechSynthesisVoice[];
}

export interface VoiceTurnInput {
  conversationId?: string;
  transcript: string;
  language?: string;
}

export interface VoiceTurnResponse {
  conversationId: string;
  responseText: string;
  bookingState?: BookingState;
  toolCalls?: ReceptionistToolCall[];
  sources?: SourceCitation[];
  telemetry?: ReceptionistTelemetry;
  isSecurityFlagged?: boolean;
  securityNotice?: string;
}

export interface VoiceMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isSpoken?: boolean;
}
