"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc/client";
import { useSpeechRecognition } from "./use-speech-recognition";
import { useSpeechSynthesis } from "./use-speech-synthesis";
import { useMicrophonePermission } from "./use-microphone-permission";
import {
  type VoiceState,
  type VoiceMessage,
  type VoiceTurnResponse,
} from "@/lib/voice/types";
import { type BookingState } from "@/lib/receptionist/types";

interface UseVoiceConversationOptions {
  initialConversationId?: string;
  autoListenAfterSpeech?: boolean;
  onTurnComplete?: (response: VoiceTurnResponse) => void;
}

export function useVoiceConversation(
  options: UseVoiceConversationOptions = {},
) {
  const {
    initialConversationId,
    autoListenAfterSpeech = true,
    onTurnComplete,
  } = options;

  const [state, setState] = useState<VoiceState>("idle");
  const [conversationId, setConversationId] = useState<string | undefined>(
    initialConversationId,
  );
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [bookingState, setBookingState] = useState<BookingState>({});
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [isAutoListen, setIsAutoListen] = useState<boolean>(
    autoListenAfterSpeech,
  );

  const {
    permissionState: microphonePermissionState,
    isInsecureOrigin,
    permissionError: micPermissionError,
    requestPermission: requestMicrophonePermission,
  } = useMicrophonePermission();

  // Guards against stale responses and duplicate submissions
  const activeSessionRef = useRef<number>(0);
  const turnCounterRef = useRef<number>(0);
  const isTurnInFlightRef = useRef<boolean>(false);
  const lastProcessedTranscriptRef = useRef<string>("");

  const voiceTurnMutation = trpc.receptionist.voiceTurn.useMutation();

  const speechRecognition = useSpeechRecognition({
    initialLanguage: "en-US",
    onError: (err) => {
      if (
        err.isFatal ||
        err.code === "permission-denied" ||
        err.code === "insecure-origin" ||
        err.code === "not-supported"
      ) {
        setState("error");
        setErrorNotice(err.message);
      }
    },
  });

  const speechSynthesis = useSpeechSynthesis();

  const speechRecognitionRef = useRef(speechRecognition);
  const speechSynthesisRef = useRef(speechSynthesis);
  const processTranscriptRef = useRef<((raw: string) => Promise<void>) | null>(
    null,
  );

  // Synchronize latest instances to refs for asynchronous callbacks
  useEffect(() => {
    speechRecognitionRef.current = speechRecognition;
    speechSynthesisRef.current = speechSynthesis;
  }, [speechRecognition, speechSynthesis]);

  // Handle explicit session cleanup
  const endSession = useCallback(() => {
    activeSessionRef.current += 1;
    isTurnInFlightRef.current = false;
    speechRecognition.abortListening();
    speechSynthesis.stop();
    setState("ended");
    setErrorNotice(null);
  }, [speechRecognition, speechSynthesis]);

  // Handle cleanup on unmount
  useEffect(() => {
    return () => {
      activeSessionRef.current += 1;
      speechRecognitionRef.current.abortListening();
      speechSynthesisRef.current.stop();
    };
  }, []);

  // Process a finalized transcript through the AI Core
  const processTranscript = useCallback(
    async (rawTranscript: string) => {
      const trimmed = rawTranscript.trim();
      if (!trimmed) return;

      // Duplicate turn and concurrency protection
      if (isTurnInFlightRef.current) return;
      if (
        trimmed === lastProcessedTranscriptRef.current &&
        state === "processing"
      ) {
        return;
      }

      const currentSessionId = activeSessionRef.current;
      turnCounterRef.current += 1;

      isTurnInFlightRef.current = true;
      lastProcessedTranscriptRef.current = trimmed;
      setState("processing");
      setErrorNotice(null);

      // Add user message to transcript thread
      const userMessage: VoiceMessage = {
        id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        role: "user",
        content: trimmed,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);

      try {
        const response = await voiceTurnMutation.mutateAsync({
          conversationId,
          transcript: trimmed,
          language: speechRecognition.language,
        });

        // Guard against stale response if session ended while in-flight
        if (activeSessionRef.current !== currentSessionId) {
          isTurnInFlightRef.current = false;
          return;
        }

        if (response.conversationId) {
          setConversationId(response.conversationId);
        }
        if (response.bookingState) {
          setBookingState(response.bookingState);
        }

        const assistantMessage: VoiceMessage = {
          id: `asst_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          role: "assistant",
          content: response.responseText,
          timestamp: new Date(),
          isSpoken: true,
          traceId: response.traceId,
          turnId: response.turnId,
        };
        setMessages((prev) => [...prev, assistantMessage]);

        onTurnComplete?.(response);

        // Transition to speaking state and read response aloud
        setState("speaking");
        isTurnInFlightRef.current = false;

        await speechSynthesis.speak(response.responseText, {
          onEnd: () => {
            // Check session validity again
            if (activeSessionRef.current !== currentSessionId) return;

            // If auto-listen is active and session is ongoing, start listening for the next turn
            if (isAutoListen && state !== "ended") {
              setState("listening");
              speechRecognition.startListening((nextTranscript) => {
                void processTranscriptRef.current?.(nextTranscript);
              });
            } else {
              setState("idle");
            }
          },
          onError: () => {
            if (activeSessionRef.current !== currentSessionId) return;
            setState("idle");
          },
        });
      } catch (err: unknown) {
        if (activeSessionRef.current !== currentSessionId) {
          isTurnInFlightRef.current = false;
          return;
        }

        isTurnInFlightRef.current = false;
        const msg =
          err instanceof Error
            ? err.message
            : "Failed to communicate with AI Receptionist";
        setErrorNotice(msg);
        setState("error");
      }
    },
    [
      conversationId,
      speechRecognition,
      speechSynthesis,
      voiceTurnMutation,
      isAutoListen,
      onTurnComplete,
      state,
    ],
  );

  useEffect(() => {
    processTranscriptRef.current = processTranscript;
  }, [processTranscript]);

  // Start Voice Session
  const startSession = useCallback(async () => {
    activeSessionRef.current += 1;
    const currentSessionId = activeSessionRef.current;
    setErrorNotice(null);
    lastProcessedTranscriptRef.current = "";

    if (!speechRecognition.isSupported) {
      setErrorNotice(
        "Voice recognition is not supported in this browser. Please use Chrome, Edge, or Safari, or use text chat.",
      );
      setState("error");
      return;
    }

    if (isInsecureOrigin) {
      setErrorNotice(
        "Microphone access is blocked on insecure origins (HTTP). Please access via http://localhost:3000 or HTTPS, or enable Chrome's insecure origin flag for this IP.",
      );
      setState("error");
      return;
    }

    setState("requesting_permission");

    // Request / verify microphone permission
    const granted = await requestMicrophonePermission();
    if (!granted) {
      setState("error");
      setErrorNotice(
        micPermissionError ||
          "Microphone permission was denied. Please allow microphone access in your browser settings to talk with the receptionist.",
      );
      return;
    }

    if (activeSessionRef.current !== currentSessionId) return;

    setState("listening");

    speechRecognition.startListening((finalTranscript) => {
      if (activeSessionRef.current === currentSessionId) {
        void processTranscriptRef.current?.(finalTranscript);
      }
    });
  }, [
    speechRecognition,
    isInsecureOrigin,
    requestMicrophonePermission,
    micPermissionError,
  ]);

  // Interrupt assistant speech playback
  const interruptPlayback = useCallback(() => {
    speechSynthesis.stop();
    setErrorNotice(null);

    // After interrupting, immediately open the microphone so patient can speak
    setState("listening");
    speechRecognition.startListening((finalTranscript) => {
      void processTranscriptRef.current?.(finalTranscript);
    });
  }, [speechSynthesis, speechRecognition]);

  // Manually stop listening and process whatever transcript is present
  const stopListeningAndSend = useCallback(() => {
    speechRecognition.stopListening();
    const currentText =
      speechRecognition.transcript || speechRecognition.interimTranscript;
    if (currentText.trim()) {
      void processTranscript(currentText.trim());
    } else {
      setState("idle");
    }
  }, [speechRecognition, processTranscript]);

  // Retry previous turn or restart listening
  const retry = useCallback(() => {
    setErrorNotice(null);
    void startSession();
  }, [startSession]);

  // Send a text fallback message through the same conversation engine
  const sendTextMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isTurnInFlightRef.current) return;
      speechRecognition.abortListening();
      speechSynthesis.stop();
      await processTranscript(text.trim());
    },
    [speechRecognition, speechSynthesis, processTranscript],
  );

  return {
    state,
    conversationId,
    messages,
    bookingState,
    errorNotice,
    isAutoListen,
    setIsAutoListen,
    isSupported: speechRecognition.isSupported && speechSynthesis.isSupported,
    isListening: speechRecognition.isListening,
    isSpeaking: speechSynthesis.isSpeaking,
    interimTranscript: speechRecognition.interimTranscript,
    finalTranscript: speechRecognition.transcript,
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
    speechSynthesis,
  };
}
